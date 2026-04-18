import time
from datetime import datetime, timedelta

from curl_cffi import requests as curl_requests
from bs4 import BeautifulSoup


DOUBAN_GROUPS = [
    "https://www.douban.com/group/536786/",
    "https://www.douban.com/group/698716/",
]


def fetch_all_posts():
    results = []
    
    for group in DOUBAN_GROUPS:
        time.sleep(1)
        resp = curl_requests.get(group, 
                                  headers={"User-Agent": "Mozilla/5.0"}, 
                                  timeout=15, 
                                  impersonate="chrome110")
        
        if resp.status_code != 200:
            continue
            
        soup = BeautifulSoup(resp.text, "html.parser")
        table = soup.find("table", class_="olt")
        
        if not table:
            continue
            
        rows = table.find_all("tr")[1:]
        
        for row in rows:
            cols = row.find_all("td")
            if len(cols) < 4:
                continue
            
            link = cols[0].find("a")
            if not link:
                continue
            
            title = link.get_text(strip=True)
            url = link.get("href", "")
            time_str = cols[3].get_text(strip=True)
            
            if not url or not title:
                continue
            
            post_id = url.split("/topic/")[-1].strip("/") if "/topic/" in url else url.split("/")[-1].strip("/")
            
            results.append({
                "post_id": post_id,
                "title": title,
                "url": url,
                "time": time_str,
                "source": "douban"
            })
    
    return results


def fetch_recent_posts(hours=24):
    all_posts = fetch_all_posts()
    
    now = datetime.now()
    cutoff = now - timedelta(hours=hours)
    
    filtered = []
    for post in all_posts:
        time_str = post.get("time", "")
        post_time = None
        
        try:
            if "前" in time_str:
                post_time = now
            elif "今天" in time_str:
                post_time = datetime.strptime(f"{now.date()} {time_str.replace('今天','').strip()}", "%Y-%m-%d %H:%M")
            elif "昨天" in time_str:
                post_time = datetime.strptime(f"{(now - timedelta(days=1)).date()} {time_str.replace('昨天','').strip()}", "%Y-%m-%d %H:%M")
            else:
                for fmt in [f"{now.year}-%m-%d %H:%M", "%m-%d %H:%M"]:
                    try:
                        p = datetime.strptime(time_str, fmt)
                        if p.year == 1900:
                            p = p.replace(year=now.year)
                        post_time = p
                        break
                    except:
                        pass
        except:
            pass
        
        if post_time and post_time >= cutoff:
            post["time"] = post_time.isoformat()
            filtered.append(post)
        elif not time_str:
            filtered.append(post)
    
    return filtered


def search_posts(keyword):
    return fetch_recent_posts(hours=24)