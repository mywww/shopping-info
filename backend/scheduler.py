from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime
import pytz
from crawler.douban import fetch_recent_posts
from matcher import get_user_requirements, get_user_push_config, match_keyword, check_duplicate, save_push_record
from notifier import send_feishu_message, format_merged_message
from database import get_client
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(timezone=pytz.timezone("Asia/Shanghai"))


def log_crawl(task_type: str, user_id: str, status: str, posts_fetched: int = 0, posts_matched: int = 0, error_message: str = None):
    client = get_client()
    client.table("crawl_logs").insert({
        "task_type": task_type,
        "trigger_user_id": user_id,
        "status": status,
        "posts_fetched": posts_fetched,
        "posts_matched": posts_matched,
        "error_message": error_message
    }).execute()


def process_user_requirements(user_id: str, requirement_type: str):
    posts = fetch_recent_posts(hours=24)
    requirements = get_user_requirements(user_id)
    
    filtered = [r for r in requirements if r.get("urgency_type") == requirement_type]
    
    push_config = get_user_push_config(user_id)
    if not push_config:
        return
    
    webhook_url = push_config.get("webhook_url")
    merge_enabled = push_config.get("merge_enabled", True)
    
    for req in filtered:
        req_id = req.get("id")
        keyword = req.get("keyword")
        
        matched = match_keyword(keyword, posts)
        new_matches = []
        
        for post in matched:
            if not check_duplicate(user_id, req_id, post.get("post_id")):
                save_push_record(user_id, req_id, post.get("post_id"), post.get("title"), post.get("url"))
                new_matches.append(post)
        
        if new_matches:
            if merge_enabled:
                message = format_merged_message(keyword, req.get("urgency_type"), new_matches)
                send_feishu_message(webhook_url, message)
            else:
                for post in new_matches:
                    message = format_merged_message(keyword, req.get("urgency_type"), [post])
                    send_feishu_message(webhook_url, message)


def crawl_urgent():
    client = get_client()
    result = client.table("push_configs").select("user_id").execute()
    
    for config in result.data:
        try:
            process_user_requirements(config["user_id"], "urgent")
            log_crawl("scheduled_urgent", config["user_id"], "success", posts_fetched=0, posts_matched=0)
        except Exception as e:
            logger.error(f"Error processing urgent requirements for user {config['user_id']}: {e}")
            log_crawl("scheduled_urgent", config["user_id"], "failed", error_message=str(e))


def crawl_non_urgent():
    client = get_client()
    result = client.table("push_configs").select("user_id").execute()
    
    for config in result.data:
        try:
            process_user_requirements(config["user_id"], "non_urgent")
            log_crawl("scheduled_non_urgent", config["user_id"], "success", posts_fetched=0, posts_matched=0)
        except Exception as e:
            logger.error(f"Error processing non-urgent requirements for user {config['user_id']}: {e}")
            log_crawl("scheduled_non_urgent", config["user_id"], "failed", error_message=str(e))


def start_scheduler():
    scheduler.add_job(crawl_urgent, IntervalTrigger(hours=4), id="urgent_crawler", replace_existing=True)
    scheduler.add_job(crawl_non_urgent, CronTrigger(hour=18, minute=0, day_of_week="fri"), id="non_urgent_crawler", replace_existing=True)
    scheduler.start()
    logger.info("Scheduler started")


def stop_scheduler():
    scheduler.shutdown()