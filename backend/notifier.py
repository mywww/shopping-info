import requests
from typing import Optional


def send_feishu_message(webhook_url: str, message: str) -> bool:
    try:
        payload = {
            "msg_type": "text",
            "content": {
                "text": message
            }
        }
        response = requests.post(webhook_url, json=payload, timeout=10)
        return response.status_code == 200
    except Exception:
        return False


def format_merged_message(keyword: str, urgency_type: str, posts: list) -> str:
    prefix = "【急用】" if urgency_type == "urgent" else "【不急用】"
    lines = [f"{prefix}{keyword} 匹配到 {len(posts)} 条新优惠："]
    for i, post in enumerate(posts, 1):
        lines.append(f'{i}. [{post["title"]}]({post["url"]})')
    return "\n".join(lines)


def test_webhook(webhook_url: str) -> tuple[bool, str]:
    test_message = "购物优惠助手测试消息 - 配置成功！"
    success = send_feishu_message(webhook_url, test_message)
    if success:
        return True, "测试消息发送成功！"
    return False, "测试消息发送失败，请检查 Webhook 地址是否正确。"