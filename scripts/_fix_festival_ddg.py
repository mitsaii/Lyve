"""
針對剩餘 13 個本地音樂祭，用更精確的 DDG 圖片搜尋再試一次
"""
import json, ssl, urllib.request, urllib.parse, re, time

env = open(".env.local").read()
svc = re.search(r"SUPABASE_SERVICE_ROLE_KEY=(.+)", env).group(1).strip()
base_url = re.search(r"NEXT_PUBLIC_SUPABASE_URL=(.+)", env).group(1).strip()
ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    "Accept-Language": "zh-TW,zh;q=0.9",
}

bad_kw = ("icon", "ico/", "logo", "sprite", "favicon", "apple-touch",
          "dl_ios", "dl_android", "img/app/", "placeholder", "blank", "default",
          "noimage", "dummy", "avatar", "profile")

def fetch(url, timeout=12):
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, context=ctx, timeout=timeout) as r:
            return r.read().decode("utf-8", errors="ignore")
    except Exception as e:
        return ""

def ddg_image(query):
    q = urllib.parse.quote(query)
    html = fetch(f"https://duckduckgo.com/?q={q}&iax=images&ia=images")
    if not html: return None
    imgs = re.findall(r'"thumbnail":"(https?://[^"]+)"', html)
    imgs += re.findall(r'"image":"(https?://[^"]+\.(?:jpg|png|jpeg|webp)[^"]*)"', html)
    for url in imgs:
        if not any(k in url.lower() for k in bad_kw):
            if re.search(r'\.(jpg|jpeg|png|webp)', url, re.I):
                return url
    return None

def supa_req(path, method="GET", data=None):
    h = {"apikey": svc, "Authorization": f"Bearer {svc}"}
    if data: h["Content-Type"] = "application/json"
    req = urllib.request.Request(base_url + path, data=data, method=method, headers=h)
    with urllib.request.urlopen(req, context=ctx, timeout=20) as r:
        body = r.read()
        return json.loads(body) if body else []

# 每個音樂祭的精確搜尋關鍵字
festival_queries = {
    "貴人散步音樂節":         "貴人散步音樂節 2025 海報",
    "春浪音樂節":            "春浪音樂節 Spring Scream 2025 poster",
    "浪人祭":               "浪人祭音樂節 2025 海報",
    "月光·海音樂會":          "月光海音樂會 台灣 2025 poster",
    "覺醒音樂節":            "覺醒音樂節 Awakening Festival 2025",
    "簡單生活節":            "簡單生活節 Simple Life Festival 2025 poster",
    "有機體音樂節":           "有機體音樂節 Organic Festival 2025",
    "Smoke Machine Taipei":  "Smoke Machine Taipei 2025 festival poster",
    "島嶼音樂節":            "島嶼音樂節 Island Festival Taiwan 2025",
    "霓虹綠洲音樂祭":         "霓虹綠洲音樂祭 台灣 2025",
    "打狗祭":               "打狗祭音樂節 高雄 2025 海報",
    "So Wonderful Festival":  "So Wonderful Festival Taiwan 2025",
    "弦韻永恆系列-樂韻繚繞音樂會": "弦韻永恆 樂韻繚繞 音樂會 台灣",
}

no_imgs = supa_req("/rest/v1/concerts?select=id,artist,image_url&limit=300")
no_imgs = [r for r in no_imgs if not r.get("image_url")]
no_map = {r["artist"]: r["id"] for r in no_imgs}

print(f"缺圖 {len(no_imgs)} 筆，開始 DDG 精確搜尋...\n")
updated = 0
for artist, query in festival_queries.items():
    if artist not in no_map: continue
    time.sleep(2)
    img = ddg_image(query)
    if img:
        body = json.dumps({"image_url": img}).encode()
        supa_req(f"/rest/v1/concerts?id=eq.{no_map[artist]}", method="PATCH", data=body)
        print(f"  ✓ {artist:30s} → {img[:50]}")
        updated += 1
    else:
        print(f"  ✗ {artist}")

print(f"\n✓ 新增 {updated} 筆圖片")
still = [r for r in supa_req("/rest/v1/concerts?select=id,artist,image_url&limit=300")
         if not r.get("image_url")]
print(f"仍缺圖: {len(still)} 筆")
