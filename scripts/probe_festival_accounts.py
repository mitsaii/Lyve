#!/usr/bin/env python3
"""Probe Taiwan music festival IG accounts + web search for 2026 lineup / event info.

Outputs:
  - data/festival_probe_results.json
Shows each festival's IG bio / og:description and any extracted dates or artist names.
"""

import json
import re
import ssl
import time
import urllib.parse
import urllib.request
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_JSON = ROOT / "data" / "festival_probe_results.json"

SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE

FESTIVALS = [
    ("megaportfest",                    "大港開唱",                 "高雄", "Kaohsiung", "rock"),
    ("lucyfest_tw",                     "貴人散步音樂節",            "台北", "Taipei",    "rock"),
    ("springwaveofficial",              "春浪音樂節",                "台北", "Taipei",    "pop"),
    ("fireball_fest",                   "火球祭",                   "台北", "Taipei",    "rock"),
    ("vagabondfest.tw",                 "浪人祭",                   "台北", "Taipei",    "rock"),
    ("taiwaneastcoastlandartfestival",  "月光·海音樂會",             "台東", "Taitung",   "pop"),
    ("worldmusicfestivaltaiwan",        "世界音樂節@臺灣",            "台北", "Taipei",    "pop"),
    ("e_and_n_tw",                      "覺醒音樂節",                "台北", "Taipei",    "rock"),
    ("simplelife_ontheway",             "簡單生活節",                "台北", "Taipei",    "pop"),
    ("organik_festival",                "有機體音樂節",              "台北", "Taipei",    "rock"),
    ("smoke_machine_taipei",            "Smoke Machine Taipei",    "台北", "Taipei",    "rock"),
    ("islander_fest",                   "島嶼音樂節",                "台北", "Taipei",    "pop"),
    ("neon_oasis_fest",                 "霓虹綠洲音樂祭",            "台北", "Taipei",    "pop"),
    ("takao_rock",                      "打狗祭",                   "高雄", "Kaohsiung", "rock"),
    ("so_wonderful_festival",           "So Wonderful Festival",   "台北", "Taipei",    "pop"),
]

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"


def fetch(url: str, timeout: int = 20) -> str | None:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8"})
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=SSL_CTX) as r:
            return r.read().decode("utf-8", "ignore")
    except Exception:
        return None


def strip_tags(html: str) -> str:
    return re.sub(r"<[^>]+>", " ", html)


def clean(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def extract_ig_text(html: str) -> dict:
    result: dict = {}

    m = re.search(r'<meta\s+property="og:title"\s+content="([^"]*)"', html)
    if m:
        result["title"] = m.group(1)

    m = re.search(r'<meta\s+property="og:description"\s+content="([^"]*)"', html)
    if m:
        result["og_description"] = m.group(1)

    m = re.search(r'"biography":"(.*?)"(?=,")', html)
    if m:
        bio = m.group(1).replace("\\n", " ").replace("\\u003e", ">").replace("\\u003c", "<")
        result["bio"] = clean(bio)

    m = re.search(r'<meta\s+property="og:image"\s+content="([^"]*)"', html)
    if m:
        result["image_url"] = m.group(1)

    return result


def extract_dates(text: str) -> list[str]:
    dates: list[str] = []
    dates += re.findall(r"20(?:25|26)[/年]\d{1,2}[/月]\d{1,2}(?:日)?(?:[-–]\d{1,2})?", text)
    dates += re.findall(r"\d{1,2}[/]\d{1,2}\s*[-–]\s*\d{1,2}[/]\d{1,2}", text)
    dates += re.findall(r"(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:-\d{1,2})?\s*,?\s*202[56]", text, re.I)
    return list(dict.fromkeys(dates))[:5]


def extract_venues(text: str) -> list[str]:
    venues = re.findall(
        r"(?:台北|臺北|高雄|台中|台東|臺東|桃園|林口|花蓮|澎湖|鹽埕|駁二)[^，。,. ]{0,30}(?:巨蛋|小巨蛋|大巨蛋|體育館|場館|藝術特區|海洋公園|廣場|公園|音樂館|展演廳|舞台|碼頭|棧|Arena|Hall|Park|Center|Centre)",
        text,
    )
    return list(dict.fromkeys(venues))[:5]


def extract_artists(text: str) -> list[str]:
    """Extract @ handles and common artist-name patterns."""
    handles = re.findall(r"@[A-Za-z0-9._]+", text)
    return list(dict.fromkeys(handles))[:20]


def web_search_text(festival_name_zh: str, handle: str) -> str:
    q = f"{festival_name_zh} 2026 陣容 演出 藝人"
    url = "https://duckduckgo.com/html/?q=" + urllib.parse.quote(q)
    html = fetch(url)
    if not html:
        return ""
    text = clean(strip_tags(html))
    # keep first 2000 chars of search result text
    return text[:2000]


@dataclass
class FestivalResult:
    handle: str
    name_zh: str
    city_zh: str
    city_en: str
    genre: str
    profile_url: str
    ig_title: str
    ig_bio: str
    og_description: str
    image_url: str
    extracted_dates: list[str]
    extracted_venues: list[str]
    extracted_artist_handles: list[str]
    web_snippet: str
    checked_at: str


def probe_festival(handle: str, name_zh: str, city_zh: str, city_en: str, genre: str) -> FestivalResult:
    print(f"  [{name_zh}] IG: @{handle}", flush=True)
    ig_url = f"https://www.instagram.com/{handle}/"
    html = fetch(ig_url)

    ig_data: dict = {}
    if html:
        ig_data = extract_ig_text(html)
        print(f"    bio: {ig_data.get('bio', '')[:80]}", flush=True)
    else:
        print(f"    (IG fetch failed)", flush=True)

    combined_text = " ".join([
        ig_data.get("title", ""),
        ig_data.get("og_description", ""),
        ig_data.get("bio", ""),
    ])

    web = web_search_text(name_zh, handle)
    combined_text_all = combined_text + " " + web

    dates = extract_dates(combined_text_all)
    venues = extract_venues(combined_text_all)
    artists_in_text = extract_artists(combined_text_all)

    print(f"    dates: {dates[:3]}  venues: {venues[:3]}  handles: {artists_in_text[:5]}", flush=True)

    return FestivalResult(
        handle=handle,
        name_zh=name_zh,
        city_zh=city_zh,
        city_en=city_en,
        genre=genre,
        profile_url=ig_url,
        ig_title=ig_data.get("title", ""),
        ig_bio=ig_data.get("bio", ""),
        og_description=ig_data.get("og_description", ""),
        image_url=ig_data.get("image_url", ""),
        extracted_dates=dates,
        extracted_venues=venues,
        extracted_artist_handles=artists_in_text,
        web_snippet=web[:600],
        checked_at=datetime.now().isoformat(timespec="seconds"),
    )


def main() -> None:
    print(f"=== Taiwan Festival Probe ({datetime.now().date()}) ===")
    results: list[FestivalResult] = []

    for handle, name_zh, city_zh, city_en, genre in FESTIVALS:
        r = probe_festival(handle, name_zh, city_zh, city_en, genre)
        results.append(r)
        time.sleep(0.5)

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps([asdict(r) for r in results], ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n✓ Results written to {OUT_JSON}")


if __name__ == "__main__":
    main()
