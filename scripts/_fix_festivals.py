"""
清理 DB：
1. 刪除藝人名為「節目資訊」的髒資料
2. 嘗試從各音樂祭官網 og:image 爬取封面圖
"""
import json, ssl, urllib.request, urllib.parse, re, time

env = open(".env.local").read()
svc = re.search(r"SUPABASE_SERVICE_ROLE_KEY=(.+)", env).group(1).strip()
base_url = re.search(r"NEXT_PUBLIC_SUPABASE_URL=(.+)", env).group(1).strip()
ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE

HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122.0 Safari/537.36"}

def fetch(url):
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, context=ctx, timeout=15) as r:
            return r.read().decode("utf-8", errors="ignore")
    except:
        return ""

def supa_req(path, method="GET", data=None):
    h = {"apikey": svc, "Authorization": f"Bearer {svc}"}
    if data: h["Content-Type"] = "application/json"
    req = urllib.request.Request(base_url + path, data=data, method=method, headers=h)
    with urllib.request.urlopen(req, context=ctx, timeout=20) as r:
        body = r.read()
        return json.loads(body) if body else []

def og_image(url):
    html = fetch(url)
    if not html: return None
    m = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', html)
    if not m:
        m = re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']', html)
    return m.group(1) if m else None

# ── 1. 刪除「節目資訊」髒資料 ────────────────────────────────────────────────
rows = supa_req("/rest/v1/concerts?select=id,artist,image_url&limit=300")
bad_records = [r for r in rows if r["artist"] in ("節目資訊",)]
for r in bad_records:
    supa_req(f"/rest/v1/concerts?id=eq.{r['id']}", method="DELETE")
    print(f"  🗑 刪除髒資料: {r['artist']} (id={r['id'][:8]}...)")

# ── 2. 各音樂祭官網對應表 ───────────────────────────────────────────────────
festival_sites = {
    "貴人散步音樂節":     "https://www.goodneighborsfestival.com",
    "春浪音樂節":        "https://www.springscream.com",
    "浪人祭":           "https://www.lanjenjite.com",
    "月光·海音樂會":     "https://www.moonseafestival.com",
    "覺醒音樂節":        "https://www.awakenfestival.org",
    "簡單生活節":        "https://simplelifefestival.com.tw",
    "有機體音樂節":       "https://www.organicfestival.com.tw",
    "Smoke Machine Taipei": "https://www.smokemachine.com.tw",
    "島嶼音樂節":        "https://islandfestival.com.tw",
    "霓虹綠洲音樂祭":     "https://neonoasis.com.tw",
    "打狗祭":           "https://www.dagou.com.tw",
    "So Wonderful Festival": "https://www.sowonderfulfestival.com",
    "弦韻永恆系列-樂韻繚繞音樂會": None,
}

no_img_now = [r for r in supa_req("/rest/v1/concerts?select=id,artist,image_url&limit=300")
              if not r.get("image_url")]
no_img_map = {r["artist"]: r["id"] for r in no_img_now}

print(f"\n── 嘗試從音樂祭官網取圖片 ({len(no_img_now)} 筆缺圖)...")
updated = 0
for artist, site_url in festival_sites.items():
    if artist not in no_img_map:
        continue
    if not site_url:
        print(f"  – {artist}: 無官網")
        continue
    time.sleep(1)
    img = og_image(site_url)
    if img:
        record_id = no_img_map[artist]
        body = json.dumps({"image_url": img}).encode()
        supa_req(f"/rest/v1/concerts?id=eq.{record_id}", method="PATCH", data=body)
        print(f"  ✓ {artist:25s} → {img[:55]}")
        updated += 1
    else:
        print(f"  ✗ {artist}: 官網無 og:image")

print(f"\n✓ 新增 {updated} 筆圖片")
remaining = [r for r in supa_req("/rest/v1/concerts?select=id,artist,image_url&limit=300")
             if not r.get("image_url")]
print(f"仍缺圖: {len(remaining)} 筆")
for r in remaining:
    print(f"  - {r['artist']}")
