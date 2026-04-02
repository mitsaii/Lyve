#!/usr/bin/env python3
"""Scan Instagram public pages for Taiwan concert signals.

Outputs:
  - data/ig_taiwan_concert_candidates.json
  - data/ig_taiwan_concert_cards.sql
"""

from __future__ import annotations

import argparse
import codecs
import json
import random
import re
import ssl
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ARTIST_INBOX_FILE = ROOT / "lib" / "artistInbox.ts"
ARTIST_LIST_FILE = ROOT / "lib" / "artistList.ts"
OUT_JSON = ROOT / "data" / "ig_taiwan_concert_candidates.json"
OUT_SQL = ROOT / "data" / "ig_taiwan_concert_cards.sql"

SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE

TAIWAN_KEYWORDS = [
    "台灣",
    "臺灣",
    "taiwan",
    "taipei",
    "台北",
    "高雄",
    "kaohsiung",
    "taichung",
    "台中",
    "linkou",
    "林口",
]

CONCERT_KEYWORDS = [
    "演唱會",
    "巡演",
    "巡迴",
    "開唱",
    "concert",
    "tour",
    "live",
    "show",
    "ticket",
    "tickets",
]

ASIA_HINT_KEYWORDS = [
    "asia",
    "world tour",
    "asiatour",
]

UA_LIST = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
]


@dataclass
class Candidate:
    handle: str
    artist: str
    region: str
    genre: str
    score: int
    matched_taiwan_keywords: list[str]
    matched_concert_keywords: list[str]
    matched_asia_keywords: list[str]
    profile_url: str
    evidence_text: str
    created_at: str


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def normalize_handle(handle: str) -> str:
    h = handle.strip().lower()
    if not h.startswith("@"):
        h = "@" + h
    return h


def extract_handles_with_region() -> list[tuple[str, str]]:
    content = read_text(ARTIST_INBOX_FILE)
    pairs: list[tuple[str, str]] = []
    region_blocks = re.findall(
        r"region:\s*'(?P<region>western|kpop|jpop|indie)'[\s\S]*?raw:\s*`(?P<raw>[\s\S]*?)`",
        content,
    )

    seen: set[str] = set()
    for region, raw in region_blocks:
        for handle in re.findall(r"@[A-Za-z0-9._]+", raw):
            n = normalize_handle(handle)
            if n in seen:
                continue
            seen.add(n)
            pairs.append((n, region))
    return pairs


def handle_to_name(handle: str) -> str:
    no_at = handle[1:] if handle.startswith("@") else handle
    return re.sub(r"[._]+", " ", no_at).strip()


def map_region_to_genre(region: str) -> str:
    if region == "kpop":
        return "kpop"
    if region == "jpop":
        return "jpop"
    if region == "western":
        return "pop"
    return "bands"


def read_artist_mapping() -> dict[str, tuple[str, str]]:
    content = read_text(ARTIST_LIST_FILE)
    mapping: dict[str, tuple[str, str]] = {}
    pattern = re.compile(
        r"name:\s*'([^']+)'[\s\S]*?instagram:\s*'(@[^']+)'[\s\S]*?(?:genre:\s*'([^']+)')?",
        re.M,
    )
    for name, ig, genre in pattern.findall(content):
        mapping[normalize_handle(ig)] = (name.strip(), (genre.strip() if genre else "pop"))
    return mapping


def fetch_profile_html(handle: str, timeout: int = 18) -> str | None:
    clean = handle[1:] if handle.startswith("@") else handle
    url = f"https://www.instagram.com/{clean}/"
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": random.choice(UA_LIST),
            "Accept-Language": "en-US,en;q=0.9,zh-TW;q=0.8",
            "Referer": "https://www.instagram.com/",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=SSL_CTX) as resp:
            return resp.read().decode("utf-8", errors="ignore")
    except urllib.error.HTTPError:
        return None
    except urllib.error.URLError:
        return None
    except TimeoutError:
        return None


def decode_json_escaped(s: str) -> str:
    try:
        return codecs.decode(s, "unicode_escape")
    except Exception:
        return s


def extract_profile_text(html: str) -> str:
    snippets: list[str] = []

    meta_desc = re.search(r'<meta\s+property="og:description"\s+content="([^"]*)"', html)
    if meta_desc:
        snippets.append(meta_desc.group(1))

    bio_match = re.search(r'"biography":"(.*?)"', html)
    if bio_match:
        snippets.append(decode_json_escaped(bio_match.group(1)))

    caption_matches = re.findall(r'"edge_media_to_caption":\{"edges":\[\{"node":\{"text":"(.*?)"\}\}\]\}', html)
    for cap in caption_matches[:8]:
        snippets.append(decode_json_escaped(cap))

    cleaned = "\n".join(snippets)
    cleaned = cleaned.replace("\\n", " ")
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned.strip()


def find_keywords(text: str, keywords: list[str]) -> list[str]:
    t = text.lower()
    return [kw for kw in keywords if kw.lower() in t]


def evaluate_candidate(
    handle: str,
    region: str,
    artist_map: dict[str, tuple[str, str]],
    text: str,
) -> Candidate | None:
    if not text:
        return None

    matched_tw = find_keywords(text, TAIWAN_KEYWORDS)
    matched_concert = find_keywords(text, CONCERT_KEYWORDS)
    matched_asia = find_keywords(text, ASIA_HINT_KEYWORDS)

    score = 0
    if matched_tw:
        score += 5
    if matched_concert:
        score += 4
    if matched_asia:
        score += 1

    if not (matched_tw and matched_concert):
        return None

    artist, genre = artist_map.get(handle, (handle_to_name(handle), map_region_to_genre(region)))
    if genre == "all":
        genre = map_region_to_genre(region)

    return Candidate(
        handle=handle,
        artist=artist,
        region=region,
        genre=genre,
        score=score,
        matched_taiwan_keywords=matched_tw,
        matched_concert_keywords=matched_concert,
        matched_asia_keywords=matched_asia,
        profile_url=f"https://www.instagram.com/{handle[1:]}/",
        evidence_text=text[:400],
        created_at=datetime.now().isoformat(timespec="seconds"),
    )


def sql_escape(s: str) -> str:
    return s.replace("'", "''")


def pick_emoji(region: str) -> str:
    if region == "kpop":
        return "✨"
    if region == "jpop":
        return "🎌"
    if region == "western":
        return "🎤"
    return "🎸"


def pick_grad(region: str) -> str:
    if region == "kpop":
        return "linear-gradient(135deg, #0f2027 0%, #2c5364 100%)"
    if region == "jpop":
        return "linear-gradient(135deg, #3a1c71 0%, #d76d77 100%)"
    if region == "western":
        return "linear-gradient(135deg, #232526 0%, #414345 100%)"
    return "linear-gradient(135deg, #2b5876 0%, #4e4376 100%)"


def to_sql_rows(candidates: list[Candidate]) -> str:
    if not candidates:
        return "-- No IG Taiwan concert candidates found in this scan.\n"

    rows: list[str] = []
    for c in candidates:
        artist = sql_escape(c.artist)
        tour_zh = sql_escape(f"IG 線索：可能台灣場 ({c.handle})")
        tour_en = sql_escape(f"IG signal: possible Taiwan show ({c.handle})")
        genre = c.genre if c.genre in {"pop", "bands", "hiphop", "kpop", "jpop"} else "pop"
        row = (
            f"('{artist}', '{pick_emoji(c.region)}', '日期待公布', '台北', 'Taipei', "
            f"'場地待公布', 'Venue TBA', '{tour_zh}', '{tour_en}', "
            f"'票價待公布（IG 線索）', 'TBA (IG signal)', 'Instagram', '{sql_escape(c.profile_url)}', "
            f"'{genre}', 'pending', false, '{sql_escape(pick_grad(c.region))}', null)"
        )
        rows.append(row)

    head = """-- Auto-generated from scripts/scan_ig_taiwan_concerts.py
-- Source: Instagram public profile keyword scan
insert into concerts (artist, emoji, date_str, city_zh, city_en, venue_zh, venue_en, tour_zh, tour_en, price_zh, price_en, platform, platform_url, genre, status, is_hot, grad_css, image_url) values
"""
    body = ",\n".join(rows)
    tail = "\non conflict on constraint concerts_unique_show do nothing;\n"
    return head + body + tail


def main() -> int:
    parser = argparse.ArgumentParser(description="Scan IG public pages for Taiwan concert signals.")
    parser.add_argument("--max-handles", type=int, default=120, help="Max handles to scan (default: 120)")
    parser.add_argument("--sleep", type=float, default=0.55, help="Sleep seconds between requests")
    args = parser.parse_args()

    handles_with_region = extract_handles_with_region()
    artist_map = read_artist_mapping()

    scanned = 0
    candidates: list[Candidate] = []
    for handle, region in handles_with_region[: max(1, args.max_handles)]:
        scanned += 1
        html = fetch_profile_html(handle)
        if html is None:
            time.sleep(args.sleep)
            continue

        profile_text = extract_profile_text(html)
        candidate = evaluate_candidate(handle, region, artist_map, profile_text)
        if candidate is not None:
            candidates.append(candidate)

        time.sleep(args.sleep)

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "scanned_handles": scanned,
        "candidate_count": len(candidates),
        "candidates": [asdict(c) for c in candidates],
    }
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    OUT_SQL.write_text(to_sql_rows(candidates), encoding="utf-8")

    print(f"Scanned handles: {scanned}")
    print(f"Candidates found: {len(candidates)}")
    print(f"JSON written to: {OUT_JSON}")
    print(f"SQL written to:  {OUT_SQL}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
