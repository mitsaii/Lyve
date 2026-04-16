"""
fill_missing_images.py
從 Tixcraft 和 ERAticket 爬取藝人圖片，
填補 Supabase concerts 表中缺少 image_url 的記錄。
"""
import json, ssl, urllib.request, urllib.parse, re, time

env = open(".env.local").read()
svc = re.search(r"SUPABASE_SERVICE_ROLE_KEY=(.+)", env).group(1).strip()
base_url = re.search(r"NEXT_PUBLIC_SUPABASE_URL=(.+)", env).group(1).strip()

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) "
                  "Chrome/122.0.0.0 Safari/537.36",
    "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
}

# ── helpers ──────────────────────────────────────────────────────────────────

def fetch_html(url, referer=None):
    h = dict(HEADERS)
    if referer:
        h["Referer"] = referer
    try:
        req = urllib.request.Request(url, headers=h)
        with urllib.request.urlopen(req, context=ctx, timeout=20) as r:
            return r.read().decode("utf-8", errors="ignore")
    except Exception as e:
        print(f"  ✗ fetch {url}: {e}")
        return ""

def supabase_get(path):
    req = urllib.request.Request(
        base_url + path,
        headers={"apikey": svc, "Authorization": f"Bearer {svc}"}
    )
    with urllib.request.urlopen(req, context=ctx, timeout=20) as r:
        return json.loads(r.read())

def supabase_patch(record_id, image_url):
    url = base_url + f"/rest/v1/concerts?id=eq.{record_id}"
    body = json.dumps({"image_url": image_url}).encode()
    req = urllib.request.Request(
        url, data=body, method="PATCH",
        headers={
            "apikey": svc, "Authorization": f"Bearer {svc}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        }
    )
    with urllib.request.urlopen(req, context=ctx, timeout=20):
        pass

def normalize_name(s):
    """小寫、去掉括號內容、去空白、去掉分隔符後半，方便比對。"""
    s = re.sub(r"[【\[（(][^】\]）)]*[】\]）)]", "", s)
    # Strip everything after separator (tour name part)
    for sep in ("：", ": ", " - ", " — ", "｜"):
        if sep in s:
            s = s.split(sep)[0]
    # Strip trailing concert keywords
    s = re.sub(r"(?:演唱會|巡演|世界巡迴|concert|tour|live|音樂節|祭|festival).*$",
               "", s, flags=re.IGNORECASE)
    return re.sub(r"\s+", "", s).strip().lower()


def best_match(artist: str, img_map: dict) -> str | None:
    """多層次模糊比對：精確 → 前綴 → 包含 → 首字比對"""
    key = normalize_name(artist)
    if not key:
        return None
    # 1. exact
    if key in img_map:
        return img_map[key]
    # 2. map key starts with artist key (e.g. "lany" matches "lany：softworldtour")
    for mk, mv in img_map.items():
        if mk.startswith(key) or key.startswith(mk):
            return mv
    # 3. one contains the other
    for mk, mv in img_map.items():
        if (len(key) >= 2 and key in mk) or (len(mk) >= 2 and mk in key):
            return mv
    return None

# ── Step 1: 爬 Tixcraft 建立 artist → image mapping ──────────────────────────

print("── 爬取 Tixcraft 圖片 ...")
html = fetch_html("https://tixcraft.com/activity/list")
tixcraft_map: dict[str, str] = {}  # normalized_artist → image_url

eventbl_starts = [m.start() for m in re.finditer(r'class="eventbl ', html)]
for i, cs in enumerate(eventbl_starts):
    end = eventbl_starts[i+1] if i+1 < len(eventbl_starts) else cs + 1800
    snippet = html[cs:min(end, cs+1800)]

    img_m = re.search(r'src="(https://static\.tixcraft\.com/images/activity/[^"]+)"', snippet)
    if not img_m:
        continue
    image_url = img_m.group(1)

    title_m = re.search(r'class="text-bold pt-1 pb-1"[^>]*>(.*?)</div>', snippet, re.DOTALL)
    if not title_m:
        continue
    raw_title = re.sub(r"<[^>]+>", "", title_m.group(1)).strip()

    # Artist = part before ："
    for sep in ("：", ":", " - "):
        if sep in raw_title:
            artist = raw_title.split(sep, 1)[0].strip()
            break
    else:
        artist = raw_title.strip()

    key = normalize_name(artist)
    if key and key not in tixcraft_map:
        tixcraft_map[key] = image_url

print(f"  Tixcraft 圖片: {len(tixcraft_map)} 組")

# ── Step 2: 爬 ERAticket 建立 artist → image mapping ─────────────────────────

print("── 爬取 ERAticket 圖片 ...")
era_map: dict[str, str] = {}

era_home = fetch_html("https://ticket.com.tw/")
prod_ids = list(dict.fromkeys(re.findall(r"PRODUCT_ID=([A-Z0-9]+)", era_home)))[:20]

for pid in prod_ids:
    time.sleep(1.2)
    pd_url = f"https://ticket.com.tw/application/UTK02/UTK0201_.aspx?PRODUCT_ID={pid}"
    pd_html = fetch_html(pd_url, referer="https://ticket.com.tw/")
    if not pd_html:
        continue

    title_m = re.search(r"<title[^>]*>(.*?)</title>", pd_html, re.DOTALL)
    if not title_m:
        continue
    raw = re.sub(r"<[^>]+>", "", title_m.group(1)).strip()
    raw = re.sub(r"^年代售票\s*[|｜]\s*", "", raw).strip()
    raw = re.sub(r"^\d{4}\s+", "", raw).strip()

    # artist = before first concert keyword
    am = re.match(r"^(.+?)\s+(?=.*(?:演唱會|巡演|Concert|Tour|LIVE|音樂會))", raw, re.IGNORECASE)
    artist = am.group(1).strip() if am else raw.split()[0] if raw else ""

    bad_kw = ("icon", "ico/", "logo", "sprite", "favicon", "apple-touch", "dl_ios", "dl_android", "img/app/")
    # Prefer og:image — the canonical concert poster
    og_m = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', pd_html)
    if not og_m:
        og_m = re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']', pd_html)
    if og_m and not any(b in og_m.group(1).lower() for b in bad_kw):
        poster = og_m.group(1)
    else:
        imgs = [
            u for u in re.findall(
                r'https://imgs2\.utiki\.com\.tw/[^"\s]+\.(?:jpg|png|webp)',
                pd_html
            )
            if not any(b in u.lower() for b in bad_kw)
        ]
        poster = imgs[0] if imgs else None
    if artist and poster:
        key = normalize_name(artist)
        if key not in era_map:
            era_map[key] = poster

print(f"  ERAticket 圖片: {len(era_map)} 組")

# Combined map
all_img_map = {**era_map, **tixcraft_map}  # tixcraft takes priority
print(f"  合計: {len(all_img_map)} 組藝人圖片")

# ── Step 3 helper: DuckDuckGo 圖片搜尋 ────────────────────────────────────────

def ddg_image(query: str) -> str | None:
    """從 DuckDuckGo HTML 結果頁裡抓第一張合適的圖片 URL。"""
    try:
        time.sleep(1.5)
        q = urllib.parse.quote_plus(query)
        url = f"https://duckduckgo.com/?q={q}&iax=images&ia=images"
        html = fetch_html(url)
        imgs = re.findall(
            r'"thumbnail":"(https://[^"]+\.(?:jpg|jpeg|png|webp)(?:\?[^"]*)?)"',
            html
        )
        # Filter out icons, logos, tiny images
        bad = ("icon", "logo", "favicon", "apple-touch", "sprite", "avatar")
        imgs = [i for i in imgs if not any(b in i.lower() for b in bad)]
        return imgs[0] if imgs else None
    except Exception:
        return None


def wiki_image(artist: str) -> str | None:
    """
    用 Wikipedia REST API 取藝人照片（免費，無需 API key）。
    先試中文 Wikipedia，再試英文。
    """
    for lang, query in [("zh", artist), ("en", artist)]:
        try:
            time.sleep(0.5)
            q = urllib.parse.quote(query)
            url = f"https://{lang}.wikipedia.org/api/rest_v1/page/summary/{q}"
            req = urllib.request.Request(url, headers={"User-Agent": "taiwan-concerts/1.0"})
            with urllib.request.urlopen(req, context=ctx, timeout=10) as r:
                data = json.loads(r.read())
            img = data.get("thumbnail", {}).get("source", "")
            if img and "logo" not in img.lower():
                return img
        except Exception:
            continue
    return None


# ── Step 3: 取得 DB 中缺圖的記錄並比對 ────────────────────────────────────────

print()
print("── 比對並更新 DB ...")
rows = supabase_get("/rest/v1/concerts?select=id,artist,image_url&limit=300")

# First, fix any bad images (apple-touch-icon etc.)
bad_kws = ("apple-touch", "favicon", "icon", "logo", "sprite")
bad_rows = [r for r in rows if r.get("image_url") and
            any(b in (r["image_url"] or "").lower() for b in bad_kws)]
for r in bad_rows:
    print(f"  ⚠ 修正錯誤圖片: {r['artist']}")
    supabase_patch(r["id"], None)  # reset to null

# Re-fetch after fix
rows = supabase_get("/rest/v1/concerts?select=id,artist,image_url&limit=300")
no_img = [r for r in rows if not r.get("image_url")]
print(f"  缺圖記錄: {len(no_img)}")

updated = 0
not_found = []
for r in no_img:
    artist = r["artist"]
    img = None

    # 1. Ticketing platform map (most accurate — event poster)
    img = best_match(artist, all_img_map)

    # 2. Wikipedia API (good for well-known artists)
    if not img:
        print(f"  … Wikipedia 搜尋: {artist}")
        img = wiki_image(artist)

    # 3. DuckDuckGo images (last resort)
    if not img:
        print(f"  … DDG 搜尋: {artist}")
        img = ddg_image(artist + " 演唱會 台灣")

    if img:
        supabase_patch(r["id"], img)
        print(f"  ✓ {artist:30s} → {img[:55]}")
        updated += 1
    else:
        not_found.append(artist)

print()
print(f"✓ 已更新 {updated} 筆圖片")
if not_found:
    print(f"  仍缺圖 ({len(not_found)} 筆):")
    for a in not_found:
        print(f"    - {a}")
