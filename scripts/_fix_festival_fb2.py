"""
針對剩餘 8 個音樂祭，嘗試更多 Facebook/官網 URL 變體
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
            html = r.read().decode("utf-8", errors="ignore")
            return html
    except Exception as e:
        return ""

def og_image(url):
    html = fetch(url)
    if not html: return None
    # Try both orderings of og:image attributes
    m = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', html)
    if not m:
        m = re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']', html)
    if m:
        img = m.group(1)
        if not any(k in img.lower() for k in ("icon","logo","blank","placeholder","default.png","no-image")):
            return img
    return None

def supa_req(path, method="GET", data=None):
    h = {"apikey": svc, "Authorization": f"Bearer {svc}"}
    if data: h["Content-Type"] = "application/json"
    req = urllib.request.Request(base_url + path, data=data, method=method, headers=h)
    with urllib.request.urlopen(req, context=ctx, timeout=20) as r:
        body = r.read()
        return json.loads(body) if body else []

# 嘗試更多 URL 變體
festival_urls = {
    "貴人散步音樂節": [
        "https://www.facebook.com/GoodNeighborsFestival.tw",
        "https://www.facebook.com/goodneighbors.festival",
        "https://www.facebook.com/GNF.tw",
        "https://www.facebook.com/GoodNeighborFestival",
        "https://www.facebook.com/GoodNeighborMusicFestival",
    ],
    "浪人祭": [
        "https://www.facebook.com/LanRenJiTe",
        "https://www.facebook.com/lanrenjite.festival",
        "https://www.facebook.com/lanren.festival",
        "https://www.facebook.com/WandererFestival.tw",
    ],
    "月光·海音樂會": [
        "https://www.facebook.com/MoonSeaConcert",
        "https://www.facebook.com/moonsea.concert",
        "https://www.facebook.com/moonandsea.concert",
        "https://www.facebook.com/TWMOONSEA",
    ],
    "覺醒音樂節": [
        "https://www.facebook.com/AwakenMusicFestival",
        "https://www.facebook.com/awakening.festival",
        "https://www.facebook.com/awakenfest.tw",
        "https://www.facebook.com/jue.xing.yinyue",
    ],
    "有機體音樂節": [
        "https://www.facebook.com/OrganicFestival.tw",
        "https://www.facebook.com/organic.festival.tw",
        "https://www.facebook.com/youjiti.festival",
    ],
    "Smoke Machine Taipei": [
        "https://www.facebook.com/smoke.machine.taipei",
        "https://www.facebook.com/SmokeMachineTW",
        "https://www.facebook.com/smokemachine.tw",
        "https://www.facebook.com/SmokeMachineClub",
    ],
    "島嶼音樂節": [
        "https://www.facebook.com/IslandFestivalTaiwan",
        "https://www.facebook.com/island.music.festival.tw",
        "https://www.facebook.com/islandfest.tw",
        "https://www.facebook.com/daoyumusic",
    ],
    "打狗祭": [
        "https://www.facebook.com/DaGouFestival",
        "https://www.facebook.com/dagou.kaohsiung",
        "https://www.facebook.com/dagou.music.festival",
        "https://www.facebook.com/dagouji",
    ],
}

no_imgs = supa_req("/rest/v1/concerts?select=id,artist,image_url&limit=300")
no_imgs = [r for r in no_imgs if not r.get("image_url")]
no_map = {r["artist"]: r["id"] for r in no_imgs}

print(f"缺圖 {len(no_imgs)} 筆，嘗試更多 FB URL 變體...\n")
updated = 0
for artist, urls in festival_urls.items():
    if artist not in no_map: continue
    found = None
    for url in urls:
        time.sleep(1.2)
        img = og_image(url)
        if img:
            found = img
            print(f"  ✓ {artist:28s} ({url})\n    → {img[:60]}")
            break
        else:
            print(f"    ✗ {url}")
    if found:
        body = json.dumps({"image_url": found}).encode()
        supa_req(f"/rest/v1/concerts?id=eq.{no_map[artist]}", method="PATCH", data=body)
        updated += 1
    print()

print(f"✓ 新增 {updated} 筆圖片")
still = [r for r in supa_req("/rest/v1/concerts?select=id,artist,image_url&limit=300")
         if not r.get("image_url")]
print(f"仍缺圖: {len(still)} 筆")
for r in still: print(f"  - {r['artist']}")
