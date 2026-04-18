from typing import Optional
from database import get_client


def check_duplicate(user_id: str, requirement_id: int, post_id: str) -> bool:
    client = get_client()
    result = client.table("push_records").select("id").eq("user_id", user_id).eq("requirement_id", requirement_id).eq("post_id", post_id).execute()
    return len(result.data) > 0


def save_push_record(user_id: str, requirement_id: int, post_id: str, post_title: str, post_url: str, source: str = "douban") -> bool:
    client = get_client()
    try:
        client.table("push_records").insert({
            "user_id": user_id,
            "requirement_id": requirement_id,
            "post_id": post_id,
            "post_title": post_title,
            "post_url": post_url,
            "source": source
        }).execute()
        return True
    except Exception:
        return False


def match_keyword(keyword: str, posts: list) -> list:
    keyword_lower = keyword.lower()
    matched = []
    for post in posts:
        if keyword_lower in post.get("title", "").lower():
            matched.append(post)
    return matched


def get_user_requirements(user_id: str) -> list:
    client = get_client()
    result = client.table("requirements").select("*").eq("user_id", user_id).eq("is_active", True).execute()
    return result.data if result.data else []


def get_user_push_config(user_id: str) -> Optional[dict]:
    client = get_client()
    result = client.table("push_configs").select("*").eq("user_id", user_id).execute()
    if result.data:
        return result.data[0]
    return None