#!/usr/bin/env python3
"""daily_concert_scraper.py — Taiwan Concert Daily Auto-Fetcher
============================================================
每日 00:00 由 macOS launchd 觸發，爬取最新台灣演唱會資訊並匯入 Supabase。

資料來源 (依優先順序):
  1. Tixcraft 拓元售票      — tixcraft.com/activity/list     ✅ 直接可爬
  2. UDN 售票網             — tickets.udnfunlife.com          ✅ 直接可爬
  3. 年代售票 ERAticket      — ticket.com.tw                   ✅ 直接可爬
  4. kpopn.com listing      — K-pop 演唱會最新消息
  5. livenation.com.tw      — Live Nation Taiwan 活動
  6. DuckDuckGo HTML lite   — 補充關鍵字搜尋

無法直接爬取（需瀏覽器 / API key）:
  ✗ KKTIX      — Cloudflare Bot 防護 (403)
  ✗ ibon       — 403 Forbidden
  ✗ Klook      — 403 Forbidden
  ✗ KKday      — 403 Forbidden
  ✗ OpenTix    — 404
  ✗ TicketPlus — 頁面內容由 JS 動態載入

Output:
  logs/daily_YYYYMMDD.log   — 執行日誌
  data/daily_YYYYMMDD.json  — 爬取結果 audit trail
  data/daily_YYYYMMDD.sql   — Supabase upsert SQL（供手動審核執行）
  Supabase REST API upsert  — 若 .env.local 含 SUPABASE_SERVICE_ROLE_KEY，自動寫入

設定方式（啟用自動寫入）:
  在 .env.local 加入:
    SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...  ← 來自 Supabase Dashboard → Settings → API
"""

from __future__ import annotations

import hashlib
import html as html_lib
import json
import os
import random
import re
import ssl
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime
from pathlib import Path
from typing import Any

# ── Paths ─────────────────────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
LOG_DIR = ROOT / "logs"
TODAY_STR = date.today().strftime("%Y%m%d")
ENV_FILE = ROOT / ".env.local"

DATA_DIR.mkdir(exist_ok=True)
LOG_DIR.mkdir(exist_ok=True)

_LOG_FILE = LOG_DIR / f"daily_{TODAY_STR}.log"

# ── SSL context (some TW sites have cert quirks) ───────────────────────────────
SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE

# ── HTTP headers pool ─────────────────────────────────────────────────────────
_UA_LIST = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 "
    "(KHTML, like Gecko) Version/17.4 Safari/605.1.15",
]

# ── Taiwan keywords ───────────────────────────────────────────────────────────
TW_KEYWORDS = [
    "台灣", "臺灣", "taiwan", "taipei", "台北", "高雄", "kaohsiung",
    "台中", "taichung", "林口", "linkou", "新北",
]
CONCERT_KEYWORDS = [
    "演唱會", "巡演", "巡迴", "開唱", "concert", "tour", "live", "show",
]

# ── Genre detection ───────────────────────────────────────────────────────────
_KPOP = {
    "blackpink", "bts", "twice", "exo", "nct", "stray kids", "ive", "aespa",
    "newjeans", "seventeen", "ateez", "monsta x", "got7", "infinite",
    "super junior", "shinee", "2pm", "btob", "bigbang", "winner", "ikon",
    "treasure", "boynextdoor", "tws", "kiss of life", "itzy", "nmixx",
    "le sserafim", "txt", "tomorrow x together", "enhypen", "day6", "2ne1",
    "red velvet", "g-dragon", "taemin", "2am", "nct wish", "nct 127",
    "nct dream", "g.e.m", "lany", "laufey",
}
_JPOP = {
    "one ok rock", "back number", "vaundy", "official hige dandism", "yoasobi",
    "king gnu", "radwimps", "man with a mission", "bump of chicken",
    "mrs. green apple", "sumika", "kenshi yonezu", "hikaru utada", "aimyon",
    "aimer", "yorushika", "zutomayo", "kirinji", "chilli beans",
    "sekai no owari",
}
_CPOP = {
    "林俊傑", "jj lin", "五月天", "mayday", "告五人", "茄子蛋", "動力火車",
    "張惠妹", "a-mei", "周杰倫", "jay chou", "蔡依林", "jolin tsai",
    "張學友", "jacky cheung", "王力宏", "leehom", "孫燕姿", "stefanie sun",
    "林宥嘉", "楊乃文", "陳奕迅", "eason chan", "草東沒有派對", "落日飛車",
    "leo王", "熊仔", "陳珊妮", "盧廣仲", "sodagreen", "蘇打綠",
    "傻子與白痴", "拍謝少年", "大象體操", "老王樂隊", "宇宙人",
}
_FESTIVAL_KW = {"音樂節", "音樂祭", "festival", "fest "}

# ── Known venue → (city_zh, city_en, venue_zh, venue_en) ──────────────────────
_VENUE_MAP: list[tuple[str, tuple[str, str, str, str]]] = [
    ("台北大巨蛋",    ("台北", "Taipei",     "台北大巨蛋",                            "Taipei Dome")),
    ("taipei dome",   ("台北", "Taipei",     "台北大巨蛋",                            "Taipei Dome")),
    ("台北小巨蛋",    ("台北", "Taipei",     "台北小巨蛋",                            "Taipei Arena")),
    ("taipei arena",  ("台北", "Taipei",     "台北小巨蛋",                            "Taipei Arena")),
    ("林口體育館",    ("台北", "Taipei",     "國立體育大學綜合體育館（林口體育館）",   "NTSU Arena (Linkou Arena)")),
    ("linkou arena",  ("台北", "Taipei",     "國立體育大學綜合體育館（林口體育館）",   "NTSU Arena (Linkou Arena)")),
    ("ntsu arena",    ("台北", "Taipei",     "國立體育大學綜合體育館（林口體育館）",   "NTSU Arena (Linkou Arena)")),
    ("國立體育大學",  ("台北", "Taipei",     "國立體育大學綜合體育館（林口體育館）",   "NTSU Arena (Linkou Arena)")),
    ("高雄巨蛋",      ("高雄", "Kaohsiung",  "高雄巨蛋",                              "Kaohsiung Arena")),
    ("kaohsiung arena",("高雄","Kaohsiung", "高雄巨蛋",                              "Kaohsiung Arena")),
    ("台中圓滿",      ("台中", "Taichung",   "台中圓滿戶外劇場",                      "Taichung Fulfillment Amphitheater")),
    ("台北流行音樂中心",("台北","Taipei",    "台北流行音樂中心",                      "Taipei Music Center")),
    ("高雄世運",      ("高雄", "Kaohsiung",  "高雄世運主場館",                        "National Stadium")),
    ("駁二",          ("高雄", "Kaohsiung",  "高雄駁二藝術特區",                      "Pier-2 Art Center Kaohsiung")),
    ("大佳河濱",      ("台北", "Taipei",     "大佳河濱公園",                          "Dajia Riverside Park")),
]

# ── Gradient CSS by genre ─────────────────────────────────────────────────────
_GRADS: dict[str, list[str]] = {
    "kpop":    [
        "linear-gradient(135deg, #ff6b9d 0%, #feca57 100%)",
        "linear-gradient(135deg, #ff6a88 0%, #6a11cb 100%)",
        "linear-gradient(135deg, #2b2d42 0%, #8d99ae 100%)",
        "linear-gradient(135deg, #1d2b64 0%, #f8cdda 100%)",
        "linear-gradient(135deg, #134e5e 0%, #71b280 100%)",
    ],
    "cpop":    [
        "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        "linear-gradient(135deg, #c79081 0%, #dfa579 100%)",
        "linear-gradient(135deg, #3a1c71 0%, #d76d77 100%)",
        "linear-gradient(135deg, #30cfd0 0%, #330867 100%)",
        "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    ],
    "rock":    [
        "linear-gradient(135deg, #1a1a1a 0%, #b91d1d 100%)",
        "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
        "linear-gradient(135deg, #373b44 0%, #4286f4 100%)",
    ],
    "jpop":    [
        "linear-gradient(135deg, #0f2027 0%, #2c5364 100%)",
        "linear-gradient(135deg, #232526 0%, #414345 100%)",
    ],
    "western": [
        "linear-gradient(135deg, #1f1c2c 0%, #928dab 100%)",
        "linear-gradient(135deg, #a8c0ff 0%, #3f2b96 100%)",
        "linear-gradient(135deg, #232526 0%, #414345 100%)",
    ],
    "festival":[
        "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
        "linear-gradient(135deg, #56ab2f 0%, #a8e063 100%)",
        "linear-gradient(135deg, #f12711 0%, #f5af19 100%)",
        "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
    ],
}
_EMOJIS = {
    "kpop": "✨", "cpop": "🎤", "rock": "🎸",
    "jpop": "🎶", "western": "🌙", "festival": "🎪",
}

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def log(msg: str) -> None:
    ts = datetime.now().strftime("%H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line)
    with _LOG_FILE.open("a", encoding="utf-8") as f:
        f.write(line + "\n")


def _headers() -> dict[str, str]:
    return {
        "User-Agent": random.choice(_UA_LIST),
        "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
        "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
    }


def fetch(url: str, timeout: int = 20, retries: int = 2, referer: str | None = None) -> str | None:
    for attempt in range(retries + 1):
        try:
            h = _headers()
            if referer:
                h["Referer"] = referer
            req = urllib.request.Request(url, headers=h)
            with urllib.request.urlopen(req, timeout=timeout, context=SSL_CTX) as r:
                return r.read().decode("utf-8", errors="ignore")
        except Exception as e:
            if attempt < retries:
                time.sleep(2 ** attempt)
            else:
                log(f"  ✗ fetch failed: {url[:80]} — {e}")
    return None


def strip_tags(html: str) -> str:
    return re.sub(r"<[^>]+>", " ", html_lib.unescape(html))


def clean(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def sql_val(v: str | None) -> str:
    if v is None:
        return "null"
    return "'" + v.replace("'", "''") + "'"


def grad_for(genre: str, seed: str) -> str:
    pool = _GRADS.get(genre, _GRADS["western"])
    idx = int(hashlib.md5(seed.encode()).hexdigest(), 16) % len(pool)
    return pool[idx]


def read_env() -> dict[str, str]:
    env: dict[str, str] = {}
    if not ENV_FILE.exists():
        return env
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            env[k.strip()] = v.strip()
    return env


# ─────────────────────────────────────────────────────────────────────────────
# Genre & venue classifiers
# ─────────────────────────────────────────────────────────────────────────────

def classify_genre(artist: str, text: str = "") -> str:
    combined = (artist + " " + text).lower()
    if any(k in combined for k in _FESTIVAL_KW):
        return "festival"
    if any(k in combined for k in _KPOP):
        return "kpop"
    if any(k in combined for k in _JPOP):
        return "jpop"
    if any(k in combined for k in _CPOP):
        return "cpop"
    # Heuristics: all-Chinese artist name → cpop; ends in common JP patterns → jpop
    if re.search(r"^[\u4e00-\u9fff]{2,5}$", artist):
        return "cpop"
    return "western"


def resolve_venue(raw_venue: str, raw_text: str = "") -> tuple[str, str, str, str]:
    """Returns (city_zh, city_en, venue_zh, venue_en)."""
    combined = (raw_venue + " " + raw_text).lower()
    for key, info in _VENUE_MAP:
        if key.lower() in combined:
            return info
    # Fallback: detect city from raw text
    if "高雄" in combined:
        return ("高雄", "Kaohsiung", raw_venue or "場地待公布", raw_venue or "Venue TBA")
    if "台中" in combined or "taichung" in combined:
        return ("台中", "Taichung", raw_venue or "場地待公布", raw_venue or "Venue TBA")
    if "台南" in combined or "tainan" in combined:
        return ("台南", "Tainan", raw_venue or "場地待公布", raw_venue or "Venue TBA")
    if "桃園" in combined or "taoyuan" in combined:
        return ("桃園", "Taoyuan", raw_venue or "場地待公布", raw_venue or "Venue TBA")
    if "新北" in combined or "new taipei" in combined:
        return ("新北", "New Taipei", raw_venue or "場地待公布", raw_venue or "Venue TBA")
    # Default: Taipei
    return ("台北", "Taipei", raw_venue or "場地待公布", raw_venue or "Venue TBA")


def parse_dates(text: str) -> list[str]:
    """Extract date strings in YYYY/MM/DD format from arbitrary text."""
    found: list[str] = []
    # 2026/03/21 or 2026/3/21
    for m in re.finditer(r"(20(?:25|26|27))[/\-年](\d{1,2})[/\-月](\d{1,2})(?:[日])?(?:[-–~到至](\d{1,2}))?", text):
        y, mo, d1, d2 = m.group(1), m.group(2), m.group(3), m.group(4)
        date_str = f"{y}/{mo.zfill(2)}/{d1.zfill(2)}"
        if d2:
            date_str += f"–{d2.zfill(2)}"
        found.append(date_str)
    return list(dict.fromkeys(found))  # deduplicate, preserve order


def is_future_date(date_str: str) -> bool:
    """Return True if the first date in the string is today or in the future."""
    m = re.search(r"(20\d{2})[/\-](\d{1,2})[/\-](\d{1,2})", date_str)
    if not m:
        return True  # unknown → include for safety
    try:
        ev = date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        return ev >= date.today()
    except ValueError:
        return True


# ─────────────────────────────────────────────────────────────────────────────
# Source 1: kpopn.com
# ─────────────────────────────────────────────────────────────────────────────

def scrape_kpopn(max_pages: int = 5) -> list[dict]:
    """
    掃描 kpopn.com 分類頁面，找出台灣演唱會相關文章，解析細節。
    回傳 list of raw concert dicts。
    """
    log("── [kpopn.com] 開始掃描...")
    article_urls: list[tuple[str, str]] = []  # (url, title)

    for page in range(1, max_pages + 1):
        url = f"https://www.kpopn.com/category/news/page/{page}/" if page > 1 \
              else "https://www.kpopn.com/category/news/"
        html = fetch(url)
        if not html:
            break
        # Find article links + titles
        for m in re.finditer(
            r'<a[^>]+href="(https://www\.kpopn\.com/\d{4}/\d{2}/[^"]+)"[^>]*>([^<]{5,120})</a>',
            html,
        ):
            link, title = m.group(1), clean(strip_tags(m.group(2)))
            title_lower = title.lower()
            # Only keep articles about Taiwan concerts
            has_tw = any(k in title_lower for k in TW_KEYWORDS)
            has_concert = any(k in title_lower for k in CONCERT_KEYWORDS)
            if has_tw and has_concert:
                article_urls.append((link, title))

        time.sleep(1.2)

    # Deduplicate
    seen: set[str] = set()
    unique: list[tuple[str, str]] = []
    for u, t in article_urls:
        if u not in seen:
            seen.add(u)
            unique.append((u, t))

    log(f"  → 找到 {len(unique)} 篇台灣演唱會文章")
    results: list[dict] = []
    for url, title in unique:
        time.sleep(1.5)
        parsed = _parse_kpopn_article(url, title)
        if parsed:
            results.append(parsed)

    return results


def _parse_kpopn_article(url: str, title: str) -> dict | None:
    html = fetch(url)
    if not html:
        return None

    text = clean(strip_tags(html))

    # Must be a Taiwan concert article
    has_tw = any(k in text.lower() for k in TW_KEYWORDS)
    has_concert = any(k in text.lower() for k in CONCERT_KEYWORDS)
    if not (has_tw and has_concert):
        return None

    # Extract artist from title (first segment before common separators)
    artist = _extract_artist_from_title(title)
    if not artist:
        return None

    dates = parse_dates(text)
    if not dates or not is_future_date(dates[0]):
        # No valid future date found — skip
        if not dates:
            return None
        if all(not is_future_date(d) for d in dates):
            return None

    # Use first future date
    date_str = next((d for d in dates if is_future_date(d)), dates[0])

    # Venues
    venues = re.findall(
        r"(?:台北|臺北|高雄|台中|林口|桃園|新北|台南)[^\s，,。、]{0,25}"
        r"(?:巨蛋|小巨蛋|大巨蛋|體育館|場館|Arena|arena|劇場|公園|藝術特區)",
        text,
    )
    raw_venue = venues[0] if venues else ""

    # Prices
    prices = re.findall(r"NT\$\s?[\d,]+(?:[^元\n]{0,30})?", text)
    price_str = prices[0].strip() if prices else "票價待公布"
    if len(price_str) > 40:
        price_str = price_str[:40].strip()

    # Tour name — look for patterns near the artist name
    tour_patterns = re.findall(
        r"(?:演唱會|巡演|巡迴|世界巡迴|亞洲巡演|TOUR|ASIA|WORLD)[^。，\n]{0,50}",
        text,
    )
    tour_zh = tour_patterns[0].strip() if tour_patterns else "演唱會"
    if len(tour_zh) > 60:
        tour_zh = tour_zh[:60].strip()

    # Image
    imgs = re.findall(r"https?://[^\"'>\s]+\.(?:jpg|jpeg|png|webp)", html)
    # Filter out tiny icons / logos
    image_url = next(
        (i for i in imgs if "kpopn.com/upload" in i or "ksd-i.com" in i), None
    )

    city_zh, city_en, venue_zh, venue_en = resolve_venue(raw_venue, text)
    genre = classify_genre(artist, text[:500])

    return {
        "artist":      artist,
        "date_str":    date_str,
        "city_zh":     city_zh,
        "city_en":     city_en,
        "venue_zh":    venue_zh,
        "venue_en":    venue_en,
        "tour_zh":     tour_zh,
        "tour_en":     tour_zh,  # will refine if English found
        "price_zh":    price_str,
        "price_en":    price_str if re.search(r"[a-zA-Z]", price_str) else "票價待公布",
        "platform":    "kpopn",
        "platform_url": url,
        "genre":       genre,
        "image_url":   image_url,
        "source":      "kpopn",
    }


def _extract_artist_from_title(title: str) -> str:
    # Common kpopn title patterns: "Artist名稱 台灣演唱會 ..."
    # Try splitting on spaces/separators, take the first meaningful segment
    title = re.sub(r"\s*[\|｜]\s*.*$", "", title)  # remove after pipe
    # Remove trailing: "台灣演唱會", "演唱會", "巡迴演唱會", "台北" etc.
    artist = re.split(r"\s+(?:台灣?|臺灣?|高雄|台中|林口|演唱會|巡演|巡迴|開唱|concert|tour)", title, flags=re.IGNORECASE)[0]
    artist = artist.strip(" -–—/\\")
    # Remove leading/trailing bracket content if long
    artist = re.sub(r"^\[.*?\]\s*", "", artist)
    artist = re.sub(r"^NEWS[:\s]+", "", artist, flags=re.IGNORECASE)
    return artist.strip() if len(artist) >= 2 else ""


# ─────────────────────────────────────────────────────────────────────────────
# Source 2: tixcraft.com — 拓元售票 ✅
# ─────────────────────────────────────────────────────────────────────────────

def scrape_tixcraft() -> list[dict]:
    """
    爬取 tixcraft.com/activity/list 全部演唱會活動。
    Tixcraft 的事件卡片結構（經實測確認）:
      <div class="eventbl col-*">          ← 每個活動的容器
        <img src="static.tixcraft.com/...">  ← 活動圖片
        <div class="text-small date">       ← 「2026/09/26 (六)」
        <div class="text-bold pt-1 pb-1">  ← 活動標題：「LANY：soft world tour」
        <div class="text-small text-med-light"> ← 場地：「台北小巨蛋」
        <a href="/activity/detail/26_lany"> ← 活動頁面連結
    """
    log("── [Tixcraft 拓元] 開始掃描...")
    results: list[dict] = []

    html = fetch("https://tixcraft.com/activity/list")
    if not html:
        log("  ✗ tixcraft 無法取得")
        return results

    # Each event card is wrapped in <div class="eventbl ...">
    # Structure: [image col w/ link] → [info col: date / title(a) / venue] → [button col]
    # Split the page on "eventbl" div boundaries for clean parsing.
    eventbl_starts = [m.start() for m in re.finditer(r'class="eventbl ', html)]

    seen_links: set[str] = set()
    for i, card_start in enumerate(eventbl_starts):
        end = eventbl_starts[i + 1] if i + 1 < len(eventbl_starts) else card_start + 1800
        snippet = html[card_start:min(end, card_start + 1800)]

        # Link (first occurrence is in the image anchor)
        link_m = re.search(r'href="(/activity/detail/[^"]+)"', snippet)
        if not link_m:
            continue
        link_path = link_m.group(1)
        if link_path in seen_links:
            continue
        seen_links.add(link_path)

        # Date: class="text-small date"
        date_m = re.search(r'class="text-small date"[^>]*>\s*([^<]+)', snippet)
        raw_date = date_m.group(1).strip() if date_m else ""
        dates = parse_dates(raw_date) or parse_dates(strip_tags(snippet))
        if not dates:
            continue
        date_str = next((d for d in dates if is_future_date(d)), None)
        if not date_str:
            continue

        # Title: class="text-bold pt-1 pb-1" — inner <a> tag, so strip_tags needed
        title_m = re.search(r'class="text-bold pt-1 pb-1"[^>]*>(.*?)</div>', snippet, re.DOTALL)
        raw_title = clean(strip_tags(title_m.group(1))) if title_m else ""

        # Venue: class="text-small text-med-light"
        venue_m = re.search(r'class="text-small text-med-light"[^>]*>(.*?)</div>', snippet, re.DOTALL)
        raw_venue = clean(strip_tags(venue_m.group(1))) if venue_m else ""

        # Must involve Taiwan
        combined_text = (raw_title + " " + raw_venue).lower()
        if not any(k in combined_text for k in TW_KEYWORDS):
            continue

        # Image
        img_m = re.search(r'src="(https://static\.tixcraft\.com/images/activity/[^"]+)"', snippet)
        image_url = img_m.group(1) if img_m else None

        # Parse artist from title (Tixcraft format: "ARTIST：tour name" or "ARTIST - tour name")
        artist, tour_zh = _split_tixcraft_title(raw_title)

        city_zh, city_en, venue_zh, venue_en = resolve_venue(raw_venue, raw_title)
        genre = classify_genre(artist, raw_title + " " + raw_venue)

        # Prices: Tixcraft listing doesn't show price, individual page needs auth
        results.append({
            "artist":       artist,
            "date_str":     date_str,
            "city_zh":      city_zh,
            "city_en":      city_en,
            "venue_zh":     venue_zh,
            "venue_en":     venue_en,
            "tour_zh":      tour_zh,
            "tour_en":      tour_zh,
            "price_zh":     "票價待公布",
            "price_en":     "TBA",
            "platform":     "Tixcraft 拓元售票",
            "platform_url": "https://tixcraft.com" + link_path,
            "genre":        genre,
            "image_url":    image_url,
            "source":       "tixcraft",
        })

    log(f"  → 找到 {len(results)} 個活動")
    return results


def _split_tixcraft_title(raw_title: str) -> tuple[str, str]:
    """Split 'ARTIST：tour name' or 'ARTIST - tour name' into (artist, tour)."""
    for sep in ("：", ":", " - ", " — "):
        if sep in raw_title:
            parts = raw_title.split(sep, 1)
            return parts[0].strip(), raw_title.strip()
    # No separator — entire title is the tour/show name; use _extract_artist_from_title
    artist = _extract_artist_from_title(raw_title)
    return (artist or raw_title[:30], raw_title.strip())


# ─────────────────────────────────────────────────────────────────────────────
# Source 3: tickets.udnfunlife.com — UDN 售票網 ✅
# ─────────────────────────────────────────────────────────────────────────────

def scrape_udn_tickets() -> list[dict]:
    """
    爬取 UDN 售票網活動清單。
    注意：UDN 事件清單完全透過 JavaScript 動態載入，靜態 fetch 無法取得事件列表。
    此函式嘗試從 utiki.com.tw 圖片 CDN 路徑反推活動，若失敗則優雅地返回空列表。
    實際事件資訊主要由 Tixcraft 和 ERAticket 提供覆蓋。
    """
    log("── [UDN 售票網] 開始掃描...")
    results: list[dict] = []

    # UDN's event listing is fully JS-rendered.
    # Attempt: fetch the "category = concert" filtered page which may expose PD_ID links
    html = fetch(
        "https://tickets.udnfunlife.com/application/UTK01/UTK0101_03.aspx?Category=231",
        referer="https://tickets.udnfunlife.com/application/UTK01/UTK0101_.aspx"
    )
    if not html:
        log("  ✗ UDN 無法取得")
        return results

    # Find event product-detail links
    pd_links = list(dict.fromkeys(
        re.findall(r'href="(/application/UTK01/UTK0101_05\.aspx\?PD_ID=[^"&]+)"', html)
    ))
    log(f"  UDN product links found: {len(pd_links)}")

    if not pd_links:
        log("  ℹ UDN 頁面為 JS 渲染，無法靜態解析（已跳過）")
        return results

    for pd_path in pd_links[:12]:
        time.sleep(1.5)
        pd_url = "https://tickets.udnfunlife.com" + pd_path
        pd_html = fetch(pd_url, referer="https://tickets.udnfunlife.com/application/UTK01/UTK0101_.aspx")
        if not pd_html:
            continue
        parsed = _parse_udn_product_page(pd_url, pd_html)
        if parsed:
            results.append(parsed)

    log(f"  → 找到 {len(results)} 個活動")
    return results


def _parse_udn_product_page(url: str, html: str) -> dict | None:
    text = clean(strip_tags(html))
    dates = parse_dates(text)
    if not dates:
        return None
    date_str = next((d for d in dates if is_future_date(d)), None)
    if not date_str:
        return None

    title_m = re.search(r'<title[^>]*>(.*?)</title>', html, re.DOTALL)
    title = clean(strip_tags(title_m.group(1))) if title_m else ""
    title = re.sub(r'\s*[\|｜\-]\s*udn.*$', '', title, flags=re.IGNORECASE).strip()

    venues = re.findall(
        r'(?:台北|臺北|高雄|台中|林口)[^\s，,。]{0,25}'
        r'(?:巨蛋|小巨蛋|大巨蛋|體育館|場館|Arena|劇場)',
        text,
    )
    raw_venue = venues[0] if venues else ""
    city_zh, city_en, venue_zh, venue_en = resolve_venue(raw_venue, text)

    prices = re.findall(r'NT\$\s?[\d,]+(?:[^元\n]{0,30})?', text)
    price_str = prices[0].strip()[:40] if prices else "票價待公布"

    artist = _extract_artist_from_title(title)
    if not artist:
        artist = title[:40]
    genre = classify_genre(artist, text[:500])

    _bad = ("icon", "ico/", "logo", "sprite", "favicon", "apple-touch")
    imgs = [u for u in re.findall(
        r'https://imgs2\.utiki\.com\.tw/[^"\s]+\.(?:jpg|png|webp)', html
    ) if not any(b in u.lower() for b in _bad)]
    image_url = imgs[0] if imgs else None

    return {
        "artist": artist, "date_str": date_str,
        "city_zh": city_zh, "city_en": city_en,
        "venue_zh": venue_zh, "venue_en": venue_en,
        "tour_zh": title[:60], "tour_en": title[:60],
        "price_zh": price_str,
        "price_en": price_str if re.search(r'[a-zA-Z]', price_str) else "TBA",
        "platform": "UDN 售票網",
        "platform_url": url,
        "genre": genre, "image_url": image_url, "source": "udn",
    }


# ─────────────────────────────────────────────────────────────────────────────
# Source 4: ticket.com.tw — 年代售票 ERAticket ✅
# ─────────────────────────────────────────────────────────────────────────────

def scrape_era_ticket() -> list[dict]:
    """
    爬取年代售票首頁的演唱會活動。
    年代售票同樣使用 utiki.com.tw 後端（ASP.NET），
    活動連結格式：/application/UTK02/UTK0201_.aspx?PRODUCT_ID=PXXXXXXX
    """
    log("── [年代售票 ERAticket] 開始掃描...")
    results: list[dict] = []

    html = fetch("https://ticket.com.tw/")
    if not html:
        log("  ✗ 年代售票 無法取得")
        return results

    # Extract product IDs shown on homepage banner/list
    prod_ids = list(dict.fromkeys(re.findall(r'PRODUCT_ID=([A-Z0-9]+)', html)))
    log(f"  找到 {len(prod_ids)} 個 Product ID")

    for pid in prod_ids[:15]:  # limit
        time.sleep(1.5)
        pd_url = f"https://ticket.com.tw/application/UTK02/UTK0201_.aspx?PRODUCT_ID={pid}"
        pd_html = fetch(pd_url, referer="https://ticket.com.tw/")
        if not pd_html:
            continue
        parsed = _parse_era_product_page(pd_url, pd_html)
        if parsed:
            results.append(parsed)

    log(f"  → 找到 {len(results)} 個活動")
    return results


def _parse_era_product_page(url: str, html: str) -> dict | None:
    text = clean(strip_tags(html))
    dates = parse_dates(text)
    if not dates:
        return None
    date_str = next((d for d in dates if is_future_date(d)), None)
    if not date_str:
        return None

    # Must involve Taiwan concert keywords
    has_tw = any(k in text.lower() for k in TW_KEYWORDS)
    has_concert = any(k in text.lower() for k in CONCERT_KEYWORDS)
    if not (has_tw and has_concert):
        return None

    title_m = re.search(r'<title[^>]*>(.*?)</title>', html, re.DOTALL)
    raw_full_title = clean(strip_tags(title_m.group(1))) if title_m else ""
    # ERA title format: "年代售票 | 2026 ARTIST show_name" or "年代售票 | ARTIST show_name"
    # Strip the "年代售票 | " prefix first, then the leading year
    title = re.sub(r'^年代售票\s*[|｜]\s*', '', raw_full_title).strip()
    title = re.sub(r'^\d{4}\s+', '', title).strip()

    venues = re.findall(
        r'(?:台北|臺北|高雄|台中|林口)[^\s，,。]{0,25}'
        r'(?:巨蛋|小巨蛋|大巨蛋|體育館|場館|Arena|劇場|音樂中心)',
        text,
    )
    raw_venue = venues[0] if venues else ""
    city_zh, city_en, venue_zh, venue_en = resolve_venue(raw_venue, text)

    prices = re.findall(r'NT\$\s?[\d,]+(?:[^元\n]{0,30})?', text)
    price_str = prices[0].strip()[:40] if prices else "票價待公布"

    # Artist: the portion of the title BEFORE the first concert keyword
    # e.g. "洪榮宏 舊情綿綿演唱會" → "洪榮宏"
    artist_m = re.match(
        r'^(.+?)\s+(?=.*(?:演唱會|巡演|Concert|Tour|LIVE|音樂會|展演))',
        title, re.IGNORECASE
    )
    if artist_m:
        artist = artist_m.group(1).strip()
    else:
        artist = _extract_artist_from_title(title) or (title.split()[0] if title else "")
    if not artist:
        artist = title[:40]
    genre = classify_genre(artist, text[:500])

    _bad = ("icon", "ico/", "logo", "sprite", "favicon", "apple-touch", "dl_ios", "dl_android", "img/app/")
    # og:image is the canonical concert poster
    og_m = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', html)
    if not og_m:
        og_m = re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']', html)
    if og_m and not any(b in og_m.group(1).lower() for b in _bad):
        image_url = og_m.group(1)
    else:
        imgs = [u for u in re.findall(
            r'https://imgs2\.utiki\.com\.tw/[^"\s]+\.(?:jpg|png|webp)', html
        ) if not any(b in u.lower() for b in _bad)]
        image_url = imgs[0] if imgs else None

    return {
        "artist": artist, "date_str": date_str,
        "city_zh": city_zh, "city_en": city_en,
        "venue_zh": venue_zh, "venue_en": venue_en,
        "tour_zh": title[:60], "tour_en": title[:60],
        "price_zh": price_str,
        "price_en": price_str if re.search(r'[a-zA-Z]', price_str) else "TBA",
        "platform": "年代售票",
        "platform_url": url,
        "genre": genre, "image_url": image_url, "source": "eraticket",
    }


# ─────────────────────────────────────────────────────────────────────────────
# Source 3: livenation.com.tw
# ─────────────────────────────────────────────────────────────────────────────

def scrape_livenation_tw() -> list[dict]:
    """
    爬取 livenation.com.tw 的 Taiwan 活動頁面。
    """
    log("── [livenation.com.tw] 開始掃描...")
    results: list[dict] = []

    html = fetch("https://www.livenation.com.tw/en/events-in-taiwan", timeout=25)
    if not html:
        log("  ✗ livenation 無法取得，嘗試備用網址...")
        html = fetch("https://www.livenation.com.tw/zh/events", timeout=25)
    if not html:
        return results

    # Try JSON-LD first
    json_ld_blocks = re.findall(
        r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>',
        html, re.DOTALL,
    )
    for block in json_ld_blocks:
        try:
            data = json.loads(block)
            items = data if isinstance(data, list) else [data]
            for item in items:
                if item.get("@type") not in ("Event", "MusicEvent"):
                    continue
                parsed = _parse_livenation_jsonld(item)
                if parsed:
                    results.append(parsed)
        except (json.JSONDecodeError, AttributeError):
            continue

    # Fallback: parse HTML event cards
    if not results:
        # Find event links matching pattern /en/event/...
        event_links = list(dict.fromkeys(
            re.findall(r'href="(https://www\.livenation\.com\.tw/(?:en|zh)/event/[^"]+)"', html)
        ))
        for ev_url in event_links[:15]:  # limit to avoid hammering
            time.sleep(1.0)
            parsed = _parse_livenation_event_page(ev_url)
            if parsed:
                results.append(parsed)

    log(f"  → 找到 {len(results)} 個活動")
    return results


def _parse_livenation_jsonld(item: dict) -> dict | None:
    name = item.get("name", "")
    if not name:
        return None
    # Check if Taiwan-related
    location = item.get("location", {})
    loc_name = location.get("name", "") if isinstance(location, dict) else ""
    addr = location.get("address", {}) if isinstance(location, dict) else {}
    addr_str = addr.get("addressLocality", "") + addr.get("addressRegion", "") \
               if isinstance(addr, dict) else str(addr)
    context = (name + " " + loc_name + " " + addr_str).lower()
    if not any(k in context for k in TW_KEYWORDS):
        return None

    # Date
    start = item.get("startDate", "")
    dates = parse_dates(start or "")
    if not dates:
        dates = parse_dates(name)
    if not dates:
        return None
    date_str = next((d for d in dates if is_future_date(d)), None)
    if not date_str:
        return None

    artist_name = name
    # Common pattern: "Artist - Tour Name" or "Artist 演唱會"
    if " - " in name:
        artist_name = name.split(" - ")[0].strip()

    city_zh, city_en, venue_zh, venue_en = resolve_venue(loc_name, context)
    genre = classify_genre(artist_name, name)
    url = item.get("url", "https://www.livenation.com.tw/en/events")

    return {
        "artist":       artist_name,
        "date_str":     date_str,
        "city_zh":      city_zh,
        "city_en":      city_en,
        "venue_zh":     venue_zh,
        "venue_en":     venue_en,
        "tour_zh":      name[:60],
        "tour_en":      name[:60],
        "price_zh":     "票價待公布",
        "price_en":     "TBA",
        "platform":     "Live Nation Taiwan",
        "platform_url": url,
        "genre":        genre,
        "image_url":    item.get("image"),
        "source":       "livenation",
    }


def _parse_livenation_event_page(url: str) -> dict | None:
    html = fetch(url, timeout=25)
    if not html:
        return None
    text = clean(strip_tags(html))
    if not any(k in text.lower() for k in TW_KEYWORDS):
        return None

    title_m = re.search(r"<title[^>]*>(.*?)</title>", html, re.DOTALL)
    title = clean(strip_tags(title_m.group(1))) if title_m else ""
    title = re.sub(r"\s*[\|｜-]\s*Live Nation.*$", "", title).strip()

    dates = parse_dates(text)
    if not dates:
        return None
    date_str = next((d for d in dates if is_future_date(d)), None)
    if not date_str:
        return None

    venues = re.findall(
        r"(?:台北|臺北|高雄|台中|林口)[^\s，,。]{0,25}"
        r"(?:巨蛋|小巨蛋|大巨蛋|體育館|場館|Arena|劇場|公園)",
        text,
    )
    raw_venue = venues[0] if venues else ""
    city_zh, city_en, venue_zh, venue_en = resolve_venue(raw_venue, text)

    artist = _extract_artist_from_title(title)
    if not artist:
        artist = title[:40]

    prices = re.findall(r"NT\$\s?[\d,]+(?:[^元\n]{0,30})?", text)
    price_str = prices[0].strip()[:40] if prices else "票價待公布"

    genre = classify_genre(artist, text[:500])

    return {
        "artist":       artist,
        "date_str":     date_str,
        "city_zh":      city_zh,
        "city_en":      city_en,
        "venue_zh":     venue_zh,
        "venue_en":     venue_en,
        "tour_zh":      title[:60],
        "tour_en":      title[:60],
        "price_zh":     price_str,
        "price_en":     price_str if re.search(r"[a-zA-Z]", price_str) else "TBA",
        "platform":     "Live Nation Taiwan",
        "platform_url": url,
        "genre":        genre,
        "image_url":    None,
        "source":       "livenation",
    }


# ─────────────────────────────────────────────────────────────────────────────
# Source 4: DuckDuckGo HTML lite (search engine fallback)
# ─────────────────────────────────────────────────────────────────────────────

_DDG_QUERIES = [
    "台灣 演唱會 2026 售票",
    "Taiwan concert 2026 ticket",
    "台北 演唱會 2026",
    "台灣 開唱 2026",
]


def scrape_duckduckgo() -> list[dict]:
    """
    使用 DuckDuckGo HTML lite 搜尋台灣演唱會，
    收集結果 URL 後個別解析。
    """
    log("── [DuckDuckGo] 開始搜尋...")
    candidate_urls: set[str] = set()

    for query in _DDG_QUERIES:
        ddg_url = (
            "https://html.duckduckgo.com/html/?q="
            + urllib.parse.quote(query)
            + "&kl=tw-tzh"
        )
        html = fetch(ddg_url, timeout=20)
        if not html:
            continue

        # Extract result URLs (DDG HTML lite uses data-rut or href with uddg param)
        for m in re.finditer(r'<a[^>]+class="result__a"[^>]+href="([^"]+)"', html):
            href = html_lib.unescape(m.group(1))
            # DDG wraps URLs: extract actual URL from uddg param
            uddg_m = re.search(r"uddg=([^&]+)", href)
            if uddg_m:
                href = urllib.parse.unquote(uddg_m.group(1))
            # Only keep known concert-relevant domains
            if any(d in href for d in [
                "kpopn.com", "livenation.com.tw", "tixcraft.com",
                "kktix.com", "ibon.com.tw", "koreastardaily.com",
                "ltn.com.tw", "udn.com", "chinatimes.com",
            ]):
                candidate_urls.add(href)

        time.sleep(2.0)  # Be polite to DDG

    log(f"  → 收集到 {len(candidate_urls)} 個候選連結")
    results: list[dict] = []
    for url in list(candidate_urls)[:8]:  # limit to avoid excessive requests
        time.sleep(1.5)
        parsed = _parse_generic_article(url)
        if parsed:
            results.append(parsed)

    log(f"  → 解析出 {len(results)} 個活動")
    return results


def _parse_generic_article(url: str) -> dict | None:
    """Generic parser for concert news articles."""
    html = fetch(url, timeout=20)
    if not html:
        return None

    text = clean(strip_tags(html))
    # Must be about Taiwan concert events
    has_tw = any(k in text.lower() for k in TW_KEYWORDS)
    has_concert = any(k in text.lower() for k in CONCERT_KEYWORDS)
    if not (has_tw and has_concert):
        return None

    title_m = re.search(r"<title[^>]*>(.*?)</title>", html, re.DOTALL)
    title = clean(strip_tags(title_m.group(1))) if title_m else ""
    title = re.sub(r"\s*[\|｜-]\s*(?:kpopn|livenation|tixcraft|ibon).*$", "", title, flags=re.IGNORECASE).strip()

    dates = parse_dates(text)
    if not dates:
        return None
    date_str = next((d for d in dates if is_future_date(d)), None)
    if not date_str:
        return None

    artist = _extract_artist_from_title(title)
    if not artist or len(artist) < 2:
        return None

    venues = re.findall(
        r"(?:台北|臺北|高雄|台中|林口)[^\s，,。]{0,25}"
        r"(?:巨蛋|小巨蛋|大巨蛋|體育館|場館|Arena|劇場)",
        text,
    )
    raw_venue = venues[0] if venues else ""
    city_zh, city_en, venue_zh, venue_en = resolve_venue(raw_venue, text)

    prices = re.findall(r"NT\$\s?[\d,]+(?:[^元\n]{0,30})?", text)
    price_str = prices[0].strip()[:40] if prices else "票價待公布"

    genre = classify_genre(artist, text[:500])

    # Determine platform from URL
    platform_map = {
        "kktix.com": "KKTIX",
        "ibon.com.tw": "ibon",
        "tixcraft.com": "Tixcraft",
        "livenation.com.tw": "Live Nation Taiwan",
        "kpopn.com": "kpopn",
        "koreastardaily.com": "KSD 韓星網",
    }
    platform = next((v for k, v in platform_map.items() if k in url), "網路新聞")

    return {
        "artist":       artist,
        "date_str":     date_str,
        "city_zh":      city_zh,
        "city_en":      city_en,
        "venue_zh":     venue_zh,
        "venue_en":     venue_en,
        "tour_zh":      title[:60],
        "tour_en":      title[:60],
        "price_zh":     price_str,
        "price_en":     price_str if re.search(r"[a-zA-Z]", price_str) else "TBA",
        "platform":     platform,
        "platform_url": url,
        "genre":        genre,
        "image_url":    None,
        "source":       "duckduckgo",
    }


# ─────────────────────────────────────────────────────────────────────────────
# Normalize & deduplicate
# ─────────────────────────────────────────────────────────────────────────────

def _dedup_key(c: dict) -> str:
    """Unique key for deduplication — mirrors Supabase unique constraint."""
    return "|".join([
        c.get("artist", "").lower().strip(),
        c.get("date_str", ""),
        c.get("city_zh", ""),
        c.get("venue_zh", ""),
        c.get("tour_zh", "")[:30],
    ])


def normalize_concerts(raw: list[dict]) -> list[dict]:
    """Deduplicate, fill defaults, assign gradient CSS."""
    seen: set[str] = set()
    out: list[dict] = []
    for c in raw:
        if not c.get("artist") or not c.get("date_str"):
            continue
        key = _dedup_key(c)
        if key in seen:
            continue
        seen.add(key)

        genre = c.get("genre", "western")
        seed = c.get("artist", "") + c.get("date_str", "")

        out.append({
            "artist":       c.get("artist", "TBA"),
            "emoji":        _EMOJIS.get(genre, "🎵"),
            "date_str":     c.get("date_str", "日期待公布"),
            "city_zh":      c.get("city_zh", "台北"),
            "city_en":      c.get("city_en", "Taipei"),
            "venue_zh":     c.get("venue_zh", "場地待公布"),
            "venue_en":     c.get("venue_en", "Venue TBA"),
            "tour_zh":      c.get("tour_zh", "演唱會"),
            "tour_en":      c.get("tour_en", "Concert"),
            "price_zh":     c.get("price_zh", "票價待公布"),
            "price_en":     c.get("price_en", "TBA"),
            "platform":     c.get("platform", "待確認"),
            "platform_url": c.get("platform_url", ""),
            "genre":        genre,
            "status":       "pending",
            "is_hot":       False,
            "grad_css":     grad_for(genre, seed),
            "image_url":    c.get("image_url") or None,
            "source":       c.get("source", "auto"),
        })
    return out


# ─────────────────────────────────────────────────────────────────────────────
# Output: SQL generation
# ─────────────────────────────────────────────────────────────────────────────

def to_upsert_sql(concerts: list[dict]) -> str:
    if not concerts:
        return "-- 今日未發現新活動\n"

    rows: list[str] = []
    for c in concerts:
        image_val = sql_val(c.get("image_url"))
        row = (
            f"({sql_val(c['artist'])}, {sql_val(c['emoji'])}, "
            f"{sql_val(c['date_str'])}, {sql_val(c['city_zh'])}, {sql_val(c['city_en'])}, "
            f"{sql_val(c['venue_zh'])}, {sql_val(c['venue_en'])}, "
            f"{sql_val(c['tour_zh'])}, {sql_val(c['tour_en'])}, "
            f"{sql_val(c['price_zh'])}, {sql_val(c['price_en'])}, "
            f"{sql_val(c['platform'])}, {sql_val(c['platform_url'])}, "
            f"{sql_val(c['genre'])}, 'pending', false, "
            f"{sql_val(c['grad_css'])}, {image_val})"
        )
        rows.append(row)

    joined = ",\n".join(rows)
    return f"""-- 自動爬取：{date.today().isoformat()} 每日演唱會更新
-- 來源: {', '.join(dict.fromkeys(c['source'] for c in concerts))}
-- 請在 Supabase Dashboard → SQL Editor 執行此檔案

insert into concerts (
  artist, emoji, date_str, city_zh, city_en, venue_zh, venue_en,
  tour_zh, tour_en, price_zh, price_en, platform, platform_url,
  genre, status, is_hot, grad_css, image_url
) values
{joined}
on conflict on constraint concerts_unique_show do update
set
  emoji        = excluded.emoji,
  city_en      = excluded.city_en,
  venue_en     = excluded.venue_en,
  tour_en      = excluded.tour_en,
  price_zh     = excluded.price_zh,
  price_en     = excluded.price_en,
  platform     = excluded.platform,
  platform_url = excluded.platform_url,
  genre        = excluded.genre,
  grad_css     = excluded.grad_css,
  image_url    = coalesce(excluded.image_url, concerts.image_url);
"""


# ─────────────────────────────────────────────────────────────────────────────
# Output: Supabase REST API upsert
# ─────────────────────────────────────────────────────────────────────────────

def supabase_upsert(concerts: list[dict], supabase_url: str, api_key: str) -> bool:
    """
    呼叫 Supabase REST API 直接寫入 concerts 表。
    需要 service_role key 或具有 INSERT 權限的 key。
    """
    endpoint = supabase_url.rstrip("/") + "/rest/v1/concerts?on_conflict=artist,date_str,city_zh,venue_zh,tour_zh"
    payload = []
    for c in concerts:
        row: dict[str, Any] = {
            "artist":       c["artist"],
            "emoji":        c["emoji"],
            "date_str":     c["date_str"],
            "city_zh":      c["city_zh"],
            "city_en":      c["city_en"],
            "venue_zh":     c["venue_zh"],
            "venue_en":     c["venue_en"],
            "tour_zh":      c["tour_zh"],
            "tour_en":      c["tour_en"],
            "price_zh":     c["price_zh"],
            "price_en":     c["price_en"],
            "platform":     c["platform"],
            "platform_url": c["platform_url"],
            "genre":        c["genre"],
            "status":       "pending",
            "is_hot":       False,
            "grad_css":     c["grad_css"],
            "image_url":    c.get("image_url"),  # always include, None if missing
        }
        payload.append(row)

    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        endpoint,
        data=body,
        method="POST",
        headers={
            "apikey":          api_key,
            "Authorization":   f"Bearer {api_key}",
            "Content-Type":    "application/json",
            "Prefer":          "resolution=merge-duplicates,return=minimal",
        },
    )
    try:
        with urllib.request.urlopen(req, context=SSL_CTX, timeout=30) as resp:
            code = resp.getcode()
            log(f"  ✓ Supabase upsert OK ({code}) — {len(concerts)} 筆")
            return True
    except urllib.error.HTTPError as e:
        body_resp = e.read().decode("utf-8", errors="ignore")[:200]
        log(f"  ✗ Supabase upsert 失敗 ({e.code}): {body_resp}")
        return False
    except Exception as e:
        log(f"  ✗ Supabase upsert 錯誤: {e}")
        return False


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

def main() -> None:
    log("=" * 60)
    log(f"Taiwan Concert Daily Scraper — {date.today().isoformat()}")
    log("=" * 60)

    env = read_env()
    supabase_url = env.get("NEXT_PUBLIC_SUPABASE_URL", "")
    # Prefer service role key (full write access) over anon key
    api_key = env.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")

    # Collect from all sources
    raw: list[dict] = []

    # ── 售票平台（結構化資料，優先）──────────────────────────────────────────
    try:
        raw += scrape_tixcraft()
    except Exception as e:
        log(f"  ✗ Tixcraft 爬取失敗: {e}")

    try:
        raw += scrape_udn_tickets()
    except Exception as e:
        log(f"  ✗ UDN 售票網爬取失敗: {e}")

    try:
        raw += scrape_era_ticket()
    except Exception as e:
        log(f"  ✗ 年代售票爬取失敗: {e}")

    # ── 新聞 / Live Nation（補充來源）──────────────────────────────────────────
    try:
        raw += scrape_kpopn(max_pages=4)
    except Exception as e:
        log(f"  ✗ kpopn 爬取失敗: {e}")

    try:
        raw += scrape_livenation_tw()
    except Exception as e:
        log(f"  ✗ livenation 爬取失敗: {e}")

    try:
        raw += scrape_duckduckgo()
    except Exception as e:
        log(f"  ✗ DuckDuckGo 搜尋失敗: {e}")

    log(f"\n共收集 {len(raw)} 筆原始資料（含重複）")

    concerts = normalize_concerts(raw)
    log(f"去重後剩 {len(concerts)} 筆")

    # ── Write JSON audit trail ──────────────────────────────────────────────
    json_out = DATA_DIR / f"daily_{TODAY_STR}.json"
    json_out.write_text(
        json.dumps(concerts, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    log(f"✓ JSON 已寫入: {json_out}")

    # ── Write SQL file ──────────────────────────────────────────────────────
    sql_out = DATA_DIR / f"daily_{TODAY_STR}.sql"
    sql_out.write_text(to_upsert_sql(concerts), encoding="utf-8")
    log(f"✓ SQL 已寫入: {sql_out}")

    if not concerts:
        log("今日無新發現，結束。")
        return

    # ── Supabase auto-insert ────────────────────────────────────────────────
    if supabase_url and api_key:
        has_service_key = "SUPABASE_SERVICE_ROLE_KEY" in env
        if has_service_key:
            log(f"\n自動寫入 Supabase ({len(concerts)} 筆)...")
            supabase_upsert(concerts, supabase_url, api_key)
        else:
            log("\n⚠️  未設定 SUPABASE_SERVICE_ROLE_KEY，跳過自動寫入。")
            log(f"   請手動執行: {sql_out}")
            log("   或在 .env.local 加入 SUPABASE_SERVICE_ROLE_KEY=<your_key>")
            log("   (Service Role Key 位於 Supabase Dashboard → Settings → API)")
    else:
        log("\n⚠️  Supabase 設定不完整，跳過自動寫入。")
        log(f"   請手動執行 SQL: {sql_out}")

    log("=" * 60)
    log("完成！")


if __name__ == "__main__":
    main()
