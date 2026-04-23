#!/usr/bin/env python3
"""daily_concert_scraper.py — Taiwan Concert Daily Auto-Fetcher
============================================================
每日 00:00 由 macOS launchd 觸發，爬取最新台灣演唱會資訊並匯入 Supabase。

資料來源 (依優先順序):
  ── 售票平台（結構化，優先）──────────────────────────────────────────────────
  1.  Tixcraft 拓元售票     — tixcraft.com/activity/list       ✅ 直接可爬
  2.  UDN 售票網            — tickets.udnfunlife.com            ✅ 直接可爬（JS 渲染時降級）
  3.  年代售票 ERAticket     — ticket.com.tw                    ✅ 直接可爬
  4.  寬宏售票 Kham          — kham.com.tw                      ✅ 直接可爬
  4b. 遠大售票 Ticket Plus   — ticketplus.com.tw/eventlist.html ⚠️  React SPA（og: meta 爬取）
  5.  iNDIEVOX             — indievox.com/activity             ✅ 直接可爬（含免費偵測）

  ── 免費活動平台 ──────────────────────────────────────────────────────────────
  5b. Accupass 活動通       — accupass.com/event/search?range=free ✅ 直接可爬（免費音樂）
  ✗  KKTIX                — api.kktix.com 需 OAuth 授權，暫不支援

  ── 新聞 / Live Nation（補充來源）───────────────────────────────────────────
  6.  kpopn.com listing    — K-pop 演唱會最新消息
  7.  livenation.com.tw    — Live Nation Taiwan 活動
  8.  DuckDuckGo HTML lite — 補充關鍵字搜尋
  9.  可樂旅遊 Colatour      — colatour.com.tw（非售票平台，僅作資訊補充）✅ SSR
  10. Bandsintown           — bandsintown.com/c/taipei-taiwan  ✅ 直接可爬（含小型場次）
  11. LIVE王 Facebook       — mbasic.facebook.com/LIVEKINGisLife

  ── 指標性大型場館 ────────────────────────────────────────────────────────────
  12. 台北流行音樂中心 (北流) — tmc.taipei                      ✅ SSR
  13. 高雄流行音樂中心 (高流) — kpmc.com.tw                     ✅ SSR

  ── Live House 展演空間 ────────────────────────────────────────────────────────
  14. Legacy (台北/台中/TERA) — legacy.com.tw                   ✅ 直接可爬
  15. The Wall Live House    — thewall.tw → 備用 kktix.com/venues/thewall
  16. PIPE Live Music        — pipemusic.com.tw → 備用 mbasic.facebook.com/PIPELiveMusic
  17. NUZONE 展演空間        — nuzone.com.tw                    ✅ 直接可爬
  18. Zepp New Taipei        — zepp.com/en-us/hall/zepp-new-taipei ✅ (新增)
  19. 河岸留言 Riverside      — riverside.com.tw                 ✅ (新增)

無法直接爬取（需瀏覽器 / API key）:
  ✗ KKTIX      — Cloudflare Bot 防護 (403)（The Wall 備用頁偶爾可通）
  ✗ ibon       — 403 Forbidden
  ✗ Klook      — 403 Forbidden
  ✗ KKday      — 403 Forbidden
  ✗ OpenTix    — 404
  ✓ TicketPlus — 已改用 og: meta 爬取（React SPA，eventlist 需 JS 渲染，detail page og: 可取）

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
from datetime import date, datetime, timedelta
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

# ── 壞標題黑名單 ──────────────────────────────────────────────────────────────
# 爬蟲抓到 listing / 分類頁時,<title> 或 og:title 常是頁面本身而非單場活動名稱。
# 命中以下 pattern 的一律視為髒資料,不寫入 DB。
BAD_TITLE_SUBSTRINGS = [
    "節目資訊", "節目清單", "節目列表",
    "活動資訊", "活動列表", "演出資訊", "演出列表", "演出節目",
    "節目與票券", "節目總表", "節目表", "最新節目",
    "關於LEGACY", "寬宏售票系統", "Ticket Plus遠大售票系統", "遠大售票系統",
]
# 季度型標題(如 "2026-27 節目清單與時間"、"2025/26 Season")通常是場館年度頁
_BAD_TITLE_REGEXES = [
    re.compile(r"^\s*20\d{2}[-/]\d{2}\s*(?:season|節目)", re.IGNORECASE),
    re.compile(r"function\s*\(\s*w\s*,\s*d\s*,\s*s\s*,\s*l\s*,\s*i\s*\)"),  # GTM JS
    re.compile(r"w\s*\[\s*l\s*\]\s*=\s*w\s*\[\s*l\s*\]"),                  # GTM JS
]


def is_bad_title(title: str) -> bool:
    """判斷 title / artist 欄位是否為 listing 頁或 JS 片段等髒資料。"""
    if not title:
        return True
    t = title.strip()
    for s in BAD_TITLE_SUBSTRINGS:
        if s in t:
            return True
    for rx in _BAD_TITLE_REGEXES:
        if rx.search(t):
            return True
    return False

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
    # 日本動漫/聲優歌手
    "lisa", "水樹奈奈", "may'n", "nakashima", "中島美嘉", "misia", "mizuki nana",
    "nano", "fripside", "garnidelia", "kalafina",
}
_CPOP = {
    "林俊傑", "jj lin", "張惠妹", "a-mei", "周杰倫", "jay chou", "蔡依林", "jolin tsai",
    "張學友", "jacky cheung", "王力宏", "leehom", "孫燕姿", "stefanie sun",
    "林宥嘉", "楊乃文", "陳奕迅", "eason chan", "leo王", "熊仔", "陳珊妮",
    # 台灣創作/流行歌手
    "鄭興", "艾薇", "葵剛", "白吉勝", "陳德修", "後站人", "伯爵先生",
    "丁噹", "della", "陳大衛",
}
_KPOP_EXTRA = {
    # 韓國歌手/演員（補充 _KPOP 沒有的）
    "李昇基", "이승기", "李洪基", "이홍기", "ftisland", "kangin", "강인",
    "cnblue", "woodz",
}
_BANDS = {
    # 台灣樂團
    "五月天", "mayday", "告五人", "accusefive", "茄子蛋", "動力火車", "power station",
    "草東沒有派對", "no party for cao dong", "落日飛車", "sunset rollercoaster",
    "盧廣仲", "sodagreen", "蘇打綠", "傻子與白痴", "拍謝少年", "sorry youth",
    "大象體操", "elephant gym", "老王樂隊", "宇宙人", "cosmos people",
    "魚丁糸", "滅火器", "fire ex", "旺福", "wonfu", "閃靈", "chthonic",
    "橘子海", "tan lines", "山嵐", "hyper crush", "leo37", "生祥樂隊",
    "甜約翰", "deca joins", "熱狗", "有你真好", "芒果醬",
    # 台灣獨立樂團（新增）
    "我是機車少女", "野巢", "be酷", "icyball", "冰球樂團", "emptyor",
    "男子漢樂團", "倒車入庫", "number 18", "resono", "beyond cure", "腦體馬戲團",
    "麋先生", "mixer",
    # 西洋樂團
    "coldplay", "arctic monkeys", "radiohead", "oasis", "the 1975",
    "kings of leon", "imagine dragons", "linkin park", "green day",
    "foo fighters", "red hot chili peppers", "rhcp", "maroon 5",
    "the killers", "thirty seconds to mars", "30 seconds to mars",
    "fall out boy", "panic! at the disco", "my chemical romance",
    "paramore", "weezer", "blink-182", "sum 41", "simple plan",
    "muse", "blur", "the strokes", "vampire weekend", "mgmt",
    "the national", "bon iver", "fleet foxes", "beach house",
    "tame impala", "alvvays", "japanese breakfast", "big thief",
    "phoebe bridgers", "boygenius", "death cab for cutie",
    "modest mouse", "arcade fire", "wolf parade", "broken social scene",
    "phoenix", "daft punk", "air", "justice", "mgmt", "two door cinema club",
    "the xx", "glass animals", "alt-j", "foals", "bastille",
    "nothing but thieves", "frank turner", "the lumineers", "mumford",
    "of monsters and men", "the head and the heart", "iron & wine",
    "explosions in the sky", "sigur rós", "mogwai",
    "bring me the horizon", "bmth", "a day to remember", "adtr",
    "pierce the veil", "sleeping with sirens", "crown the empire",
    "portishead", "massive attack", "tricky", "thievery corporation",
    "röyksopp", "beach boys",
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
    # Live House
    ("zepp new taipei", ("新北", "New Taipei", "Zepp New Taipei",                       "Zepp New Taipei")),
    ("zepp",            ("新北", "New Taipei", "Zepp New Taipei",                       "Zepp New Taipei")),
    ("宏匯廣場",        ("新北", "New Taipei", "Zepp New Taipei",                       "Zepp New Taipei")),
    ("河岸留言",        ("台北", "Taipei",     "河岸留言西門紅樓展演館",                "Riverside Live House")),
    ("riverside",       ("台北", "Taipei",     "河岸留言西門紅樓展演館",                "Riverside Live House")),
    ("the wall",        ("台北", "Taipei",     "The Wall Live House",                   "The Wall Live House")),
    ("pipe live",       ("台北", "Taipei",     "PIPE Live Music",                       "PIPE Live Music")),
    ("nuzone",          ("台北", "Taipei",     "NUZONE 展演空間",                       "NUZONE")),
    ("迴響音樂",        ("台中", "Taichung",   "迴響音樂藝文展演空間",                  "Revolver Music Space Taichung")),
    ("legacy tera",     ("台北", "Taipei",     "Legacy TERA",                           "Legacy TERA")),
    ("legacy taipei",   ("台北", "Taipei",     "Legacy Taipei",                         "Legacy Taipei")),
    ("legacy taichung", ("台中", "Taichung",   "Legacy Taichung",                       "Legacy Taichung")),
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
    "bands":   [
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
    "kpop": "✨", "cpop": "🎤", "bands": "🎸", "hiphop": "🎧",
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
    # 先移除 <script>/<style> 區塊（含內容），再移除剩餘的 HTML 標籤
    html = re.sub(r"<script[^>]*>.*?</script>", " ", html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r"<style[^>]*>.*?</style>", " ", html, flags=re.DOTALL | re.IGNORECASE)
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
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


# ─────────────────────────────────────────────────────────────────────────────
# Genre & venue classifiers
# ─────────────────────────────────────────────────────────────────────────────

def classify_genre(artist: str, text: str = "") -> str:
    combined = (artist + " " + text).lower()
    if any(k in combined for k in _FESTIVAL_KW):
        return "festival"
    # 判斷順序：樂團 > jpop > kpop，避免台灣樂團被誤判為 kpop
    if any(k in combined for k in _BANDS) or "樂團" in artist:
        return "bands"
    if any(k in combined for k in _JPOP):
        return "jpop"
    if any(k in combined for k in _KPOP) or any(k in combined for k in _KPOP_EXTRA):
        return "kpop"
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


def _infer_sale_year(mo: int, d: int) -> int:
    """推算中文日期（無年份）的年份：若已過今天則用明年，否則今年。"""
    today = date.today()
    try:
        ev = date(today.year, mo, d)
        return today.year if ev >= today else today.year + 1
    except ValueError:
        return today.year


def _cn_hour(time_qualifier: str, h: int) -> int:
    """將中文時段詞換算成 24 小時制。"""
    q = time_qualifier.strip()
    if q in ("下午", "晚上") and h < 12:
        return h + 12
    if q in ("上午", "早上") and h == 12:
        return 0
    if q == "中午":
        return 12
    return h


def parse_sale_start(text: str) -> str | None:
    """
    從頁面文字中提取售票開始時間。
    支援格式：
      1. 開賣時間: 2026/04/15 12:00        ← YYYY/MM/DD HH:MM
      2. On Sale: 2026-04-15 10:00          ← YYYY-MM-DD HH:MM
      3. 售票日期\n2026/05/10 (日) 12:00    ← keyword 跨行 + YYYY/MM/DD
      4. 3 月 27 日中午 12 點開賣           ← 中文月日 + 時段詞 + X點
      5. 5月15日 下午 2:30 開賣             ← 中文月日 + HH:MM
    回傳 ISO 8601 字串 "YYYY-MM-DDTHH:MM:00+08:00"（台灣 UTC+8），或 None。
    """
    kw = (
        r'(?:開賣|售票開始|搶票|票券開賣|票務開始|購票開始|會員預售|公開發售|'
        r'售票日期|售票時間|開售時間|購票時間|開售日期|購票日期|'
        r'公開售票|網路售票|一般售票|現場售票開始|預售開始|'
        r'on[\s\-]+sale|sale[\s\-]+start|tickets?\s+on\s+sale)'
    )

    # ── Pattern 1: keyword + YYYY/MM/DD HH:MM ───────────────────────────────
    m = re.search(
        kw + r'[^\n\d]{0,30}(20(?:25|26|27))[/\-年](\d{1,2})[/\-月](\d{1,2})'
        r'[日\s\(（\)）A-Za-z,]*(\d{1,2}):(\d{2})',
        text, re.IGNORECASE,
    )
    if m:
        y, mo, d, h, mi = m.group(1), m.group(2), m.group(3), m.group(4), m.group(5)
        try:
            return f"{y}-{int(mo):02d}-{int(d):02d}T{int(h):02d}:{mi}:00+08:00"
        except ValueError:
            pass

    # ── Pattern 2: keyword + YYYY/MM/DD（預設正午）────────────────────────────
    m = re.search(
        kw + r'[^\n\d]{0,30}(20(?:25|26|27))[/\-年](\d{1,2})[/\-月](\d{1,2})',
        text, re.IGNORECASE,
    )
    if m:
        y, mo, d = m.group(1), m.group(2), m.group(3)
        try:
            return f"{y}-{int(mo):02d}-{int(d):02d}T12:00:00+08:00"
        except ValueError:
            pass

    # ── Pattern 3: keyword 跨行 + YYYY/MM/DD HH:MM（Tixcraft 格式）──────────
    m = re.search(
        kw + r'[\s\S]{0,60}?(20(?:25|26|27))[/\-](\d{1,2})[/\-](\d{1,2})'
        r'[^\n\d]{0,20}(\d{1,2}):(\d{2})',
        text, re.IGNORECASE,
    )
    if m:
        y, mo, d, h, mi = m.group(1), m.group(2), m.group(3), m.group(4), m.group(5)
        try:
            return f"{y}-{int(mo):02d}-{int(d):02d}T{int(h):02d}:{mi}:00+08:00"
        except ValueError:
            pass

    # ── Pattern 4: 中文日期 + 時段詞 + X點 + keyword（ERA 格式）──────────────
    # 例: "3 月 27 日中午 12 點開賣" / "5月15日下午2點半開賣"
    m = re.search(
        r'(\d{1,2})\s*月\s*(\d{1,2})\s*日\s*'
        r'(上午|早上|中午|下午|晚上)?\s*'
        r'(\d{1,2})\s*[點点]\s*(?:半\s*)?'
        r'[^\n\d]{0,10}' + kw,
        text, re.IGNORECASE,
    )
    if m:
        mo_s, d_s, qualifier, h_s = m.group(1), m.group(2), m.group(3) or "", m.group(4)
        try:
            mo_i, d_i, h_i = int(mo_s), int(d_s), _cn_hour(qualifier, int(h_s))
            mi_i = 30 if "半" in text[m.start():m.end()] else 0
            y_i = _infer_sale_year(mo_i, d_i)
            return f"{y_i}-{mo_i:02d}-{d_i:02d}T{h_i:02d}:{mi_i:02d}:00+08:00"
        except ValueError:
            pass

    # ── Pattern 5: 中文日期 + HH:MM + keyword（混合格式）────────────────────
    # 例: "5月15日 下午 2:30 開賣"
    m = re.search(
        r'(\d{1,2})\s*月\s*(\d{1,2})\s*日\s*'
        r'(?:上午|早上|中午|下午|晚上)?\s*'
        r'(\d{1,2}):(\d{2})\s*'
        r'[^\n\d]{0,10}' + kw,
        text, re.IGNORECASE,
    )
    if m:
        mo_s, d_s, h_s, mi_s = m.group(1), m.group(2), m.group(3), m.group(4)
        qualifier = ""
        q_m = re.search(r'(上午|早上|中午|下午|晚上)', text[m.start():m.end()])
        if q_m:
            qualifier = q_m.group(1)
        try:
            mo_i, d_i = int(mo_s), int(d_s)
            h_i = _cn_hour(qualifier, int(h_s))
            y_i = _infer_sale_year(mo_i, d_i)
            return f"{y_i}-{mo_i:02d}-{d_i:02d}T{h_i:02d}:{mi_s}:00+08:00"
        except ValueError:
            pass

    return None


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
        "artist":       artist,
        "date_str":     date_str,
        "city_zh":      city_zh,
        "city_en":      city_en,
        "venue_zh":     venue_zh,
        "venue_en":     venue_en,
        "tour_zh":      tour_zh,
        "tour_en":      tour_zh,  # will refine if English found
        "price_zh":     price_str,
        "price_en":     price_str if re.search(r"[a-zA-Z]", price_str) else "票價待公布",
        "platform":     "kpopn",
        "platform_url": url,
        "genre":        genre,
        "image_url":    image_url,
        "sale_start_at": parse_sale_start(text),
        "source":       "kpopn",
    }


def _extract_artist_from_title(title: str) -> str:
    # Common kpopn title patterns: "Artist名稱 台灣演唱會 ..."
    # Try splitting on spaces/separators, take the first meaningful segment
    # 先清除開頭的日期前綴，如 "2026-05-02(六) " 或 "2026/04/25（六）"
    title = re.sub(
        r'^20\d{2}[-/]\d{2}[-/]\d{2}[\(（【]?[^)）】\s]{0,10}[\)）】]?\s*',
        '', title
    ).strip()
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
        # Note: detail pages return 401 — sale_start_at will be filled by KKTIX or other sources
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
            "sale_start_at": None,
            "source":       "tixcraft",
        })

    log(f"  → 找到 {len(results)} 個活動")
    return results


def _fetch_tixcraft_sale_start(link_path: str) -> str | None:
    """
    拜訪 Tixcraft 個別活動頁面，提取售票開始時間。
    使用較短的 timeout（8 秒）且只重試一次，避免拖慢整體爬蟲。
    Tixcraft 頁面常見格式：
      <li><div class="title">售票日期</div><div class="detail">2026/05/10 (日) 12:00 開賣</div></li>
    """
    url = "https://tixcraft.com" + link_path
    html = fetch(url, timeout=8, retries=1, referer="https://tixcraft.com/activity/list")
    if not html:
        return None
    text = clean(strip_tags(html))
    return parse_sale_start(text)


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
        "genre": genre, "image_url": image_url,
        "sale_start_at": parse_sale_start(text), "source": "udn",
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
        "genre": genre, "image_url": image_url,
        "sale_start_at": parse_sale_start(text), "source": "eraticket",
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
        "sale_start_at": parse_sale_start(name + " " + str(item.get("offers", ""))),
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
        "sale_start_at": parse_sale_start(text),
        "source":       "livenation",
    }


# ─────────────────────────────────────────────────────────────────────────────
# Source 4: DuckDuckGo HTML lite (search engine fallback)
# ─────────────────────────────────────────────────────────────────────────────

_DDG_QUERIES = [
    # 一般演唱會資訊
    "台灣 演唱會 2026 售票",
    "Taiwan concert 2026 ticket",
    "台北 演唱會 2026",
    "台灣 開唱 2026",
    # 開賣公告（抓即將開搶的預告）
    "台灣 演唱會 開賣時間 2026",
    "台灣 演唱會 售票開始 2026",
    "台北 演唱會 開賣 拓元 2026",
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
                "ettoday.net", "storm.mg", "ent.ltn.com.tw",
                "streetvoice.com", "kkday.com", "kkbox.com",
                "rockintaiwan.com", "shortshort.tw", "muzikpro.net",
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
        "sale_start_at": parse_sale_start(text),
        "source":       "duckduckgo",
    }


# ─────────────────────────────────────────────────────────────────────────────
# Source 5: 可樂旅遊 Colatour — 2026全台演唱會懶人包 ✅
# ─────────────────────────────────────────────────────────────────────────────

_COLATOUR_URL = "https://www.colatour.com.tw/webDM/taiwan/theme/concert/hot.html"

# Date format on this page: "M/D" or "M/D．M/D．M/D" (no year)
# The page is curated for the current year; infer year from today.
def _colatour_date(raw: str) -> str:
    """
    Convert Colatour's "M/D" or "M/D．M/D" format to "YYYY/MM/DD".
    Uses current year; if the resulting date is already past, bump to next year.
    Multi-day shows: use the first date; append "–DD" for the last day.
    """
    today = date.today()
    # "4/25．4/26．4/27" → split on "．" first, then parse each "M/D"
    parts = [p.strip() for p in re.split(r'[．・]', raw) if p.strip()]
    segments: list[tuple[int, int]] = []
    for p in parts:
        m = re.match(r'^(\d{1,2})[/／](\d{1,2})$', p)
        if m:
            segments.append((int(m.group(1)), int(m.group(2))))
    if not segments:
        return ""
    mo, d = segments[0]
    try:
        year = today.year
        ev = date(year, mo, d)
        if ev < today:
            year += 1
            ev = date(year, mo, d)
        date_str = f"{year}/{mo:02d}/{d:02d}"
        if len(segments) > 1:
            last_d = segments[-1][1]
            date_str += f"–{last_d:02d}"
        return date_str
    except ValueError:
        return ""


def scrape_colatour() -> list[dict]:
    """
    爬取可樂旅遊「2026全台演唱會懶人包」頁面。
    頁面為 SSR，可直接解析 HTML。
    結構: <article class="concert-box">
            <h3 class="concert-name">藝人<span>演唱會名稱</span></h3>
            <div class="concert-date">4/11</div>
            <div class="concert-lacation">台北流行音樂中心表演廳</div>
          </article>
    """
    log("── [可樂旅遊 Colatour] 開始掃描...")
    results: list[dict] = []

    html = fetch(_COLATOUR_URL, timeout=20)
    if not html:
        log("  ✗ 可樂旅遊 無法取得")
        return results

    # Parse each concert-box article
    box_re = re.compile(
        r'<article[^>]+class="concert-box"[^>]*>'
        r'([\s\S]+?)'
        r'</article>',
        re.DOTALL,
    )
    artist_re  = re.compile(r'<h3[^>]+class="concert-name"[^>]*>([^<]+)')
    tour_re    = re.compile(r'<h3[^>]+class="concert-name"[^>]*>[^<]*<span>([^<]+)</span>')
    date_re    = re.compile(r'<div[^>]+class="concert-date"[^>]*>([^<]+)</div>')
    venue_re   = re.compile(r'<div[^>]+class="concert-lacation"[^>]*>([^<]+)</div>')
    img_re     = re.compile(r'<img[^>]+src="([^"]+)"', re.IGNORECASE)
    # 可樂旅遊頁面整頁文字，用於全頁 sale_start_at 萃取
    full_page_text = clean(strip_tags(html))

    seen: set[str] = set()
    for m in box_re.finditer(html):
        inner = m.group(1)

        artist_m = artist_re.search(inner)
        artist = clean(html_lib.unescape(artist_m.group(1))) if artist_m else ""
        if not artist or len(artist) < 2:
            continue

        tour_m = tour_re.search(inner)
        tour_zh = clean(html_lib.unescape(tour_m.group(1))) if tour_m else f"{artist} 演唱會"
        tour_zh = tour_zh[:60]

        date_m = date_re.search(inner)
        raw_date = date_m.group(1).strip() if date_m else ""
        date_str = _colatour_date(raw_date)
        if not date_str or not is_future_date(date_str):
            continue

        venue_m = venue_re.search(inner)
        raw_venue = clean(html_lib.unescape(venue_m.group(1))) if venue_m else ""

        img_m = img_re.search(inner)
        image_url: str | None = None
        if img_m:
            src = img_m.group(1)
            if src.startswith("http"):
                image_url = src
            elif src.startswith("/"):
                image_url = "https://www.colatour.com.tw" + src

        dedup_key = f"{artist.lower()}|{date_str}"
        if dedup_key in seen:
            continue
        seen.add(dedup_key)

        city_zh, city_en, venue_zh, venue_en = resolve_venue(raw_venue, raw_venue)
        genre = classify_genre(artist, tour_zh)

        # 嘗試從 concert-box 的 HTML 片段解析售票時間
        box_text = clean(strip_tags(inner))
        sale_start_at = parse_sale_start(box_text)

        # 若 box 內無售票時間，嘗試從整頁找藝人名稱附近的售票時間
        if not sale_start_at:
            # 在全頁文字中找含有藝人名稱的上下文區塊（前後 200 字元）
            idx = full_page_text.lower().find(artist.lower())
            if idx >= 0:
                ctx = full_page_text[max(0, idx - 50):idx + 250]
                sale_start_at = parse_sale_start(ctx)

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
            "platform":     "可樂旅遊",
            "platform_url": _COLATOUR_URL,
            "genre":        genre,
            "image_url":    image_url,
            "sale_start_at": sale_start_at,
            "source":       "colatour",
        })

    log(f"  → 找到 {len(results)} 個活動")
    return results


# ─────────────────────────────────────────────────────────────────────────────
# Source 6: Bandsintown — bandsintown.com/c/taipei-taiwan ✅
# ─────────────────────────────────────────────────────────────────────────────

def _bit_og_image(slug_path: str) -> str | None:
    """
    抓取單一 Bandsintown 活動頁面的 og:image。
    用於 listing 頁無法取得圖片時的備用方案（限量呼叫）。
    """
    event_html = fetch(
        "https://www.bandsintown.com" + slug_path,
        timeout=15,
        referer="https://www.bandsintown.com/c/taipei-taiwan",
    )
    if not event_html:
        return None
    # og:image
    m = re.search(
        r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']',
        event_html,
    )
    if not m:
        m = re.search(
            r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']',
            event_html,
        )
    if m:
        img = m.group(1).strip()
        if img.startswith("http") and not any(b in img for b in ("favicon", "logo", "icon")):
            return img
    # photos.bandsintown.com fallback
    imgs = re.findall(
        r'https?://(?:photos\.bandsintown\.com|s3\.amazonaws\.com/bit-photos)'
        r'/[^"\s\'<>]+\.(?:jpg|jpeg|png|webp)',
        event_html,
    )
    return imgs[0] if imgs else None


def scrape_bandsintown_taipei(fetch_event_images: int = 30) -> list[dict]:
    """
    爬取 Bandsintown 台北演唱會列表頁面。
    URL 格式: /e/{id}-{artist-slug}-at-{venue-slug}
    日期從 <time datetime="..."> 標籤取得。
    圖片策略:
      1. 從 listing 頁面直接提取 Bandsintown CDN 圖片（依序對齊活動）
      2. 若 listing 取不到，個別抓 og:image（限 fetch_event_images 個活動）
    """
    log("── [Bandsintown] 開始掃描台北場次...")
    results: list[dict] = []

    url = "https://www.bandsintown.com/c/taipei-taiwan?came_from=webapp&sort=eventdate"
    html = fetch(url, timeout=30)
    if not html:
        log("  ✗ Bandsintown 無法取得")
        return results

    # Find all event links: /e/{id}-{slug}-at-{venue}
    event_links = list(dict.fromkeys(
        re.findall(r'href="(/e/[^"?#]+)"', html)
    ))
    log(f"  → 找到 {len(event_links)} 個 event link")

    # Get all datetime tags from the page (aligned with events)
    time_tags = re.findall(r'<time[^>]+datetime="([^"]+)"', html)

    # Extract Bandsintown CDN images from listing page (aligned by position)
    _BIT_IMG_RE = re.compile(
        r'https?://(?:photos\.bandsintown\.com|s3\.amazonaws\.com/bit-photos|'
        r'assets\.bandsintown\.com)[^"\s\'<>]+\.(?:jpg|jpeg|png|webp)',
        re.IGNORECASE,
    )
    listing_imgs = _BIT_IMG_RE.findall(html)
    # Also grab any large images embedded in srcset / data-src
    srcset_imgs = re.findall(
        r'(?:src|data-src|srcset)=["\']([^"\']+bandsintown[^"\']+\.(?:jpg|jpeg|png|webp))["\']',
        html, re.IGNORECASE,
    )
    listing_imgs = list(dict.fromkeys(listing_imgs + srcset_imgs))
    log(f"  → listing 頁面找到 {len(listing_imgs)} 張圖片")

    seen: set[str] = set()
    img_fetch_count = 0

    for i, slug_path in enumerate(event_links):
        # slug_path: /e/1234567890-artist-name-at-venue-name
        m = re.match(r'/e/\d+-(.+?)-at-(.+)$', slug_path)
        if not m:
            continue

        artist_slug = m.group(1)
        venue_slug = m.group(2)

        # Convert slug to readable name (e.g. "the-1975" → "The 1975")
        artist = " ".join(
            (w.upper() if len(w) <= 2 else w.capitalize())
            for w in artist_slug.split("-")
        )
        venue_raw = " ".join(w.capitalize() for w in venue_slug.split("-"))

        # Get date from time tag at corresponding index
        date_str = ""
        if i < len(time_tags):
            dm = re.match(r'(20\d{2})-(\d{2})-(\d{2})', time_tags[i])
            if dm:
                date_str = f"{dm.group(1)}/{dm.group(2)}/{dm.group(3)}"

        if not date_str:
            continue
        if not is_future_date(date_str):
            continue

        dedup_key = f"{artist_slug}|{date_str}"
        if dedup_key in seen:
            continue
        seen.add(dedup_key)

        # ── Image: try listing first, then per-event fetch ────────────────
        image_url: str | None = listing_imgs[i] if i < len(listing_imgs) else None
        if not image_url and img_fetch_count < fetch_event_images:
            time.sleep(1.0)
            image_url = _bit_og_image(slug_path)
            img_fetch_count += 1

        # Resolve venue — add "taipei" hint for fallback city detection
        city_zh, city_en, venue_zh, venue_en = resolve_venue(
            venue_raw, venue_raw + " taipei 台北"
        )
        genre = classify_genre(artist, artist_slug)

        results.append({
            "artist":       artist,
            "date_str":     date_str,
            "city_zh":      city_zh,
            "city_en":      city_en,
            "venue_zh":     venue_zh,
            "venue_en":     venue_en,
            "tour_zh":      f"{artist} 演唱會",
            "tour_en":      f"{artist} Live",
            "price_zh":     "票價待公布",
            "price_en":     "TBA",
            "platform":     "Bandsintown",
            "platform_url": "https://www.bandsintown.com" + slug_path,
            "genre":        genre,
            "image_url":    image_url,
            "source":       "bandsintown",
        })

    imgs_got = sum(1 for r in results if r["image_url"])
    log(f"  → 解析出 {len(results)} 個活動，其中 {imgs_got} 個取得圖片")
    return results


# ─────────────────────────────────────────────────────────────────────────────
# Source 6: LIVE王 Facebook — facebook.com/LIVEKINGisLife ✅
# ─────────────────────────────────────────────────────────────────────────────

_LIVEKING_PINNED_URL = (
    "https://mbasic.facebook.com/LIVEKINGisLife/posts/"
    "pfbid0rqzJZwF1N5QHbw2SoKbPGn8cseREhmnW7RXHqVnRgY8MiW3gCGw4wCkffaCXHpYcl"
)
_LIVEKING_PAGE_URL = "https://mbasic.facebook.com/LIVEKINGisLife/"


def _og_image_from_url(page_url: str, referer: str = "") -> str | None:
    """從任意網頁抓取 og:image meta tag 的圖片 URL。"""
    _bad = ("favicon", "logo", "icon", "sprite", "apple-touch")
    html = fetch(page_url, timeout=20, referer=referer)
    if not html:
        return None
    for pat in (
        r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']',
        r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']',
    ):
        m = re.search(pat, html)
        if m:
            img = html_lib.unescape(m.group(1)).strip()
            if img.startswith("http") and not any(b in img.lower() for b in _bad):
                return img
    return None


def scrape_liveking_fb(fetch_ticket_images: int = 20) -> list[dict]:
    """
    嘗試爬取 LIVE王 Facebook 頁面的演唱會整理資訊。
    使用 mbasic.facebook.com（行動基本版）繞過部分登入限制。
    若無法取得，優雅地回傳空列表。

    圖片策略:
      1. 從售票頁（tixcraft / kktix 等）抓 og:image（最多 fetch_ticket_images 次）
      2. Fallback: mbasic.facebook.com 頁面的 og:image（整個貼文圖）
    """
    log("── [LIVE王 FB] 開始掃描...")
    results: list[dict] = []

    html = None
    for try_url in [_LIVEKING_PINNED_URL, _LIVEKING_PAGE_URL]:
        html = fetch(try_url, timeout=25)
        if html and len(html) > 500:
            break

    if not html:
        log("  ✗ LIVE王 FB 無法取得（可能需要登入）")
        return results

    text = clean(strip_tags(html))

    # Login wall check — mbasic often returns a short redirect page
    if len(text) < 300 or any(kw in text[:300] for kw in ("登入", "Log in", "log in")):
        log("  ✗ LIVE王 FB 被重定向至登入頁，跳過")
        return results

    log(f"  → 取得 {len(text)} 字元")

    # Fallback image: og:image of the FB post/page itself
    _bad_fb = ("facebook.com/images", "favicon", "logo")
    fb_post_img: str | None = None
    for pat in (
        r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']',
        r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']',
    ):
        m = re.search(pat, html)
        if m:
            img = html_lib.unescape(m.group(1)).strip()
            if img.startswith("http") and not any(b in img for b in _bad_fb):
                fb_post_img = img
                break

    # Also extract <img> tags from the mbasic HTML (often has photo thumbnails)
    fb_imgs = [
        u for u in re.findall(r'<img[^>]+src=["\']([^"\']+)["\']', html)
        if u.startswith("http") and "scontent" in u  # Facebook CDN
        and not any(b in u for b in ("emoji", "favicon", "logo", "icon", "s32x32", "s16x16"))
    ]

    # Split text into blocks on common list markers used by LIVE王
    blocks = re.split(
        r'(?=(?:🔴|●|◆|\d{1,2}[\.、]|[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]))',
        text,
    )

    seen: set[str] = set()
    ticket_img_count = 0

    for idx, block in enumerate(blocks):
        if len(block) < 20:
            continue

        # Must contain a future date
        dates = parse_dates(block)
        if not dates:
            continue
        date_str = next((d for d in dates if is_future_date(d)), None)
        if not date_str:
            continue

        # Find artist name: first non-date, non-URL, non-empty line in block
        artist = ""
        for line in [l.strip() for l in block.split("\n") if l.strip()][:5]:
            if re.search(r'https?://', line):
                continue
            if re.match(r'^20\d{2}', line):
                continue
            line = re.sub(r'^[🔴●◆①-⑳\d]+[\.、]?\s*', '', line).strip()
            line = re.sub(r'^[\s\U0001F300-\U0001F9FF]+', '', line).strip()
            if len(line) >= 2:
                artist = line[:60]
                break

        if not artist:
            continue

        # Find venue
        venue_m = re.findall(
            r'(?:台北|臺北|高雄|台中|林口|桃園|新北|台南)[^\s，,。\n]{0,30}'
            r'(?:巨蛋|小巨蛋|大巨蛋|體育館|場館|Arena|arena|劇場|公園|藝術特區|展覽館)',
            block,
        )
        raw_venue = venue_m[0] if venue_m else ""

        # Find ticket URL
        ticket_m = re.search(
            r'(https?://(?:tixcraft|kktix|ibon|ticket\.com|tickets\.udnfunlife'
            r'|ticketmaster|indievox)[^\s\n,，]+)',
            block, re.IGNORECASE,
        )
        platform_url = (
            ticket_m.group(1)
            if ticket_m
            else "https://www.facebook.com/LIVEKINGisLife/"
        )

        # Map domain → platform name
        platform = "待公布"
        if ticket_m:
            pu = ticket_m.group(1).lower()
            if "tixcraft" in pu:
                platform = "Tixcraft 拓元售票"
            elif "kktix" in pu:
                platform = "KKTIX"
            elif "ibon" in pu:
                platform = "ibon"
            elif "ticket.com" in pu:
                platform = "年代售票"
            elif "ticketmaster" in pu:
                platform = "Ticketmaster"
            elif "indievox" in pu:
                platform = "Indievox"
            else:
                platform = "售票平台"

        dedup_key = f"{artist.lower()}|{date_str}"
        if dedup_key in seen:
            continue
        seen.add(dedup_key)

        # ── Image: ticket page og:image → FB scontent photo → FB post og:image ──
        image_url: str | None = None
        if ticket_m and ticket_img_count < fetch_ticket_images:
            time.sleep(1.2)
            image_url = _og_image_from_url(
                ticket_m.group(1),
                referer="https://www.facebook.com/",
            )
            ticket_img_count += 1
        if not image_url and idx < len(fb_imgs):
            image_url = fb_imgs[idx]
        if not image_url:
            image_url = fb_post_img  # use the post's own image as last resort

        city_zh, city_en, venue_zh, venue_en = resolve_venue(raw_venue, block)
        genre = classify_genre(artist, block[:200])

        results.append({
            "artist":       artist,
            "date_str":     date_str,
            "city_zh":      city_zh,
            "city_en":      city_en,
            "venue_zh":     venue_zh,
            "venue_en":     venue_en,
            "tour_zh":      f"{artist} 演唱會",
            "tour_en":      f"{artist} Concert",
            "price_zh":     "待公布",
            "price_en":     "TBA",
            "platform":     platform,
            "platform_url": platform_url,
            "genre":        genre,
            "image_url":    image_url,
            "sale_start_at": parse_sale_start(block),
            "source":       "liveking_fb",
        })

    imgs_got = sum(1 for r in results if r["image_url"])
    log(f"  → 解析出 {len(results)} 個活動，其中 {imgs_got} 個取得圖片")
    return results


# ─────────────────────────────────────────────────────────────────────────────
# NEW Source: 寬宏售票 Kham — kham.com.tw
# ─────────────────────────────────────────────────────────────────────────────

def scrape_kham() -> list[dict]:
    """
    爬取寬宏售票 kham.com.tw 活動列表。
    與年代售票相同的 ASP.NET UTK 系統：
      列表頁: /application/utk01/UTK0101_03.aspx
      詳情頁: /application/UTK02/UTK0201_.aspx?PRODUCT_ID=PXXXXXXXX
    """
    log("── [寬宏售票 Kham] 開始掃描...")
    results: list[dict] = []

    _KHAM_BASE = "https://kham.com.tw"
    html = fetch(f"{_KHAM_BASE}/application/utk01/UTK0101_03.aspx", timeout=20,
                 referer=_KHAM_BASE + "/")
    if not html:
        log("  ✗ 寬宏售票 無法取得")
        return results

    # 抓所有 PRODUCT_ID（同年代售票格式）
    prod_ids = list(dict.fromkeys(re.findall(r'PRODUCT_ID=([A-Z0-9]+)', html)))
    log(f"  找到 {len(prod_ids)} 個 Product ID")

    for pid in prod_ids[:20]:
        time.sleep(1.2)
        url = f"{_KHAM_BASE}/application/UTK02/UTK0201_.aspx?PRODUCT_ID={pid}"
        detail_html = fetch(url, referer=f"{_KHAM_BASE}/application/utk01/UTK0101_03.aspx")
        if not detail_html:
            continue
        parsed = _parse_kham_detail(url, detail_html)
        if parsed:
            results.append(parsed)

    log(f"  → 找到 {len(results)} 個活動")
    return results


def _parse_kham_detail(url: str, html: str) -> dict | None:
    text = clean(strip_tags(html))

    # Require future date
    dates = parse_dates(text)
    if not dates:
        return None
    date_str = next((d for d in dates if is_future_date(d)), None)
    if not date_str:
        return None

    # Must be Taiwan concert
    has_tw = any(k in text.lower() for k in TW_KEYWORDS)
    has_concert = any(k in text.lower() for k in CONCERT_KEYWORDS)
    if not (has_tw and has_concert):
        return None

    # Title from og:title → <title> → <h1>/<h2>
    title = ""
    og_title = re.search(r'<meta[^>]+property=["\']og:title["\'][^>]+content=["\']([^"\']+)["\']', html)
    if og_title:
        title = clean(html_lib.unescape(og_title.group(1)))
    if not title:
        title_m = re.search(r'<title[^>]*>(.*?)</title>', html, re.DOTALL)
        title = clean(strip_tags(title_m.group(1))) if title_m else ""
    # Strip site name suffix/prefix
    title = re.sub(r'\s*[-|｜]\s*寬宏.*$', '', title).strip()
    title = re.sub(r'^寬宏\s*[|｜]\s*', '', title).strip()
    # If title is still the site name (og:title returned only "寬宏售票系統"), fall back to H1/H2
    _KHAM_SITE_NAMES = {'寬宏售票系統', '寬宏售票', 'kham', 'kham.com.tw'}
    if not title or title.lower() in _KHAM_SITE_NAMES:
        h1_m = re.search(r'<h1[^>]*>(.*?)</h1>', html, re.DOTALL | re.IGNORECASE)
        h2_m = re.search(r'<h2[^>]*>(.*?)</h2>', html, re.DOTALL | re.IGNORECASE)
        for m in [h1_m, h2_m]:
            if m:
                candidate = clean(strip_tags(m.group(1)))
                candidate = re.sub(r'\s*[-|｜]\s*寬宏.*$', '', candidate).strip()
                if candidate and len(candidate) >= 3 and candidate.lower() not in _KHAM_SITE_NAMES:
                    title = candidate
                    break
    if not title or title.lower() in _KHAM_SITE_NAMES:
        return None  # 無法抓到有意義的標題，跳過此活動

    # Venue: look for 台北/高雄/台中 + venue keyword
    venues = re.findall(
        r'(?:台北|臺北|高雄|台中|林口|新北|桃園)[^\s，,。\n]{0,30}'
        r'(?:巨蛋|小巨蛋|大巨蛋|體育館|場館|劇場|音樂中心|文化中心|展覽館|藝文中心)',
        text,
    )
    raw_venue = venues[0] if venues else ""

    # og:image
    og_img = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', html)
    if not og_img:
        og_img = re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']', html)
    image_url = og_img.group(1) if og_img else None

    # Prices
    prices = re.findall(r'NT\$\s?[\d,]+', text)
    price_str = prices[0].strip()[:40] if prices else "票價待公布"

    # Artist
    artist_m = re.match(
        r'^(.+?)\s+(?=.*(?:演唱會|巡演|Concert|Tour|LIVE|音樂會))',
        title, re.IGNORECASE
    )
    artist = artist_m.group(1).strip() if artist_m else (_extract_artist_from_title(title) or title[:40])

    city_zh, city_en, venue_zh, venue_en = resolve_venue(raw_venue, text)
    genre = classify_genre(artist, text[:400])

    return {
        "artist": artist, "date_str": date_str,
        "city_zh": city_zh, "city_en": city_en,
        "venue_zh": venue_zh, "venue_en": venue_en,
        "tour_zh": title[:60], "tour_en": title[:60],
        "price_zh": price_str,
        "price_en": price_str if re.search(r'[a-zA-Z]', price_str) else "TBA",
        "platform": "寬宏售票 Kham",
        "platform_url": url,
        "genre": genre, "image_url": image_url,
        "sale_start_at": parse_sale_start(text), "source": "kham",
    }


# ─────────────────────────────────────────────────────────────────────────────
# NEW Source: 遠大售票 Ticket Plus — ticketplus.com.tw
# ─────────────────────────────────────────────────────────────────────────────

def scrape_ticketplus() -> list[dict]:
    """
    爬取 Ticket Plus 遠大售票系統活動列表。
      列表頁: https://ticketplus.com.tw/eventlist.html  （React SPA；activity ID 嵌於 HTML/JSON）
      活動頁: https://ticketplus.com.tw/activity/{32-char hex}

    策略：
      1. 抓 eventlist.html，從原始 HTML 或 __NEXT_DATA__ / window.__initialState 等
         embedded JSON 中找出所有 activity ID（32 位 hex）。
      2. 若 eventlist 失敗或零 ID，改抓首頁並同樣掃描。
      3. 對每個 activity 頁抓 og:title / og:image 等 meta tag（Next.js SSR 會輸出這些）。
    """
    log("── [遠大售票 Ticket Plus] 開始掃描...")
    results: list[dict] = []
    BASE = "https://ticketplus.com.tw"

    # ── Step 1: 收集 activity ID ──────────────────────────────────────────────
    activity_ids: list[str] = []

    for list_url in [
        f"{BASE}/eventlist.html",
        f"{BASE}/",
    ]:
        html = fetch(list_url, timeout=25, referer=BASE + "/")
        if not html:
            continue

        # 從 href="/activity/xxx" 或 "activity/xxx" 直接抓
        ids = re.findall(r'/activity/([0-9a-f]{32})', html)
        # 也找純 32-char hex（可能在 JSON 裡）
        if not ids:
            ids = re.findall(r'"([0-9a-f]{32})"', html)

        activity_ids = list(dict.fromkeys(ids))
        if activity_ids:
            log(f"  從 {list_url} 找到 {len(activity_ids)} 個 activity ID")
            break

    if not activity_ids:
        log("  ⚠️  eventlist 頁面可能需要完整 JS 渲染，未找到 activity ID")
        return results

    # ── Step 2: 抓各活動詳情頁 ───────────────────────────────────────────────
    for aid in activity_ids[:25]:
        time.sleep(1.2)
        url = f"{BASE}/activity/{aid}"
        detail_html = fetch(url, timeout=20, referer=f"{BASE}/eventlist.html")
        if not detail_html:
            continue
        parsed = _parse_ticketplus_detail(url, detail_html)
        if parsed:
            results.append(parsed)

    log(f"  → 找到 {len(results)} 個活動")
    return results


def _parse_ticketplus_detail(url: str, html: str) -> dict | None:
    text = clean(strip_tags(html))

    # ── 日期 ──────────────────────────────────────────────────────────────────
    dates = parse_dates(text)
    if not dates:
        return None
    date_str = next((d for d in dates if is_future_date(d)), None)
    if not date_str:
        return None

    # ── 台灣演唱會關鍵字 ──────────────────────────────────────────────────────
    has_tw = any(k in text.lower() for k in TW_KEYWORDS)
    has_concert = any(k in text.lower() for k in CONCERT_KEYWORDS)
    if not (has_tw and has_concert):
        return None

    # ── 標題（og:title → <title>；去掉「Ticket Plus」後綴）───────────────────
    title = ""
    og_title_m = re.search(
        r'<meta[^>]+property=["\']og:title["\'][^>]+content=["\']([^"\']+)["\']', html)
    if not og_title_m:
        og_title_m = re.search(
            r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:title["\']', html)
    if og_title_m:
        title = clean(html_lib.unescape(og_title_m.group(1)))
    if not title:
        title_m = re.search(r'<title[^>]*>(.*?)</title>', html, re.DOTALL)
        title = clean(strip_tags(title_m.group(1))) if title_m else ""
    # 去掉 "Ticket Plus | " 或 " - 遠大售票系統" 等包裝
    title = re.sub(r'\s*[-|｜]\s*(?:Ticket\s*Plus|遠大售票(?:系統)?).*$', '',
                   title, flags=re.IGNORECASE).strip()
    title = re.sub(r'^(?:Ticket\s*Plus|遠大售票(?:系統)?)\s*[|｜\-]\s*', '',
                   title, flags=re.IGNORECASE).strip()

    if not title or is_bad_title(title):
        return None

    # ── 海報圖 ────────────────────────────────────────────────────────────────
    og_img_m = re.search(
        r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', html)
    if not og_img_m:
        og_img_m = re.search(
            r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']', html)
    image_url = og_img_m.group(1) if og_img_m else None

    # ── 場館 ──────────────────────────────────────────────────────────────────
    venues = re.findall(
        r'(?:台北|臺北|高雄|台中|林口|新北|桃園)[^\s，,。\n]{0,30}'
        r'(?:巨蛋|小巨蛋|大巨蛋|體育館|場館|劇場|音樂中心|展覽館|藝文中心|文化中心)',
        text,
    )
    raw_venue = venues[0] if venues else ""
    city_zh, city_en, venue_zh, venue_en = resolve_venue(raw_venue, text)

    # ── 票價 ─────────────────────────────────────────────────────────────────
    prices = re.findall(r'NT\$\s?[\d,]+', text)
    price_str = prices[0].strip()[:40] if prices else "票價待公布"

    # ── 表演者 ────────────────────────────────────────────────────────────────
    artist_m = re.match(
        r'^(.+?)\s+(?=.*(?:演唱會|巡演|Concert|Tour|LIVE|音樂會))',
        title, re.IGNORECASE,
    )
    artist = (artist_m.group(1).strip()
              if artist_m
              else (_extract_artist_from_title(title) or title[:40]))
    genre = classify_genre(artist, text[:400])

    return {
        "artist":       artist,
        "date_str":     date_str,
        "city_zh":      city_zh,   "city_en":  city_en,
        "venue_zh":     venue_zh,  "venue_en": venue_en,
        "tour_zh":      title[:60], "tour_en": title[:60],
        "price_zh":     price_str,
        "price_en":     price_str if re.search(r'[a-zA-Z]', price_str) else "TBA",
        "platform":     "遠大售票 Ticket Plus",
        "platform_url": url,
        "genre":        genre,
        "image_url":    image_url,
        "sale_start_at": parse_sale_start(text),
        "source":       "ticketplus",
    }


# ─────────────────────────────────────────────────────────────────────────────
# NEW Source: iNDIEVOX — indievox.com (獨立音樂/Live House 票券)
# ─────────────────────────────────────────────────────────────────────────────

def scrape_indievox() -> list[dict]:
    """
    爬取 iNDIEVOX 活動列表 (indievox.com/activity)。
    個別活動頁: /activity/detail/26_ivXXXXXXX
    """
    log("── [iNDIEVOX] 開始掃描...")
    results: list[dict] = []

    html = fetch("https://www.indievox.com/activity", timeout=20,
                 referer="https://www.indievox.com/")
    if not html:
        # 首頁也有近期活動列表
        html = fetch("https://www.indievox.com/", timeout=20)
    if not html:
        log("  ✗ iNDIEVOX 無法取得")
        return results

    # 抓活動詳情頁連結 /activity/detail/XX_ivXXXXXXX
    event_paths = list(dict.fromkeys(re.findall(
        r'href="(/activity/detail/[^"]+)"', html
    )))
    # 也抓 Legacy 等場館頁面嵌入的 iNDIEVOX 連結（完整 URL 格式）
    event_paths += [
        "/" + u
        for u in re.findall(r'https://www\.indievox\.com/(activity/detail/[^"\']+)', html)
        if "/" + u not in event_paths
    ]

    log(f"  找到 {len(event_paths)} 個活動連結")

    for path in event_paths[:20]:
        url = "https://www.indievox.com" + path
        time.sleep(1.0)
        detail_html = fetch(url, referer="https://www.indievox.com/activity")
        if not detail_html:
            continue
        parsed = _parse_indievox_event(url, detail_html)
        if parsed:
            results.append(parsed)

    log(f"  → 找到 {len(results)} 個活動")
    return results


def _detect_free_event(text: str) -> tuple[bool, str, str]:
    """從頁面文字判斷是否為免費活動。
    回傳 (is_free, price_zh, price_en)。
    """
    # 明確免費訊號
    free_patterns = [
        r'免費(?:入場|參加|觀賞|聆聽|報名|索票|活動)?',
        r'FREE\s*(?:ADMISSION|ENTRY|EVENT|SHOW)?',
        r'(?:NT\$|NTD|TWD)\s*0(?:[^.\d]|$)',
        r'票價[：:]\s*0',
        r'無票價',
        r'不(?:需|用)(?:購票|買票|售票)',
    ]
    for pat in free_patterns:
        if re.search(pat, text, re.IGNORECASE):
            return True, "免費", "Free"

    # 有明確票價 → 非免費
    if re.search(r'NT\$\s*[1-9][\d,]+', text):
        prices = re.findall(r"NT\$\s?[\d,]+(?:[^元\n]{0,30})?", text)
        price_str = prices[0].strip()[:40] if prices else "票價待公布"
        return False, price_str, price_str

    return False, "票價待公布", "TBA"


def _parse_indievox_event(url: str, html: str) -> dict | None:
    text = clean(strip_tags(html))

    # JSON-LD first
    for block in re.findall(r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', html, re.DOTALL):
        try:
            data = json.loads(block)
            if isinstance(data, list):
                data = data[0]
            if data.get("@type") in ("MusicEvent", "Event"):
                name = data.get("name", "")
                start = data.get("startDate", "")
                dates = parse_dates(start or text)
                if not dates:
                    continue
                date_str = next((d for d in dates if is_future_date(d)), None)
                if not date_str:
                    continue
                location = data.get("location", {})
                raw_venue = location.get("name", "") if isinstance(location, dict) else ""
                city_zh, city_en, venue_zh, venue_en = resolve_venue(raw_venue, text)
                og_img = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', html)
                if not og_img:
                    og_img = re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']', html)
                image_url = og_img.group(1) if og_img else None
                # 清除標題開頭的日期前綴，如 "2026/04/25（六）" 或 "2026-04-25(六) "
                name = re.sub(
                    r'^20\d{2}[-/]\d{2}[-/]\d{2}[\(（【]?[^)）】\s]{0,10}[\)）】]?\s*',
                    '', name
                ).strip()
                artist = _extract_artist_from_title(name) or name[:40]
                genre = classify_genre(artist, text[:400])
                is_free, price_zh, price_en = _detect_free_event(text)
                status = "free" if is_free else "selling"
                return {
                    "artist": artist, "date_str": date_str,
                    "city_zh": city_zh, "city_en": city_en,
                    "venue_zh": venue_zh, "venue_en": venue_en,
                    "tour_zh": name[:60], "tour_en": name[:60],
                    "price_zh": price_zh, "price_en": price_en,
                    "status": status,
                    "platform": "iNDIEVOX",
                    "platform_url": url,
                    "genre": genre, "image_url": image_url,
                    "sale_start_at": None if is_free else parse_sale_start(text),
                    "source": "indievox",
                }
        except (json.JSONDecodeError, KeyError):
            continue

    # HTML fallback
    dates = parse_dates(text)
    if not dates:
        return None
    date_str = next((d for d in dates if is_future_date(d)), None)
    if not date_str:
        return None

    og_title = re.search(r'<meta[^>]+property=["\']og:title["\'][^>]+content=["\']([^"\']+)["\']', html)
    title = clean(html_lib.unescape(og_title.group(1))) if og_title else ""
    if not title:
        t_m = re.search(r'<title[^>]*>(.*?)</title>', html, re.DOTALL)
        title = clean(strip_tags(t_m.group(1))) if t_m else ""
    title = re.sub(r'\s*[-|]\s*iNDIEVOX.*$', '', title, flags=re.IGNORECASE).strip()

    venues = re.findall(
        r'(?:台北|臺北|高雄|台中|林口|新北)[^\s，,。\n]{0,30}'
        r'(?:Legacy|The Wall|PIPE|live\s*house|藝文|音樂|展演|劇場)',
        text, re.IGNORECASE,
    )
    raw_venue = venues[0] if venues else ""

    og_img = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', html)
    if not og_img:
        og_img = re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']', html)
    image_url = og_img.group(1) if og_img else None

    artist = _extract_artist_from_title(title) or title[:40]
    city_zh, city_en, venue_zh, venue_en = resolve_venue(raw_venue, text)
    genre = classify_genre(artist, text[:400])
    is_free, price_zh, price_en = _detect_free_event(text)
    status = "free" if is_free else "selling"

    return {
        "artist": artist, "date_str": date_str,
        "city_zh": city_zh, "city_en": city_en,
        "venue_zh": venue_zh, "venue_en": venue_en,
        "tour_zh": title[:60], "tour_en": title[:60],
        "price_zh": price_zh, "price_en": price_en,
        "status": status,
        "platform": "iNDIEVOX",
        "platform_url": url,
        "genre": genre, "image_url": image_url,
        "sale_start_at": None if is_free else parse_sale_start(text),
        "source": "indievox",
    }


# ─────────────────────────────────────────────────────────────────────────────
# NEW Source: Accupass 活動通 — 免費音樂活動
# ─────────────────────────────────────────────────────────────────────────────

def scrape_accupass_free() -> list[dict]:
    """
    爬取 Accupass 活動通的免費音樂活動。
    使用 range=free 參數過濾，搭配 music 類別。
    URL 範例: https://www.accupass.com/event/search?q=音樂&range=free
    備用 URL:  https://www.accupass.com/event/search?q=演唱會&range=free
    """
    log("── [Accupass] 開始掃描免費音樂活動...")
    results: list[dict] = []

    _BASE = "https://www.accupass.com"
    _SEARCH_URLS = [
        f"{_BASE}/event/search?q=%E9%9F%B3%E6%A8%82&range=free",   # 音樂
        f"{_BASE}/event/search?q=%E6%BC%94%E5%94%B1%E6%9C%83&range=free",  # 演唱會
        f"{_BASE}/event/search?q=%E7%8D%A8%E7%AB%8B%E9%9F%B3%E6%A8%82&range=free",  # 獨立音樂
    ]

    seen_urls: set[str] = set()

    for search_url in _SEARCH_URLS:
        time.sleep(1.5)
        html = fetch(search_url, timeout=25, referer=_BASE + "/")
        if not html:
            log(f"  ✗ 無法取得: {search_url}")
            continue

        # 嘗試從頁面中擷取 JSON 資料（Accupass 常在頁面嵌入 JSON 活動列表）
        json_matches = re.findall(
            r'"events"\s*:\s*(\[.*?\])',
            html, re.DOTALL
        )
        if not json_matches:
            # 備用：從 window.__INITIAL_STATE__ 或類似結構取資料
            json_matches = re.findall(
                r'window\.__(?:INITIAL_STATE|data)__\s*=\s*(\{.*?\});',
                html, re.DOTALL
            )

        # 若有 JSON，解析活動連結
        event_links = []
        for m in json_matches:
            try:
                obj = json.loads(m)
                # 遞迴找 url / link 欄位
                def _extract_links(o: Any) -> list[str]:
                    links = []
                    if isinstance(o, dict):
                        for k, v in o.items():
                            if k in ("url", "link", "href", "eventUrl") and isinstance(v, str) and "accupass" in v:
                                links.append(v)
                            else:
                                links.extend(_extract_links(v))
                    elif isinstance(o, list):
                        for item in o:
                            links.extend(_extract_links(item))
                    return links
                event_links.extend(_extract_links(obj))
            except (json.JSONDecodeError, ValueError):
                pass

        # 備用：直接從 HTML 抓活動頁連結
        if not event_links:
            event_links = re.findall(
                r'href=["\'](' + re.escape(_BASE) + r'/event/\d+[^"\']*)["\']',
                html
            )
            if not event_links:
                event_links = [
                    _BASE + path
                    for path in re.findall(r'href=["\'](/event/\d+[^"\']*)["\']', html)
                ]

        log(f"  找到 {len(event_links)} 個活動連結（來源: {search_url.split('?')[1][:20]}）")

        for link in event_links[:15]:
            # 清理並去重
            link = link.split("?")[0].rstrip("/")
            if link in seen_urls:
                continue
            seen_urls.add(link)

            time.sleep(1.2)
            detail_html = fetch(link, referer=search_url)
            if not detail_html:
                continue

            parsed = _parse_accupass_event(link, detail_html)
            if parsed:
                results.append(parsed)

    log(f"  → 找到 {len(results)} 個免費活動")
    return results


def _parse_accupass_event(url: str, html: str) -> dict | None:
    """解析單一 Accupass 活動頁面。"""
    text = clean(strip_tags(html))

    # 只保留音樂相關活動
    music_keywords = [
        "音樂", "演唱", "concert", "live", "樂團", "歌手", "singer",
        "hip.?hop", "jazz", "搖滾", "民謠", "indie", "band", "dj",
        "festival", "音樂祭", "展演",
    ]
    if not any(re.search(kw, text[:500], re.IGNORECASE) for kw in music_keywords):
        return None

    # JSON-LD
    for block in re.findall(r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', html, re.DOTALL):
        try:
            data = json.loads(block)
            if isinstance(data, list):
                data = data[0]
            if data.get("@type") in ("MusicEvent", "Event"):
                name = data.get("name", "").strip()
                if not name:
                    continue
                start = data.get("startDate", "")
                dates = parse_dates(start or text)
                if not dates:
                    continue
                date_str = next((d for d in dates if is_future_date(d)), None)
                if not date_str:
                    continue

                location = data.get("location", {})
                raw_venue = location.get("name", "") if isinstance(location, dict) else ""
                city_zh, city_en, venue_zh, venue_en = resolve_venue(raw_venue, text)

                og_img = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', html)
                if not og_img:
                    og_img = re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']', html)
                image_url = og_img.group(1) if og_img else None

                artist = _extract_artist_from_title(name) or name[:40]
                genre = classify_genre(artist, text[:400])
                # Accupass 免費活動爬蟲來源即為免費活動
                is_free, price_zh, price_en = _detect_free_event(text)
                # 若偵測不到明確免費但來自免費篩選頁，仍標為 free
                if not is_free:
                    is_free = True
                    price_zh, price_en = "免費", "Free"

                return {
                    "artist": artist, "date_str": date_str,
                    "city_zh": city_zh, "city_en": city_en,
                    "venue_zh": venue_zh, "venue_en": venue_en,
                    "tour_zh": name[:60], "tour_en": name[:60],
                    "price_zh": price_zh, "price_en": price_en,
                    "status": "free",
                    "platform": "Accupass 活動通",
                    "platform_url": url,
                    "genre": genre, "image_url": image_url,
                    "sale_start_at": None,
                    "source": "accupass",
                }
        except (json.JSONDecodeError, KeyError):
            continue

    # HTML fallback
    dates = parse_dates(text)
    if not dates:
        return None
    date_str = next((d for d in dates if is_future_date(d)), None)
    if not date_str:
        return None

    og_title = re.search(r'<meta[^>]+property=["\']og:title["\'][^>]+content=["\']([^"\']+)["\']', html)
    title = clean(html_lib.unescape(og_title.group(1))) if og_title else ""
    if not title:
        t_m = re.search(r'<title[^>]*>(.*?)</title>', html, re.DOTALL)
        title = clean(strip_tags(t_m.group(1))) if t_m else ""
    title = re.sub(r'\s*[-|]\s*[Aa]ccupass.*$', '', title).strip()
    if not title:
        return None

    og_img = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', html)
    if not og_img:
        og_img = re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']', html)
    image_url = og_img.group(1) if og_img else None

    artist = _extract_artist_from_title(title) or title[:40]
    venues = re.findall(
        r'(?:台北|臺北|高雄|台中|林口|新北)[^\s，,。\n]{0,30}'
        r'(?:Live\s*House|藝文|音樂|展演|劇場|廣場|park|公園)',
        text, re.IGNORECASE,
    )
    raw_venue = venues[0] if venues else ""
    city_zh, city_en, venue_zh, venue_en = resolve_venue(raw_venue, text)
    genre = classify_genre(artist, text[:400])

    return {
        "artist": artist, "date_str": date_str,
        "city_zh": city_zh, "city_en": city_en,
        "venue_zh": venue_zh, "venue_en": venue_en,
        "tour_zh": title[:60], "tour_en": title[:60],
        "price_zh": "免費", "price_en": "Free",
        "status": "free",
        "platform": "Accupass 活動通",
        "platform_url": url,
        "genre": genre, "image_url": image_url,
        "sale_start_at": None,
        "source": "accupass",
    }


# ─────────────────────────────────────────────────────────────────────────────
# NEW Source: 台北流行音樂中心 (北流) — tmc.taipei
# ─────────────────────────────────────────────────────────────────────────────

def scrape_tmc_taipei() -> list[dict]:
    """
    爬取台北流行音樂中心活動頁面 tmc.taipei/zh_TW/activities。
    政府網站通常為 SSR，含 JSON-LD 事件資料。
    """
    log("── [北流 tmc.taipei] 開始掃描...")
    results: list[dict] = []

    # 正確域名為 www.tmc.taipei（有 www.）
    # 活動列表: /tw/blog/show?filter=eyJkaXJlY3Rpb24iOiJsYXN0ZXN0In0= ({"direction":"lastest"})
    _TMC_BASE = "https://www.tmc.taipei"
    _TMC_LIST = _TMC_BASE + "/tw/blog/show?filter=eyJkaXJlY3Rpb24iOiJsYXN0ZXN0In0="

    html = fetch(_TMC_LIST, timeout=25, referer=_TMC_BASE + "/")
    if not html:
        html = fetch(_TMC_BASE + "/", timeout=20)
    if not html:
        log("  ✗ 北流 tmc.taipei 無法取得")
        return results

    # 個別活動連結格式: /tw/blog/show/{slug}
    # 連結以 JS 字串形式嵌入（非 href 屬性），需同時比對兩種格式
    slugs = list(dict.fromkeys(re.findall(
        r'/tw/blog/show/([A-Za-z0-9][A-Za-z0-9_-]{2,})', html
    )))
    event_links = [f"/tw/blog/show/{s}" for s in slugs]
    # 篩掉非活動頁面（filter 參數連結等）
    event_links = [l for l in event_links if not l.endswith("/show/")]
    log(f"  找到 {len(event_links)} 個活動連結")

    for path in event_links[:20]:
        url = _TMC_BASE + path
        time.sleep(1.0)
        detail_html = fetch(url, referer=_TMC_LIST)
        if not detail_html:
            continue
        parsed = _parse_venue_event_page(url, detail_html, "台北流行音樂中心 (北流)",
                                          "tmc.taipei", "tmc_taipei",
                                          default_venue="台北流行音樂中心",
                                          default_city="台北")
        if parsed:
            results.append(parsed)

    log(f"  → 找到 {len(results)} 個活動")
    return results


# ─────────────────────────────────────────────────────────────────────────────
# NEW Source: 高雄流行音樂中心 (高流) — kpmc.com.tw
# ─────────────────────────────────────────────────────────────────────────────

def scrape_kpmc() -> list[dict]:
    """
    爬取高雄流行音樂中心活動頁面 kpmc.com.tw/event。
    """
    log("── [高流 kpmc.com.tw] 開始掃描...")
    results: list[dict] = []

    # 正確展演資訊頁: kpmc.com.tw/program/
    # 個別活動連結格式: /program/2026-xxx-MMDD/
    _KPMC_BASE = "https://kpmc.com.tw"
    _KPMC_LIST = _KPMC_BASE + "/program/"

    html = fetch(_KPMC_LIST, timeout=25, referer=_KPMC_BASE + "/")
    if not html:
        log("  ✗ 高流 kpmc.com.tw 無法取得")
        return results

    # 個別活動連結 (slug 格式如 2026-hih-0411)
    # href 可能是完整 URL 或相對路徑，直接抓 slug 再組路徑
    slugs = list(dict.fromkeys(re.findall(
        r'/program/(20\d{2}-[A-Za-z0-9_-]+)', html
    )))
    event_links = [f"/program/{s}" for s in slugs]
    log(f"  找到 {len(event_links)} 個活動連結")

    for path in event_links[:20]:
        url = _KPMC_BASE + path
        time.sleep(1.0)
        detail_html = fetch(url, referer=_KPMC_LIST)
        if not detail_html:
            continue
        parsed = _parse_venue_event_page(url, detail_html, "高雄流行音樂中心 (高流)",
                                          "kpmc.com.tw", "kpmc",
                                          default_venue="高雄流行音樂中心",
                                          default_city="高雄")
        if parsed:
            results.append(parsed)

    log(f"  → 找到 {len(results)} 個活動")
    return results


# ─────────────────────────────────────────────────────────────────────────────
# NEW Source: Legacy Taipei — legacy.com.tw
# ─────────────────────────────────────────────────────────────────────────────

def scrape_legacy() -> list[dict]:
    """
    爬取 Legacy Taipei/台中 活動列表 legacy.com.tw/page/programlist/。
    列表頁直接包含所有活動資訊，無需進入詳情頁。
    HTML 結構：每個活動為 <li><table>...</table></li>
    文字格式：
      {活動標題}
      主辦單位：{xxx}
      演出場地：Legacy XXX
      演出地址：台北市...
      演出日期：2026-MM-DD(day)
    票券連結多為 https://www.indievox.com/activity/detail/26_ivXXXXXX
    支援多頁爬取（每頁10筆，用 per_page 偏移控制）。
    """
    log("── [Legacy] 開始掃描...")
    results: list[dict] = []
    _LEGACY_BASE = "https://www.legacy.com.tw"
    _LEGACY_LIST = _LEGACY_BASE + "/page/programlist/"
    seen: set[str] = set()

    # 爬前3頁（共30筆），per_page 是 offset
    for offset in [0, 10, 20]:
        url = _LEGACY_LIST if offset == 0 else f"{_LEGACY_LIST}?year=&month=&area_id=&per_page={offset}"
        html = fetch(url, timeout=20, referer=_LEGACY_BASE + "/")
        if not html:
            break

        text = clean(strip_tags(html))
        # 每個活動以「演出日期」為分隔點，回頭找上面的標題、場地資訊
        # 格式: {標題} {主辦單位:...} 演出場地：{venue} 演出地址：{addr} 演出日期：YYYY-MM-DD(day)
        blocks = re.split(r'演出日期：', text)
        for i in range(1, len(blocks)):
            # 日期在 blocks[i] 的開頭
            date_m = re.match(r'(20\d{2}-\d{2}-\d{2})', blocks[i].strip())
            if not date_m:
                continue
            raw_date = date_m.group(1).replace("-", "/")
            dates = parse_dates(raw_date)
            if not dates:
                continue
            date_str = dates[0]
            if not is_future_date(date_str):
                continue

            # 從前一個 block 找標題和場地
            prev = blocks[i - 1]
            # 演出場地
            venue_m = re.search(r'演出場地：(Legacy[^\n\r]+)', prev)
            raw_venue = venue_m.group(1).strip() if venue_m else "Legacy Taipei"

            # 演出地址（用來判斷城市）
            addr_m = re.search(r'演出地址：([^\n\r]+)', prev)
            raw_addr = addr_m.group(1).strip() if addr_m else ""

            # 標題：在「主辦單位」之前的最後一段非空文字
            organizer_split = re.split(r'主辦單位：', prev)
            title_block = organizer_split[0].strip() if organizer_split else prev.strip()
            # title_block 因 clean() 展平為單行，可能帶有前一筆活動的日期前綴
            # 例: "2026-05-02(六) 鄭興 2026「來這個星球一陣子」演唱會"
            # → 先把開頭的 YYYY-MM-DD(day) 或 YYYY/MM/DD(day) 去掉
            title_block = re.sub(
                r'^20\d{2}[-/]\d{2}[-/]\d{2}[\(（][^)）]{0,10}[\)）]?\s*',
                '', title_block.strip()
            )
            # 也移除 "YYYY年MM月DD日(day)" 格式
            title_block = re.sub(
                r'^20\d{2}年\d{1,2}月\d{1,2}日[\(（][^)）]{0,10}[\)）]?\s*',
                '', title_block
            )
            # 取最後一個非空行作為標題（跳過 JS/程式碼殘留）
            _JS_PATTERN = re.compile(r'function\s*\(|w\[l\]|gtm\.|<!\[CDATA|{%|var\s+\w')
            title_lines = [
                l.strip() for l in title_block.split("\n")
                if l.strip() and not _JS_PATTERN.search(l)
            ]
            title = title_lines[-1][:80] if title_lines else ""
            if not title or len(title) < 3:
                continue

            dedup_key = f"{title.lower()[:30]}|{date_str}"
            if dedup_key in seen:
                continue
            seen.add(dedup_key)

            # 城市判斷：地址含台中→台中，否則台北
            city_raw = raw_addr + raw_venue
            if "台中" in city_raw:
                city_zh, city_en = "台中", "Taichung"
            else:
                city_zh, city_en = "台北", "Taipei"

            venue_zh = raw_venue.strip()
            venue_en = {"Legacy Taipei": "Legacy Taipei",
                        "Legacy Taichung": "Legacy Taichung",
                        "Legacy TERA": "Legacy TERA",
                        "Legacy MAX": "Legacy MAX",
                        "Legacy mini": "Legacy mini"}.get(
                next((k for k in ["Legacy TERA", "Legacy MAX", "Legacy Taichung", "Legacy mini", "Legacy Taipei"]
                      if k in venue_zh), "Legacy Taipei"), venue_zh)

            # 找票券連結（iNDIEVOX）
            ticket_url = _LEGACY_LIST
            # 從原始 HTML 找對應的 iNDIEVOX 連結
            iv_links = re.findall(r'https://www\.indievox\.com/activity/detail/[^\s"\'<>]+', html)
            if iv_links:
                ticket_url = iv_links[min(i - 1, len(iv_links) - 1)]

            artist = _extract_artist_from_title(title) or title[:40]
            genre = classify_genre(artist, title + " " + raw_venue)

            results.append({
                "artist": artist, "date_str": date_str,
                "city_zh": city_zh, "city_en": city_en,
                "venue_zh": venue_zh, "venue_en": venue_en,
                "tour_zh": title[:60], "tour_en": title[:60],
                "price_zh": "票價待公布", "price_en": "TBA",
                "platform": "Legacy",
                "platform_url": ticket_url,
                "genre": genre, "image_url": None,
                "sale_start_at": None, "source": "legacy",
            })

        if len(results) == 0 and offset == 0:
            break  # 第一頁就空了，不繼續
        time.sleep(1.0)

    log(f"  → 找到 {len(results)} 個活動")
    return results


# ─────────────────────────────────────────────────────────────────────────────
# NEW Source: The Wall Live House — thewalllivehouse.com
# ─────────────────────────────────────────────────────────────────────────────

def scrape_thewall() -> list[dict]:
    """
    爬取 The Wall Live House 活動列表。
    策略（依序嘗試）：
      1. thewall.tw 官方網站（偶發 SSL 526 錯誤）
      2. KKTIX 場館頁面 kktix.com/venues/thewall（偶爾可繞過 Cloudflare）
      3. 搜尋 iNDIEVOX 上 The Wall 相關活動
    """
    log("── [The Wall] 開始掃描...")
    results: list[dict] = []

    html = fetch("https://www.thewall.tw/shows/", timeout=20,
                 referer="https://www.thewall.tw/")
    if not html:
        html = fetch("https://thewall.tw/", timeout=20)
    if not html:
        # 備用：KKTIX 場館頁（有時不觸發 CF 防護）
        log("  → thewall.tw 無法取得，嘗試 KKTIX 場館頁...")
        html = fetch("https://kktix.com/venues/thewall", timeout=20,
                     referer="https://kktix.com/")
    if not html:
        log("  ✗ The Wall 所有來源皆無法取得，暫時跳過")
        return results

    # JSON-LD
    for block in re.findall(r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', html, re.DOTALL):
        try:
            data = json.loads(block)
            events = data if isinstance(data, list) else [data]
            for ev in events:
                if ev.get("@type") not in ("MusicEvent", "Event"):
                    continue
                parsed = _parse_jsonld_event(ev, html, "The Wall Live House", "thewall")
                if parsed:
                    results.append(parsed)
        except (json.JSONDecodeError, KeyError):
            continue

    if results:
        log(f"  → 找到 {len(results)} 個活動 (JSON-LD)")
        return results

    # HTML event links
    event_links = list(dict.fromkeys(re.findall(
        r'href="((?:https://thewalllivehouse\.com)?/(?:shows?|events?|concerts?)/[^"]+)"', html
    )))
    log(f"  找到 {len(event_links)} 個活動連結")

    for path in event_links[:20]:
        url = ("https://thewalllivehouse.com" + path) if path.startswith("/") else path
        time.sleep(1.0)
        detail_html = fetch(url, referer="https://thewalllivehouse.com/shows/")
        if not detail_html:
            continue
        parsed = _parse_venue_event_page(url, detail_html, "The Wall Live House",
                                          "thewalllivehouse.com", "thewall",
                                          default_venue="The Wall Live House",
                                          default_city="台北")
        if parsed:
            results.append(parsed)

    log(f"  → 找到 {len(results)} 個活動")
    return results


# ─────────────────────────────────────────────────────────────────────────────
# NEW Source: PIPE Live Music — pipemusic.com.tw
# ─────────────────────────────────────────────────────────────────────────────

def scrape_pipe() -> list[dict]:
    """
    爬取 PIPE Live Music 活動列表。
    策略（依序嘗試）：
      1. pipemusic.com.tw 官方網站（偶發 DNS 問題）
      2. mbasic.facebook.com/PIPELiveMusic（公開頁面，免登入）
    """
    log("── [PIPE Live Music] 開始掃描...")
    results: list[dict] = []

    html = fetch("https://www.pipemusic.com.tw/event", timeout=15,
                 referer="https://www.pipemusic.com.tw/")
    if not html:
        html = fetch("https://pipemusic.com.tw/", timeout=15)
    if not html:
        # 備用：Facebook 行動基本版（PIPE 以 FB 為主要公告平台）
        log("  → pipemusic.com.tw 無法取得，嘗試 mbasic Facebook...")
        html = fetch("https://mbasic.facebook.com/PIPELiveMusic/", timeout=20)
    if not html:
        log("  ✗ PIPE Live Music 所有來源皆無法取得，暫時跳過")
        return results

    # 若是 Facebook 頁面：check login wall
    if "mbasic.facebook.com" in (html or "") or "facebook" in (html[:200] if html else "").lower():
        text_preview = clean(strip_tags(html))[:400]
        if any(kw in text_preview for kw in ("登入", "Log in", "log in")):
            log("  ✗ PIPE FB 被重定向至登入頁，跳過")
            return results
        # 從 FB 貼文解析活動資訊
        text = clean(strip_tags(html))
        dates = parse_dates(text)
        seen: set[str] = set()
        for date_str in dates:
            if not is_future_date(date_str):
                continue
            idx = text.find(date_str[:7])
            if idx < 0:
                continue
            snippet = text[max(0, idx - 150):idx + 100]
            lines = [l.strip() for l in snippet.split("\n") if l.strip() and len(l.strip()) > 3]
            title = next(
                (l for l in reversed(lines)
                 if not re.match(r'^20\d{2}', l) and not re.search(r'https?://', l)),
                ""
            )
            if not title or len(title) < 3:
                continue
            dedup_key = f"{title.lower()[:25]}|{date_str}"
            if dedup_key in seen:
                continue
            seen.add(dedup_key)
            artist = _extract_artist_from_title(title) or title[:40]
            results.append({
                "artist": artist, "date_str": date_str,
                "city_zh": "台北", "city_en": "Taipei",
                "venue_zh": "PIPE Live Music", "venue_en": "PIPE Live Music",
                "tour_zh": title[:60], "tour_en": title[:60],
                "price_zh": "票價待公布", "price_en": "TBA",
                "platform": "PIPE Live Music",
                "platform_url": "https://www.facebook.com/PIPELiveMusic/",
                "genre": classify_genre(artist, title),
                "image_url": None,
                "sale_start_at": parse_sale_start(snippet),
                "source": "pipe",
            })
        if results:
            log(f"  → 從 Facebook 解析出 {len(results)} 個活動")
            return results

    # JSON-LD
    for block in re.findall(r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', html, re.DOTALL):
        try:
            data = json.loads(block)
            events = data if isinstance(data, list) else [data]
            for ev in events:
                if ev.get("@type") not in ("MusicEvent", "Event"):
                    continue
                parsed = _parse_jsonld_event(ev, html, "PIPE Live Music", "pipe")
                if parsed:
                    results.append(parsed)
        except (json.JSONDecodeError, KeyError):
            continue

    if results:
        log(f"  → 找到 {len(results)} 個活動 (JSON-LD)")
        return results

    # HTML event links
    event_links = list(dict.fromkeys(re.findall(
        r'href="(/event/[^"]+|/shows?/[^"]+)"', html
    )))
    log(f"  找到 {len(event_links)} 個活動連結")

    for path in event_links[:20]:
        url = "https://www.pipemusic.com.tw" + path
        time.sleep(1.0)
        detail_html = fetch(url, referer="https://www.pipemusic.com.tw/event")
        if not detail_html:
            continue
        parsed = _parse_venue_event_page(url, detail_html, "PIPE Live Music",
                                          "pipemusic.com.tw", "pipe",
                                          default_venue="PIPE Live Music",
                                          default_city="台北")
        if parsed:
            results.append(parsed)

    log(f"  → 找到 {len(results)} 個活動")
    return results


# ─────────────────────────────────────────────────────────────────────────────
# NEW Source: NUZONE — nuzone.com.tw
# ─────────────────────────────────────────────────────────────────────────────

def scrape_nuzone() -> list[dict]:
    """
    爬取 NUZONE 演唱會/展演活動列表 nuzone.com.tw/concert。
    """
    log("── [NUZONE] 開始掃描...")
    results: list[dict] = []

    # NUZONE 首頁 https://www.nuzone.com.tw/ 顯示近期活動（無專屬列表頁）
    _NUZONE_BASE = "https://www.nuzone.com.tw"
    html = fetch(_NUZONE_BASE + "/", timeout=20)
    if not html:
        log("  ✗ NUZONE 無法取得")
        return results

    text = clean(strip_tags(html))
    # 首頁有輪播活動文字，嘗試直接從頁面文字解析
    # 格式類似: "{活動名稱}將於YYYY年M月D日於NUZONE展演空間開演"
    # 或: "{活動名稱}將於115年M月D日在NUZONE展演空間進行"
    seen: set[str] = set()

    # 民國年轉西元
    def roc_to_ad(text_chunk: str) -> str:
        return re.sub(
            r'(\d{3})年(\d{1,2})月(\d{1,2})日',
            lambda m: f"{int(m.group(1)) + 1911}/{int(m.group(2)):02d}/{int(m.group(3)):02d}",
            text_chunk,
        )

    text_ad = roc_to_ad(text)
    dates = parse_dates(text_ad)

    for date_str in dates:
        if not is_future_date(date_str):
            continue
        # 找日期前後的活動名稱
        idx = text_ad.find(date_str[:7])  # YYYY/MM
        if idx < 0:
            continue
        snippet = text_ad[max(0, idx - 150):idx + 50]
        # 活動名稱：取最後一個有意義的句子（排除導覽列/UI 殘留文字）
        _NAV_WORDS = {'contact', 'download', 'gallery', 'use tab', '下載', '聯絡', '購票資訊', '部落格', 'more', '更多'}
        lines = [
            l.strip() for l in snippet.split("\n")
            if l.strip() and len(l.strip()) > 3
            and not any(w in l.lower() for w in _NAV_WORDS)
        ]
        title = lines[-1][:60] if lines else ""
        if not title or "NUZONE" in title:
            continue
        dedup_key = f"{title.lower()[:20]}|{date_str}"
        if dedup_key in seen:
            continue
        seen.add(dedup_key)
        artist = _extract_artist_from_title(title) or title[:40]
        genre = classify_genre(artist, title)
        results.append({
            "artist": artist, "date_str": date_str,
            "city_zh": "台北", "city_en": "Taipei",
            "venue_zh": "NUZONE 展演空間", "venue_en": "NUZONE",
            "tour_zh": title[:60], "tour_en": title[:60],
            "price_zh": "票價待公布", "price_en": "TBA",
            "platform": "NUZONE",
            "platform_url": _NUZONE_BASE + "/",
            "genre": genre, "image_url": None,
            "sale_start_at": None, "source": "nuzone",
        })

    log(f"  → 找到 {len(results)} 個活動")
    return results


# ─────────────────────────────────────────────────────────────────────────────
# NEW Source: Zepp New Taipei — zepp.com/en-us/hall/zepp-new-taipei
# ─────────────────────────────────────────────────────────────────────────────

def scrape_zepp_new_taipei() -> list[dict]:
    """
    爬取 Zepp New Taipei（新莊宏匯廣場）演出節目。
    嘗試順序：
      1. Zepp 官方 schedule 頁面（JSON-LD 或 __NEXT_DATA__）
      2. Zepp 活動列表 API（/api/schedule）
      3. 個別活動詳情頁
    """
    log("── [Zepp New Taipei] 開始掃描...")
    results: list[dict] = []

    _ZEPP_BASE = "https://www.zepp.com"
    _ZEPP_SCHEDULE = _ZEPP_BASE + "/en-us/hall/zepp-new-taipei/schedule/"

    html = fetch(_ZEPP_SCHEDULE, timeout=25, referer=_ZEPP_BASE + "/")
    if not html:
        # 備用：直接抓 hall 首頁
        html = fetch(_ZEPP_BASE + "/en-us/hall/zepp-new-taipei/", timeout=25)
    if not html:
        log("  ✗ Zepp New Taipei 無法取得")
        return results

    # ── 嘗試 __NEXT_DATA__ JSON ──────────────────────────────────────────────
    next_data_m = re.search(r'<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]+?)</script>', html)
    if next_data_m:
        try:
            data = json.loads(next_data_m.group(1))
            # Walk props.pageProps.schedules or similar
            schedules = (
                data.get("props", {}).get("pageProps", {}).get("schedules")
                or data.get("props", {}).get("pageProps", {}).get("events")
                or []
            )
            for ev in schedules:
                if not isinstance(ev, dict):
                    continue
                name = ev.get("title") or ev.get("name") or ev.get("eventName", "")
                start = ev.get("startDate") or ev.get("date") or ev.get("performDate", "")
                dates = parse_dates(str(start)) if start else []
                if not dates:
                    continue
                date_str = next((d for d in dates if is_future_date(d)), None)
                if not date_str:
                    continue
                artist = _extract_artist_from_title(name) or name[:40]
                event_url = ev.get("url") or ev.get("ticketUrl") or _ZEPP_SCHEDULE
                if event_url and not event_url.startswith("http"):
                    event_url = _ZEPP_BASE + event_url
                image_url = ev.get("image") or ev.get("thumbnail") or None
                genre = classify_genre(artist, name)
                results.append({
                    "artist": artist, "date_str": date_str,
                    "city_zh": "新北", "city_en": "New Taipei",
                    "venue_zh": "Zepp New Taipei", "venue_en": "Zepp New Taipei",
                    "tour_zh": name[:60], "tour_en": name[:60],
                    "price_zh": "票價待公布", "price_en": "TBA",
                    "platform": "Zepp New Taipei",
                    "platform_url": event_url,
                    "genre": genre, "image_url": image_url,
                    "sale_start_at": None, "source": "zepp",
                })
        except (json.JSONDecodeError, KeyError, TypeError):
            pass

    # ── 若 __NEXT_DATA__ 無結果，改用 JSON-LD ────────────────────────────────
    if not results:
        for block in re.findall(
            r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>([\s\S]*?)</script>',
            html, re.DOTALL
        ):
            try:
                data = json.loads(block)
                items = data if isinstance(data, list) else [data]
                for item in items:
                    if item.get("@type") not in ("Event", "MusicEvent"):
                        continue
                    parsed = _parse_jsonld_event(item, html, "Zepp New Taipei", "zepp")
                    if parsed:
                        parsed["city_zh"] = "新北"
                        parsed["city_en"] = "New Taipei"
                        parsed["venue_zh"] = "Zepp New Taipei"
                        parsed["venue_en"] = "Zepp New Taipei"
                        results.append(parsed)
            except (json.JSONDecodeError, KeyError):
                continue

    # ── HTML fallback：掃描活動連結 ──────────────────────────────────────────
    if not results:
        event_links = list(dict.fromkeys(re.findall(
            r'href="(/en-us/events?/[^"?#]+|/hall/zepp-new-taipei/[^"?#]+)"', html
        )))
        log(f"  找到 {len(event_links)} 個活動連結")
        for path in event_links[:20]:
            url = _ZEPP_BASE + path
            time.sleep(1.0)
            ev_html = fetch(url, referer=_ZEPP_SCHEDULE)
            if not ev_html:
                continue
            parsed = _parse_venue_event_page(
                url, ev_html, "Zepp New Taipei", "zepp.com", "zepp",
                default_venue="Zepp New Taipei", default_city="新北"
            )
            if parsed:
                parsed["city_zh"] = "新北"
                parsed["city_en"] = "New Taipei"
                results.append(parsed)

    log(f"  → 找到 {len(results)} 個活動")
    return results


# ─────────────────────────────────────────────────────────────────────────────
# NEW Source: 河岸留言 Riverside Live House — riverside.com.tw
# ─────────────────────────────────────────────────────────────────────────────

def scrape_riverside() -> list[dict]:
    """
    爬取河岸留言（西門紅樓展演館）演出節目。
    官方網站: riverside.com.tw
    包含西門紅樓展演館及音樂深造計畫活動。
    """
    log("── [河岸留言 Riverside] 開始掃描...")
    results: list[dict] = []

    _RIVERSIDE_BASE = "https://www.riverside.com.tw"
    _RIVERSIDE_LIST = _RIVERSIDE_BASE + "/events"

    html = fetch(_RIVERSIDE_LIST, timeout=20, referer=_RIVERSIDE_BASE + "/")
    if not html:
        html = fetch(_RIVERSIDE_BASE + "/", timeout=20)
    if not html:
        log("  ✗ 河岸留言 無法取得")
        return results

    # ── JSON-LD ──────────────────────────────────────────────────────────────
    for block in re.findall(
        r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>([\s\S]*?)</script>',
        html, re.DOTALL
    ):
        try:
            data = json.loads(block)
            items = data if isinstance(data, list) else [data]
            for item in items:
                if item.get("@type") not in ("Event", "MusicEvent"):
                    continue
                parsed = _parse_jsonld_event(item, html, "河岸留言", "riverside")
                if parsed:
                    parsed["venue_zh"] = "河岸留言西門紅樓展演館"
                    parsed["venue_en"] = "Riverside Live House"
                    results.append(parsed)
        except (json.JSONDecodeError, KeyError):
            continue

    # ── 個別活動頁面連結 ─────────────────────────────────────────────────────
    if not results:
        event_links = list(dict.fromkeys(re.findall(
            r'href="(/(?:events?|shows?|concerts?)/[^"?#]+)"', html
        )))
        # 也找完整 URL
        event_links += [
            "/" + u
            for u in re.findall(
                r'https://www\.riverside\.com\.tw/((?:events?|shows?|concerts?)/[^"\'<>\s]+)', html
            )
            if "/" + u not in event_links
        ]
        log(f"  找到 {len(event_links)} 個活動連結")

        for path in event_links[:20]:
            url = _RIVERSIDE_BASE + path if path.startswith("/") else path
            time.sleep(1.0)
            ev_html = fetch(url, referer=_RIVERSIDE_LIST)
            if not ev_html:
                continue
            parsed = _parse_venue_event_page(
                url, ev_html, "河岸留言", "riverside.com.tw", "riverside",
                default_venue="河岸留言西門紅樓展演館", default_city="台北"
            )
            if parsed:
                parsed["venue_zh"] = "河岸留言西門紅樓展演館"
                parsed["venue_en"] = "Riverside Live House"
                results.append(parsed)

    # ── 最後備用：從首頁直接解析文字 ─────────────────────────────────────────
    if not results:
        text = clean(strip_tags(html))
        dates = parse_dates(text)
        seen: set[str] = set()
        for date_str in dates:
            if not is_future_date(date_str):
                continue
            idx = text.find(date_str[:7])
            if idx < 0:
                continue
            snippet = text[max(0, idx - 200):idx + 100]
            lines = [l.strip() for l in snippet.split("\n") if l.strip() and len(l.strip()) > 3]
            title = next(
                (l for l in reversed(lines) if not re.match(r'^20\d{2}', l) and
                 not re.search(r'https?://', l)),
                ""
            )
            if not title or len(title) < 3:
                continue
            dedup_key = f"{title.lower()[:25]}|{date_str}"
            if dedup_key in seen:
                continue
            seen.add(dedup_key)
            artist = _extract_artist_from_title(title) or title[:40]
            genre = classify_genre(artist, title)
            results.append({
                "artist": artist, "date_str": date_str,
                "city_zh": "台北", "city_en": "Taipei",
                "venue_zh": "河岸留言西門紅樓展演館",
                "venue_en": "Riverside Live House",
                "tour_zh": title[:60], "tour_en": title[:60],
                "price_zh": "票價待公布", "price_en": "TBA",
                "platform": "河岸留言",
                "platform_url": _RIVERSIDE_BASE + "/events",
                "genre": genre, "image_url": None,
                "sale_start_at": None, "source": "riverside",
            })

    log(f"  → 找到 {len(results)} 個活動")
    return results


# ─────────────────────────────────────────────────────────────────────────────
# Shared helpers for new venue scrapers
# ─────────────────────────────────────────────────────────────────────────────

def _parse_jsonld_event(ev: dict, html: str, platform: str, source: str) -> dict | None:
    """Parse a JSON-LD MusicEvent/Event dict into a concert record."""
    name = ev.get("name", "")
    if not name:
        return None

    start = ev.get("startDate", "")
    dates = parse_dates(start) or parse_dates(clean(strip_tags(html)))
    if not dates:
        return None
    date_str = next((d for d in dates if is_future_date(d)), None)
    if not date_str:
        return None

    location = ev.get("location", {})
    raw_venue = ""
    if isinstance(location, dict):
        raw_venue = location.get("name", "")
    elif isinstance(location, str):
        raw_venue = location

    url = ev.get("url", "")
    if not url:
        url_m = re.search(r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']+)["\']', html)
        url = url_m.group(1) if url_m else ""

    # Image
    image_url = None
    img_data = ev.get("image")
    if isinstance(img_data, str) and img_data.startswith("http"):
        image_url = img_data
    elif isinstance(img_data, list) and img_data:
        image_url = img_data[0] if isinstance(img_data[0], str) else None
    if not image_url:
        og_img = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', html)
        if not og_img:
            og_img = re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']', html)
        if og_img:
            image_url = og_img.group(1)

    # Price
    offers = ev.get("offers", {})
    price_str = "票價待公布"
    if isinstance(offers, dict):
        price = offers.get("price")
        currency = offers.get("priceCurrency", "TWD")
        if price:
            price_str = f"NT${price}" if currency == "TWD" else f"{price} {currency}"
    elif isinstance(offers, list) and offers:
        price = offers[0].get("price") if isinstance(offers[0], dict) else None
        if price:
            price_str = f"NT${price}"

    # Sale start
    valid_from = offers.get("validFrom", "") if isinstance(offers, dict) else ""
    sale_start_at = None
    if valid_from:
        dates_sf = parse_dates(valid_from)
        if dates_sf:
            sale_start_at = f"{dates_sf[0].replace('/', '-')}T00:00:00+08:00"
    if not sale_start_at:
        sale_start_at = parse_sale_start(clean(strip_tags(html)))

    city_zh, city_en, venue_zh, venue_en = resolve_venue(raw_venue, name + " " + raw_venue)
    artist = _extract_artist_from_title(name) or name[:40]
    genre = classify_genre(artist, name)

    return {
        "artist": artist, "date_str": date_str,
        "city_zh": city_zh, "city_en": city_en,
        "venue_zh": venue_zh, "venue_en": venue_en,
        "tour_zh": name[:60], "tour_en": name[:60],
        "price_zh": price_str,
        "price_en": price_str if re.search(r'[a-zA-Z]', price_str) else "TBA",
        "platform": platform,
        "platform_url": url,
        "genre": genre, "image_url": image_url,
        "sale_start_at": sale_start_at, "source": source,
    }


def _parse_venue_event_page(url: str, html: str, platform: str, domain: str,
                             source: str, default_venue: str = "",
                             default_city: str = "台北") -> dict | None:
    """Generic event detail page parser for venue websites."""
    text = clean(strip_tags(html))

    # JSON-LD first
    for block in re.findall(r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', html, re.DOTALL):
        try:
            data = json.loads(block)
            if isinstance(data, list):
                data = data[0]
            if data.get("@type") in ("MusicEvent", "Event"):
                return _parse_jsonld_event(data, html, platform, source)
        except (json.JSONDecodeError, KeyError):
            continue

    # Date
    dates = parse_dates(text)
    if not dates:
        return None
    date_str = next((d for d in dates if is_future_date(d)), None)
    if not date_str:
        return None

    # Concert check
    has_concert = any(k in text.lower() for k in CONCERT_KEYWORDS)
    if not has_concert:
        return None

    # Title
    og_title = re.search(r'<meta[^>]+property=["\']og:title["\'][^>]+content=["\']([^"\']+)["\']', html)
    title = clean(html_lib.unescape(og_title.group(1))) if og_title else ""
    if not title:
        t_m = re.search(r'<title[^>]*>(.*?)</title>', html, re.DOTALL)
        title = clean(strip_tags(t_m.group(1))) if t_m else ""
    # Strip site name suffix (e.g. " | Legacy Taipei")
    title = re.sub(r'\s*[-|｜]\s*' + re.escape(platform[:10]) + r'.*$', '', title).strip()
    if not title:
        return None

    # Reject listing / category pages where <title> is "節目資訊 | 2026-27 節目清單與時間" 等
    if is_bad_title(title):
        log(f"  ⚠ 略過 listing 頁 (title={title[:40]!r}): {url}")
        return None

    # Venue
    venues = re.findall(
        r'(?:台北|臺北|高雄|台中|林口|新北|桃園)[^\s，,。\n]{0,30}'
        r'(?:巨蛋|小巨蛋|大巨蛋|體育館|場館|劇場|音樂中心|展演|Live|LIVE)',
        text,
    )
    raw_venue = venues[0] if venues else default_venue

    # og:image
    og_img = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', html)
    if not og_img:
        og_img = re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']', html)
    image_url = og_img.group(1) if og_img else None

    prices = re.findall(r'NT\$\s?[\d,]+', text)
    price_str = prices[0].strip()[:40] if prices else "票價待公布"

    artist = _extract_artist_from_title(title) or title[:40]
    city_zh, city_en, venue_zh, venue_en = resolve_venue(raw_venue, text)
    if city_zh == "台北" and default_city != "台北":
        city_zh = default_city
        city_en = {"高雄": "Kaohsiung", "台中": "Taichung"}.get(default_city, default_city)
    genre = classify_genre(artist, text[:400])

    return {
        "artist": artist, "date_str": date_str,
        "city_zh": city_zh, "city_en": city_en,
        "venue_zh": venue_zh or default_venue, "venue_en": venue_en or default_venue,
        "tour_zh": title[:60], "tour_en": title[:60],
        "price_zh": price_str,
        "price_en": price_str if re.search(r'[a-zA-Z]', price_str) else "TBA",
        "platform": platform,
        "platform_url": url,
        "genre": genre, "image_url": image_url,
        "sale_start_at": parse_sale_start(text), "source": source,
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


def _is_hot_from_sale_start(sale_start_at: str | None) -> bool:
    """
    搶票時間在未來 7 天內 → 標記為 is_hot。
    """
    if not sale_start_at:
        return False
    m = re.match(r'(20\d{2})-(\d{2})-(\d{2})', sale_start_at)
    if not m:
        return False
    try:
        sale_date = date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        delta = (sale_date - date.today()).days
        return 0 <= delta <= 7
    except ValueError:
        return False


def normalize_concerts(raw: list[dict]) -> list[dict]:
    """Deduplicate, fill defaults, assign gradient CSS, auto-set is_hot."""
    seen: set[str] = set()
    out: list[dict] = []
    for c in raw:
        if not c.get("artist") or not c.get("date_str"):
            continue
        # Safety net: reject listing-page / JS-snippet titles from any scraper source
        if is_bad_title(c.get("artist", "")) or is_bad_title(c.get("tour_zh", "")):
            log(f"  ⚠ 丟棄髒資料: artist={c.get('artist')!r} tour={c.get('tour_zh')!r}")
            continue
        key = _dedup_key(c)
        if key in seen:
            continue
        seen.add(key)

        genre = c.get("genre", "western")
        seed = c.get("artist", "") + c.get("date_str", "")
        sale_start_at = c.get("sale_start_at") or None

        # ── 售票時間合理性驗證 ─────────────────────────────────────────────────
        if sale_start_at:
            try:
                sale_date = date.fromisoformat(sale_start_at[:10])
                today = date.today()
                # 1. 開賣日早於今天 → 已過期，對搶票提醒無用
                if sale_date < today:
                    sale_start_at = None
                else:
                    # 2. 開賣日 > 演唱會日期 → year 推算錯誤（如 3月27日→2027 但演唱會在2026年7月）
                    concert_date_m = re.search(r'(20\d{2})[/\-](\d{1,2})[/\-](\d{1,2})',
                                               c.get("date_str", ""))
                    if concert_date_m:
                        concert_date = date(int(concert_date_m.group(1)),
                                            int(concert_date_m.group(2)),
                                            int(concert_date_m.group(3)))
                        if sale_date > concert_date:
                            sale_start_at = None
            except (ValueError, TypeError):
                sale_start_at = None

        out.append({
            "artist":        c.get("artist", "TBA"),
            "emoji":         _EMOJIS.get(genre, "🎵"),
            "date_str":      c.get("date_str", "日期待公布"),
            "city_zh":       c.get("city_zh", "台北"),
            "city_en":       c.get("city_en", "Taipei"),
            "venue_zh":      c.get("venue_zh", "場地待公布"),
            "venue_en":      c.get("venue_en", "Venue TBA"),
            "tour_zh":       c.get("tour_zh", "演唱會"),
            "tour_en":       c.get("tour_en", "Concert"),
            "price_zh":      c.get("price_zh", "票價待公布"),
            "price_en":      c.get("price_en", "TBA"),
            "platform":      c.get("platform", "待確認"),
            "platform_url":  c.get("platform_url", ""),
            "genre":         genre,
            "status":        "pending",
            "is_hot":        _is_hot_from_sale_start(sale_start_at),
            "grad_css":      grad_for(genre, seed),
            "image_url":     c.get("image_url") or None,
            "sale_start_at": sale_start_at,
            "source":        c.get("source", "auto"),
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
        is_hot_val = "true" if c.get("is_hot") else "false"
        sale_val = sql_val(c.get("sale_start_at"))
        row = (
            f"({sql_val(c['artist'])}, {sql_val(c['emoji'])}, "
            f"{sql_val(c['date_str'])}, {sql_val(c['city_zh'])}, {sql_val(c['city_en'])}, "
            f"{sql_val(c['venue_zh'])}, {sql_val(c['venue_en'])}, "
            f"{sql_val(c['tour_zh'])}, {sql_val(c['tour_en'])}, "
            f"{sql_val(c['price_zh'])}, {sql_val(c['price_en'])}, "
            f"{sql_val(c['platform'])}, {sql_val(c['platform_url'])}, "
            f"{sql_val(c['genre'])}, 'pending', {is_hot_val}, "
            f"{sql_val(c['grad_css'])}, {image_val}, {sale_val})"
        )
        rows.append(row)

    joined = ",\n".join(rows)
    return f"""-- 自動爬取：{date.today().isoformat()} 每日演唱會更新
-- 來源: {', '.join(dict.fromkeys(c['source'] for c in concerts))}
-- 請在 Supabase Dashboard → SQL Editor 執行此檔案

insert into concerts (
  artist, emoji, date_str, city_zh, city_en, venue_zh, venue_en,
  tour_zh, tour_en, price_zh, price_en, platform, platform_url,
  genre, status, is_hot, grad_css, image_url, sale_start_at
) values
{joined}
on conflict on constraint concerts_unique_show do update
set
  emoji         = excluded.emoji,
  city_en       = excluded.city_en,
  venue_en      = excluded.venue_en,
  tour_en       = excluded.tour_en,
  price_zh      = excluded.price_zh,
  price_en      = excluded.price_en,
  platform      = excluded.platform,
  platform_url  = excluded.platform_url,
  genre         = excluded.genre,
  grad_css      = excluded.grad_css,
  is_hot        = excluded.is_hot or concerts.is_hot,
  image_url     = coalesce(excluded.image_url, concerts.image_url),
  sale_start_at = coalesce(excluded.sale_start_at, concerts.sale_start_at);
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
            "genre":         c["genre"],
            "status":        "pending",
            "is_hot":        c.get("is_hot", False),
            "grad_css":      c["grad_css"],
            "image_url":     c.get("image_url"),
            "sale_start_at": c.get("sale_start_at"),  # ISO 8601 or None
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
# Cleanup: remove concerts expired > 7 days
# ─────────────────────────────────────────────────────────────────────────────

def cleanup_expired_concerts(supabase_url: str, api_key: str) -> None:
    """
    刪除演唱會日期超過 7 天的過期資料。
    date_str 格式 "YYYY/MM/DD" — 字串排序等於日期排序，可直接用 lt. 比較。
    """
    cutoff = (date.today() - timedelta(days=7)).strftime("%Y/%m/%d")
    endpoint = (
        supabase_url.rstrip("/")
        + f"/rest/v1/concerts?date_str=lt.{cutoff}"
    )
    req = urllib.request.Request(
        endpoint,
        method="DELETE",
        headers={
            "apikey":        api_key,
            "Authorization": f"Bearer {api_key}",
            "Prefer":        "return=minimal",
        },
    )
    try:
        with urllib.request.urlopen(req, context=SSL_CTX, timeout=30) as resp:
            log(f"  ✓ 清理過期演唱會完成 (HTTP {resp.getcode()})，截止日: {cutoff}")
    except urllib.error.HTTPError as e:
        log(f"  ✗ 清理失敗 ({e.code}): {e.read().decode('utf-8', errors='ignore')[:200]}")
    except Exception as e:
        log(f"  ✗ 清理錯誤: {e}")


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

    # ── 新增來源（小型/海外/社群）────────────────────────────────────────────
    try:
        raw += scrape_colatour()
    except Exception as e:
        log(f"  ✗ 可樂旅遊 爬取失敗: {e}")

    try:
        raw += scrape_bandsintown_taipei()
    except Exception as e:
        log(f"  ✗ Bandsintown 爬取失敗: {e}")

    try:
        raw += scrape_liveking_fb()
    except Exception as e:
        log(f"  ✗ LIVE王 FB 爬取失敗: {e}")

    # ── 新增售票平台 ──────────────────────────────────────────────────────────
    try:
        raw += scrape_kham()
    except Exception as e:
        log(f"  ✗ 寬宏售票 爬取失敗: {e}")

    try:
        raw += scrape_ticketplus()
    except Exception as e:
        log(f"  ✗ 遠大售票 爬取失敗: {e}")

    try:
        raw += scrape_indievox()
    except Exception as e:
        log(f"  ✗ iNDIEVOX 爬取失敗: {e}")

    # ── 免費活動平台 ──────────────────────────────────────────────────────────
    # KKTIX: 有官方 API (api.kktix.com) 但需 OAuth 授權，暫不支援直接爬取
    try:
        raw += scrape_accupass_free()
    except Exception as e:
        log(f"  ✗ Accupass 免費活動 爬取失敗: {e}")

    # ── 指標性大型場館 ────────────────────────────────────────────────────────
    try:
        raw += scrape_tmc_taipei()
    except Exception as e:
        log(f"  ✗ 北流 tmc.taipei 爬取失敗: {e}")

    try:
        raw += scrape_kpmc()
    except Exception as e:
        log(f"  ✗ 高流 kpmc.com.tw 爬取失敗: {e}")

    # ── 熱門 Live House ───────────────────────────────────────────────────────
    try:
        raw += scrape_legacy()
    except Exception as e:
        log(f"  ✗ Legacy 爬取失敗: {e}")

    try:
        raw += scrape_thewall()
    except Exception as e:
        log(f"  ✗ The Wall 爬取失敗: {e}")

    try:
        raw += scrape_pipe()
    except Exception as e:
        log(f"  ✗ PIPE Live Music 爬取失敗: {e}")

    try:
        raw += scrape_nuzone()
    except Exception as e:
        log(f"  ✗ NUZONE 爬取失敗: {e}")

    try:
        raw += scrape_zepp_new_taipei()
    except Exception as e:
        log(f"  ✗ Zepp New Taipei 爬取失敗: {e}")

    try:
        raw += scrape_riverside()
    except Exception as e:
        log(f"  ✗ 河岸留言 爬取失敗: {e}")

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

    # ── Supabase auto-insert + cleanup ─────────────────────────────────────
    if supabase_url and api_key:
        has_service_key = "SUPABASE_SERVICE_ROLE_KEY" in env
        if has_service_key:
            log(f"\n自動寫入 Supabase ({len(concerts)} 筆)...")
            supabase_upsert(concerts, supabase_url, api_key)

            log("\n清理超過 7 天的過期演唱會...")
            cleanup_expired_concerts(supabase_url, api_key)
        else:
            log("\n⚠️  未設定 SUPABASE_SERVICE_ROLE_KEY，跳過自動寫入。")
            log(f"   請手動執行: {sql_out}")
            log("   或在 .env.local 加入 SUPABASE_SERVICE_ROLE_KEY=<your_key>")
            log("   (Service Role Key 位於 Supabase Dashboard → Settings → API)")
    else:
        log("\n⚠️  Supabase 設定不完整，跳過自動寫入。")
        log(f"   請手動執行 SQL: {sql_out}")

    # ── Summary ─────────────────────────────────────────────────────────────
    hot_count = sum(1 for c in concerts if c.get("is_hot"))
    with_sale = sum(1 for c in concerts if c.get("sale_start_at"))
    with_img  = sum(1 for c in concerts if c.get("image_url"))
    log(f"\n📊 今日統計: {len(concerts)} 筆 | 🔥 搶票提醒 {hot_count} 筆 | "
        f"🎫 有開賣時間 {with_sale} 筆 | 🖼️ 有圖片 {with_img} 筆")
    log("=" * 60)
    log("完成！")


if __name__ == "__main__":
    main()
