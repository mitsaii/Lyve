#!/usr/bin/env python3
"""診斷：找高流 kpmc 的 WordPress 自訂文章類型 API。"""
import urllib.request
import ssl, re, json

SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) "
                  "Chrome/124.0.0.0 Safari/537.36",
    "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
}

def fetch(url, accept="application/json"):
    h = dict(HEADERS)
    h["Accept"] = accept
    try:
        req = urllib.request.Request(url, headers=h)
        with urllib.request.urlopen(req, timeout=15, context=SSL_CTX) as r:
            body = r.read().decode("utf-8", errors="replace")
            return body, r.status
    except Exception as e:
        return None, str(e)

BASE = "https://kpmc.com.tw"

# 1. 查 WP REST API 根目錄，找所有路由
print("── Step 1: WP REST API routes")
body, status = fetch(f"{BASE}/wp-json/")
if body:
    data = json.loads(body)
    routes = list(data.get("routes", {}).keys())
    print(f"  共 {len(routes)} 個路由，以下為含 'program/event/show/concert/performance' 的路由：")
    for r in routes:
        if any(k in r.lower() for k in ["program", "event", "show", "concert", "performance", "activity"]):
            print(f"    {r}")
    print("\n  所有路由（前60個）：")
    for r in routes[:60]:
        print(f"    {r}")

# 2. 查 WP 文章類型
print("\n── Step 2: WP 文章類型 (post types)")
body, status = fetch(f"{BASE}/wp-json/wp/v2/types")
if body:
    try:
        types = json.loads(body)
        print(f"  找到 {len(types)} 種文章類型：")
        for slug, info in types.items():
            rest_base = info.get("rest_base", "")
            print(f"    slug={slug}, rest_base={rest_base}, name={info.get('name','')}")
    except:
        print(f"  解析失敗: {body[:200]}")

# 3. 試幾個常見的自訂文章類型端點
print("\n── Step 3: 常見自訂文章類型端點")
candidates = [
    "event", "events", "program", "programs",
    "show", "shows", "performance", "concert",
    "activity", "news",
]
for slug in candidates:
    url = f"{BASE}/wp-json/wp/v2/{slug}?per_page=5"
    body, status = fetch(url)
    if body and isinstance(status, int) and status == 200:
        try:
            data = json.loads(body)
            if isinstance(data, list) and len(data) > 0:
                print(f"  ✓ /{slug} → {len(data)} 筆")
                for item in data[:2]:
                    t = item.get("title", {})
                    title = t.get("rendered", "") if isinstance(t, dict) else str(t)
                    print(f"      title: {title[:60]}")
                    print(f"      link:  {item.get('link','')}")
                    print(f"      date:  {item.get('date','')}")
            else:
                print(f"  - /{slug} → 200 但空陣列或非陣列")
        except:
            print(f"  - /{slug} → 200 但非 JSON")
    else:
        print(f"  ✗ /{slug} → {status}")

# 4. 直接看 /program/ 頁面裡有沒有 JSON data
print("\n── Step 4: /program/ 頁面裡的 JSON 資料")
body, status = fetch(f"{BASE}/program/", accept="text/html")
if body:
    # 找 JSON 物件（可能是 Vue/Alpine.js 的 x-data 或 window.__data__）
    json_blocks = re.findall(r'(?:window\.__[A-Z_]+__|x-data|:data)\s*=\s*(\{[^<]{20,500}\})', body)
    print(f"  找到 {len(json_blocks)} 個 JSON 資料區塊：")
    for b in json_blocks[:3]:
        print(f"    {b[:200]}")

    # 找活動相關的連結（含年份的路徑）
    prog_links = re.findall(r'/program/([A-Za-z0-9_-]{5,})[/"\'<]', body)
    prog_links = list(dict.fromkeys(prog_links))
    print(f"\n  /program/ 頁面內的活動 slug（前20個）：")
    for s in prog_links[:20]:
        print(f"    /program/{s}")

    # 找任何含 2025/2026 的連結
    dated_links = re.findall(r'href=["\']([^"\']*202[56][^"\']*)["\']', body)
    dated_links = list(dict.fromkeys(dated_links))
    print(f"\n  含 2025/2026 的連結：")
    for l in dated_links[:10]:
        print(f"    {l}")
