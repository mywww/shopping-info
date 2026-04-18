from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import os
from dotenv import load_dotenv

from auth import get_password_hash, verify_password, create_access_token, decode_token, get_supabase
from models import (
    UserCreate, UserLogin, Token, RequirementCreate, RequirementUpdate, RequirementResponse,
    PushConfigCreate, PushConfigUpdate, PushConfigResponse, PushRecordResponse,
    CrawlLogResponse, SearchResult, FeishuTestRequest, FeishuTestResponse, SearchRequest
)
from database import get_client
from crawler.douban import fetch_recent_posts, search_posts
from matcher import match_keyword, get_user_requirements, get_user_push_config, check_duplicate
from notifier import send_feishu_message, format_merged_message, test_webhook
from scheduler import start_scheduler, stop_scheduler

load_dotenv()

app = FastAPI(title="Shopping Deal Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    token = credentials.credentials
    user_id = decode_token(token)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return user_id


@app.post("/auth/register", response_model=Token)
def register(user: UserCreate):
    client = get_supabase()
    
    try:
        response = client.auth.sign_up({"email": user.email, "password": user.password})
        print(f"Sign up response: {response}")
        if response.user is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Registration failed: {response}")
        
        user_id = response.user.id
        access_token = create_access_token({"sub": user_id})
        return {"access_token": access_token, "token_type": "bearer"}
    except Exception as e:
        print(f"Register error: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@app.post("/auth/login", response_model=Token)
def login(user: UserLogin):
    client = get_supabase()
    
    try:
        response = client.auth.sign_in_with_password({"email": user.email, "password": user.password})
        if response.user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        
        user_id = response.user.id
        access_token = create_access_token({"sub": user_id})
        return {"access_token": access_token, "token_type": "bearer"}
    except Exception as e:
        print(f"Login error: {e}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")


@app.get("/requirements", response_model=list[RequirementResponse])
def get_requirements(user_id: str = Depends(get_current_user)):
    client = get_client()
    result = client.table("requirements").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
    return result.data


@app.post("/requirements", response_model=RequirementResponse)
def create_requirement(req: RequirementCreate, user_id: str = Depends(get_current_user)):
    client = get_client()
    data = {"user_id": user_id, "keyword": req.keyword, "urgency_type": req.urgency_type, "is_active": req.is_active}
    result = client.table("requirements").insert(data).execute()
    return result.data[0]


@app.put("/requirements/{req_id}", response_model=RequirementResponse)
def update_requirement(req_id: int, req: RequirementUpdate, user_id: str = Depends(get_current_user)):
    client = get_client()
    update_data = {k: v for k, v in req.model_dump().items() if v is not None}
    result = client.table("requirements").update(update_data).eq("id", req_id).eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Requirement not found")
    return result.data[0]


@app.delete("/requirements/{req_id}")
def delete_requirement(req_id: int, user_id: str = Depends(get_current_user)):
    client = get_client()
    result = client.table("requirements").delete().eq("id", req_id).eq("user_id", user_id).execute()
    return {"message": "Deleted successfully"}


@app.get("/push-config", response_model=Optional[PushConfigResponse])
def get_push_config(user_id: str = Depends(get_current_user)):
    client = get_client()
    result = client.table("push_configs").select("*").eq("user_id", user_id).execute()
    return result.data[0] if result.data else None


@app.post("/push-config", response_model=PushConfigResponse)
def create_push_config(config: PushConfigCreate, user_id: str = Depends(get_current_user)):
    client = get_client()
    data = {"user_id": user_id, "webhook_url": config.webhook_url, "merge_enabled": config.merge_enabled}
    result = client.table("push_configs").insert(data).execute()
    return result.data[0]


@app.put("/push-config", response_model=PushConfigResponse)
def update_push_config(config: PushConfigUpdate, user_id: str = Depends(get_current_user)):
    client = get_client()
    update_data = {k: v for k, v in config.model_dump().items() if v is not None}
    update_data["updated_at"] = "now()"
    result = client.table("push_configs").update(update_data).eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Push config not found")
    return result.data[0]


@app.post("/push-config/test", response_model=FeishuTestResponse)
def test_feishu_webhook(req: FeishuTestRequest):
    success, message = test_webhook(req.webhook_url)
    return FeishuTestResponse(success=success, message=message)


@app.get("/push-records", response_model=list[PushRecordResponse])
def get_push_records(user_id: str = Depends(get_current_user)):
    client = get_client()
    result = client.table("push_records").select("*").eq("user_id", user_id).order("pushed_at", desc=True).execute()
    return result.data


@app.put("/push-records/{record_id}/read")
def mark_as_read(record_id: int, user_id: str = Depends(get_current_user)):
    client = get_client()
    result = client.table("push_records").update({"read_status": True}).eq("id", record_id).eq("user_id", user_id).execute()
    return {"message": "Marked as read"}


@app.get("/search", response_model=SearchResult)
def search(keyword: str, user_id: str = Depends(get_current_user)):
    posts = fetch_recent_posts(hours=24)
    matched = match_keyword(keyword, posts)
    return {"posts": matched}


@app.post("/crawl/manual")
def manual_crawl(req: SearchRequest, user_id: str = Depends(get_current_user)):
    posts = fetch_recent_posts(hours=24)
    matched = match_keyword(req.keyword, posts)
    
    client = get_client()
    client.table("crawl_logs").insert({
        "task_type": "manual",
        "trigger_user_id": user_id,
        "status": "success",
        "posts_fetched": len(posts),
        "posts_matched": len(matched)
    }).execute()
    
    return {"message": "Crawl completed", "matched_count": len(matched)}


@app.get("/crawl-logs", response_model=list[CrawlLogResponse])
def get_crawl_logs(user_id: str = Depends(get_current_user)):
    client = get_client()
    result = client.table("crawl_logs").select("*").eq("trigger_user_id", user_id).order("created_at", desc=True).limit(50).execute()
    return result.data


@app.on_event("startup")
def on_startup():
    start_scheduler()


@app.on_event("shutdown")
def on_shutdown():
    stop_scheduler()


@app.get("/health")
def health_check():
    return {"status": "ok"}