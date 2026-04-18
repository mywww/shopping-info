from typing import Optional
from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


class RequirementBase(BaseModel):
    keyword: str
    urgency_type: str = "urgent"
    is_active: bool = True


class RequirementCreate(RequirementBase):
    pass


class RequirementUpdate(BaseModel):
    keyword: Optional[str] = None
    urgency_type: Optional[str] = None
    is_active: Optional[bool] = None


class RequirementResponse(RequirementBase):
    id: int
    user_id: str
    created_at: str

    class Config:
        from_attributes = True


class PushConfigCreate(BaseModel):
    webhook_url: str
    merge_enabled: bool = True


class PushConfigUpdate(BaseModel):
    webhook_url: Optional[str] = None
    merge_enabled: Optional[bool] = None


class PushConfigResponse(BaseModel):
    id: int
    user_id: str
    webhook_url: str
    merge_enabled: bool
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class PushRecordResponse(BaseModel):
    id: int
    user_id: str
    requirement_id: int
    post_id: str
    source: str
    post_title: str
    post_url: str
    read_status: bool
    pushed_at: str

    class Config:
        from_attributes = True


class CrawlLogResponse(BaseModel):
    id: int
    task_type: Optional[str]
    trigger_user_id: Optional[str]
    status: Optional[str]
    posts_fetched: Optional[int]
    posts_matched: Optional[int]
    error_message: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


class SearchRequest(BaseModel):
    keyword: str


class SearchResult(BaseModel):
    posts: list


class FeishuTestRequest(BaseModel):
    webhook_url: str


class FeishuTestResponse(BaseModel):
    success: bool
    message: str