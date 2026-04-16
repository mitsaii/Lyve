#!/usr/bin/env python3
"""daily_diff_report.py — 每日演唱會新增/移除報告
=======================================================
比較今日與昨日的爬蟲結果，輸出異動報告。

用法:
  python3 scripts/daily_diff_report.py           # 比較今日 vs 昨日
  python3 scripts/daily_diff_report.py 20260401  # 指定「今日」日期
"""

from __future__ import annotations

import json
import sys
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"

GENRE_LABEL = {
    "cpop":    "華語",
    "bands":   "樂團",
    "hiphop":  "Hip-Hop",
    "kpop":    "K-Pop",
    "jpop":    "J-Pop",
    "western": "西洋",
    "festival":"音樂祭",
}

def load_day(date_str: str) -> list[dict]:
    path = DATA_DIR / f"daily_{date_str}.json"
    if not path.exists():
        return []
    with open(path, encoding="utf-8") as f:
        return json.load(f)

def event_key(e: dict) -> tuple:
    return (e.get("artist", ""), e.get("date_str", ""), e.get("venue_zh", ""))

def format_event(e: dict, prefix: str) -> str:
    genre = GENRE_LABEL.get(e.get("genre", ""), e.get("genre", "?"))
    artist = e.get("artist", "?")[:30]
    date_s = e.get("date_str", "?")
    venue  = e.get("venue_zh", "?")[:15]
    city   = e.get("city_zh", "")
    platform = e.get("platform", "")
    return f"  {prefix} [{genre}] {artist} | {date_s} | {city} {venue} | {platform}"

def main():
    # Determine dates
    if len(sys.argv) > 1:
        today_str = sys.argv[1]
    else:
        today_str = date.today().strftime("%Y%m%d")

    try:
        today_dt = date(int(today_str[:4]), int(today_str[4:6]), int(today_str[6:]))
    except (ValueError, IndexError):
        print(f"❌ 無效的日期格式: {today_str}，應為 YYYYMMDD（例如 20260416）")
        return
    yest_str   = (today_dt - timedelta(days=1)).strftime("%Y%m%d")

    curr = load_day(today_str)
    prev = load_day(yest_str)

    if not curr and not prev:
        print(f"❌ 找不到 {today_str} 和 {yest_str} 的資料")
        return

    curr_map = {event_key(e): e for e in curr}
    prev_map = {event_key(e): e for e in prev}

    added   = [curr_map[k] for k in curr_map if k not in prev_map]
    removed = [prev_map[k] for k in prev_map if k not in curr_map]
    total_curr = len(curr)
    total_prev = len(prev)

    # Group added by genre
    added_by_genre: dict[str, list] = {}
    for e in added:
        g = e.get("genre", "?")
        added_by_genre.setdefault(g, []).append(e)

    removed_by_genre: dict[str, list] = {}
    for e in removed:
        g = e.get("genre", "?")
        removed_by_genre.setdefault(g, []).append(e)

    # ── Print report ──────────────────────────────────────────────────────────
    print("=" * 60)
    print(f"📊 演唱會每日異動報告  {today_str[:4]}/{today_str[4:6]}/{today_str[6:]}")
    print(f"   比較: {yest_str} → {today_str}")
    print("=" * 60)
    print(f"   昨日活動數: {total_prev}　今日活動數: {total_curr}")
    delta = total_curr - total_prev
    delta_str = f"+{delta}" if delta >= 0 else str(delta)
    print(f"   淨變化: {delta_str}")
    print()

    if added:
        print(f"✅ 新增活動 ({len(added)} 筆)")
        print("-" * 60)
        for g in sorted(added_by_genre):
            label = GENRE_LABEL.get(g, g)
            print(f"  【{label}】")
            for e in sorted(added_by_genre[g], key=lambda x: x.get("date_str", "")):
                print(format_event(e, "＋"))
        print()
    else:
        print("✅ 新增活動：無")
        print()

    if removed:
        print(f"❌ 移除活動 ({len(removed)} 筆)")
        print("-" * 60)
        for g in sorted(removed_by_genre):
            label = GENRE_LABEL.get(g, g)
            print(f"  【{label}】")
            for e in sorted(removed_by_genre[g], key=lambda x: x.get("date_str", "")):
                print(format_event(e, "－"))
        print()
    else:
        print("❌ 移除活動：無")
        print()

    print("=" * 60)
    print("報告結束")

if __name__ == "__main__":
    main()
