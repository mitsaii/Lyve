"""
嘗試從 Facebook 粉絲頁抓取 og:image 封面圖
"""
import json, ssl, urllib.request, urllib.parse, re, time

env = open(".env.local").read()
svc = re.search(r"SUPABASE_SERVICE_ROLE_KEY=(.+)", env).group(1).strip()
base_url = re.search(r"NEXT_PUBLIC_SUPABASE_URL=(.+)", env).group(1).strip()
ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE

HEADERS = {
    "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
    "Accept-Language": "zh-TW,zh;q=0.9",
}

def fetch(url, timeout=15):
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, context=ctx, timeout=timeout) as r:
            return r.read().decode("utf-8", errors="ignore")
    except Exception as e:
        return ""

def og_image(url):
    html = fetch(url)
    if not html: return None
    m = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', html)
    if not m:
        m = re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']', html)
    return m.group(1) if m and not any(k in m.group(1).lower() for k in ("icon","logo","blank","placeholder")) else None

def supa_req(path, method="GET", data=None):
    h = {"apikey": svc, "Authorization": f"Bearer {svc}"}
    if data: h["Content-Type"] = "application/json"
    req = urllib.request.Request(base_url + path, data=data, method=method, headers=h)
    with urllib.request.urlopen(req, context=ctx, timeout=20) as r:
        body = r.read()
        return json.loads(body) if body else []

# Facebook / 官網備用 URL 對照表（嘗試多個來源）
festival_urls = {
    "春浪音樂節": [
        "https://www.facebook.com/SpringScream",
        "https://springscream.com",
    ],
    "簡單生活節": [
        "https://www.facebook.com/simplelifefestival",
        "https://simplelifefestival.com.tw",
        "https://www.simplelife.tw",
    ],
    "貴人散步音樂節": [
        "https://www.facebook.com/GoodNeighborsFestival",
        "https://www.facebook.com/goodneighborsfestival",
    ],
    "覺醒音樂節": [
        "https://www.facebook.com/AwakenFestival",
        "https://www.facebook.com/awakenfestival.tw",
    ],
    "浪人祭": [
        "https://www.facebook.com/lanjenjite",
        "https://www.facebook.com/lanrenfestival",
    ],
    "打狗祭": [
        "https://www.facebook.com/DagouFestival",
        "https://www.facebook.com/dagou.festival",
    ],
    "霓虹綠洲音樂祭": [
        "https://www.facebook.com/neonoasisfestival",
    ],
    "島嶼音樂節": [
        "https://www.facebook.com/islandfestivaltw",
    ],
    "有機體音樂節": [
        "https://www.facebook.com/OrganicFestivalTW",
    ],
    "Smoke Machine Taipei": [
        "https://www.facebook.com/smokemachinetaipei",
        "https://www.facebook.com/smokemachineclub",
    ],
    "So Wonderful Festival": [
        "https://www.facebook.com/SoWonderfulFestival",
    ],
    "月光·海音樂會": [
        "https://www.facebook.com/moonseafestival",
    ],
    "弦韻永恆系列-樂韻繚繞音樂會": [
        "https://www.facebook.com/NPACSymphony",
        "https://www.npac-ntt.org",
    ],
}

no_imgs = supa_req("/rest/v1/concerts?select=id,artist,image_url&limit=300")
no_imgs = [r for r in no_imgs if not r.get("image_url")]
no_map = {r["artist"]: r["id"] for r in no_imgs}

print(f"缺圖 {len(no_imgs)} 筆，嘗試 Facebook/官網 og:image...\n")
updated = 0
for artist, urls in festival_urls.items():
    if artist not in no_map: continue
    found = None
    for url in urls:
        time.sleep(1.5)
        img = og_image(url)
        if img:
            found = img
            print(f"  ✓ {artist:30s} ({url[:40]}) → {img[:45]}")
            break
        else:
            print(f"    試 {url[:50]}: 無圖")
    if found:
        body = json.dumps({"image_url": found}).encode()
        supa_req(f"/rest/v1/concerts?id=eq.{no_map[artist]}", method="PATCH", data=body)
        updated += 1
    else:
        print(f"  ✗ {artist}: 全部 URL 均無 og:image\n")

print(f"\n✓ 新增 {updated} 筆圖片")
still = [r for r in supa_req("/rest/v1/concerts?select=id,artist,image_url&limit=300")
         if not r.get("image_url")]
print(f"仍缺圖: {len(still)} 筆")
for r in still: print(f"  - {r['artist']}")
