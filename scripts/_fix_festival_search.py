"""
用 DDG/Google 搜尋找出正確的 Facebook 粉絲頁 URL，再用 facebookexternalhit UA 抓 og:image
"""
import json, ssl, urllib.request, urllib.parse, re, time

env = open(".env.local").read()
svc = re.search(r"SUPABASE_SERVICE_ROLE_KEY=(.+)", env).group(1).strip()
base_url = re.search(r"NEXT_PUBLIC_SUPABASE_URL=(.+)", env).group(1).strip()
ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE

FB_HEADERS = {
    "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
    "Accept-Language": "zh-TW,zh;q=0.9",
}
BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36",
    "Accept-Language": "zh-TW,zh;q=0.9",
}

def fetch(url, headers=BROWSER_HEADERS, timeout=15):
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, context=ctx, timeout=timeout) as r:
            return r.read().decode("utf-8", errors="ignore")
    except:
        return ""

def og_image(url):
    html = fetch(url, headers=FB_HEADERS)
    if not html: return None
    m = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', html)
    if not m:
        m = re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']', html)
    if m:
        img = m.group(1)
        if not any(k in img.lower() for k in ("icon","logo","blank","placeholder","default.png","no-image","null")):
            return img
    return None

def find_fb_page(festival_name):
    """用 DDG 搜尋找 Facebook 粉絲頁"""
    q = urllib.parse.quote(f"{festival_name} site:facebook.com")
    html = fetch(f"https://html.duckduckgo.com/html/?q={q}")
    if not html: return []
    # 從搜尋結果找 facebook.com 連結
    links = re.findall(r'href="(https?://(?:www\.)?facebook\.com/[^\?"&]+)["\?]', html)
    # 過濾掉不合適的 (events, posts, photos 等)
    valid = []
    for l in links:
        if not re.search(r'/(events?|posts?|photos?|videos?|groups?|login|signup|sharer)', l, re.I):
            if l not in valid:
                valid.append(l)
    return valid[:3]

def supa_req(path, method="GET", data=None):
    h = {"apikey": svc, "Authorization": f"Bearer {svc}"}
    if data: h["Content-Type"] = "application/json"
    req = urllib.request.Request(base_url + path, data=data, method=method, headers=h)
    with urllib.request.urlopen(req, context=ctx, timeout=20) as r:
        body = r.read()
        return json.loads(body) if body else []

remaining = ["貴人散步音樂節", "浪人祭", "月光·海音樂會", "有機體音樂節",
             "Smoke Machine Taipei", "島嶼音樂節", "打狗祭"]

no_imgs = supa_req("/rest/v1/concerts?select=id,artist,image_url&limit=300")
no_map = {r["artist"]: r["id"] for r in no_imgs if not r.get("image_url")}

print(f"缺圖 {len(no_map)} 筆，搜尋 FB 粉絲頁...\n")
updated = 0
for artist in remaining:
    if artist not in no_map: continue
    print(f"  搜尋: {artist}")
    time.sleep(2)
    fb_pages = find_fb_page(artist)
    if fb_pages:
        print(f"    找到 {len(fb_pages)} 個候選: {fb_pages}")
    else:
        print(f"    DDG 無結果")

    found = None
    for url in fb_pages:
        time.sleep(1.5)
        img = og_image(url)
        if img:
            found = img
            print(f"  ✓ → {url}\n    {img[:65]}")
            break
    
    if found:
        body = json.dumps({"image_url": found}).encode()
        supa_req(f"/rest/v1/concerts?id=eq.{no_map[artist]}", method="PATCH", data=body)
        updated += 1
    else:
        print(f"  ✗ {artist}: 仍無法取得圖片\n")

print(f"\n✓ 新增 {updated} 筆圖片")
still = [r for r in supa_req("/rest/v1/concerts?select=id,artist,image_url&limit=300")
         if not r.get("image_url")]
print(f"仍缺圖: {len(still)} 筆")
for r in still: print(f"  - {r['artist']}")
