#!/usr/bin/env python3
"""reclassify_concerts.py — 重新分類資料庫中已存在的演唱會
=============================================================

抓 Supabase 全部 concerts，套用 daily_concert_scraper.classify_genre 的最新規則，
找出分類錯誤（特別是被誤分為 festival 的個人演唱會），並更新分類欄位。

預設先以 dry-run 印出修改清單，加上 --apply 才會真的寫回 Supabase。

用法：
    python3 scripts/reclassify_concerts.py            # 只列出，不寫入
    python3 scripts/reclassify_concerts.py --apply    # 確認後寫入

需要 .env.local 中的 SUPABASE_SERVICE_ROLE_KEY 與 NEXT_PUBLIC_SUPABASE_URL。
"""
from __future__ import annotations

import argparse
import json
import re
import ssl
import sys
import urllib.error
import urllib.request
from collections import Counter
from pathlib import Path

# 重用現有的分類器（含最新修復）
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from scripts.daily_concert_scraper import classify_genre  # type: ignore

ENV_FILE = ROOT / ".env.local"

SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE


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


def fetch_all_concerts(base_url: str, key: str) -> list[dict]:
    """抓所有 concerts；分頁處理 PostgREST 預設的 1000 筆上限。"""
    out: list[dict] = []
    offset = 0
    page_size = 1000
    while True:
        url = (
            f"{base_url}/rest/v1/concerts"
            f"?select=id,artist,tour_zh,tour_en,genre,date_str,venue_zh,city_zh,platform"
            f"&order=date_str.asc"
            f"&limit={page_size}&offset={offset}"
        )
        req = urllib.request.Request(
            url, headers={"apikey": key, "Authorization": f"Bearer {key}"}
        )
        with urllib.request.urlopen(req, context=SSL_CTX) as r:
            chunk = json.loads(r.read())
        out.extend(chunk)
        if len(chunk) < page_size:
            break
        offset += page_size
    return out


def update_genre(base_url: str, key: str, concert_id: str, new_genre: str) -> bool:
    url = f"{base_url}/rest/v1/concerts?id=eq.{urllib.parse.quote(concert_id)}"
    body = json.dumps({"genre": new_genre}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        method="PATCH",
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
    )
    try:
        with urllib.request.urlopen(req, context=SSL_CTX) as r:
            return r.status in (200, 204)
    except urllib.error.HTTPError as e:
        print(f"  ✗ update {concert_id} 失敗: {e.code} {e.read()[:200]}")
        return False


# ── 主程式 ────────────────────────────────────────────────────────────────────


def reclassify_one(c: dict) -> str:
    """取出該筆紀錄最可信的訊號，餵給 classify_genre。"""
    artist = c.get("artist") or ""
    tour_zh = c.get("tour_zh") or ""
    tour_en = c.get("tour_en") or ""
    venue = c.get("venue_zh") or ""
    # tour 名是分類最佳訊號；以 tour_zh + tour_en 一起做為 text 線索
    text = (tour_zh + " " + tour_en + " " + venue).strip()
    return classify_genre(artist, text)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="實際寫回 Supabase")
    ap.add_argument(
        "--only-festival",
        action="store_true",
        help="只檢查目前 genre=festival 的紀錄（找誤分類最快）",
    )
    args = ap.parse_args()

    import urllib.parse  # noqa: F401  (used inside update_genre via name lookup)

    env = read_env()
    base_url = env.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not (base_url and key):
        print("✗ 缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY")
        return 1

    print(f"連線 Supabase: {base_url}")
    concerts = fetch_all_concerts(base_url, key)
    print(f"共 {len(concerts)} 筆")

    if args.only_festival:
        concerts = [c for c in concerts if c.get("genre") == "festival"]
        print(f"  → 篩選後 (genre=festival)：{len(concerts)} 筆")

    changes: list[tuple[dict, str, str]] = []
    for c in concerts:
        old = c.get("genre", "")
        new = reclassify_one(c)
        if new != old:
            changes.append((c, old, new))

    print()
    print(f"=== 預計修改 {len(changes)} 筆 ===")
    by_transition: Counter = Counter()
    for c, old, new in changes:
        by_transition[f"{old} → {new}"] += 1

    print()
    print("分類變動統計：")
    for k, v in by_transition.most_common():
        print(f"  {k:30s}  x{v}")

    print()
    print("詳細清單（最多顯示 60 筆）：")
    for c, old, new in changes[:60]:
        print(
            f"  [{old:8s} → {new:8s}]  "
            f"{c.get('date_str','?'):20s} | "
            f"{(c.get('artist') or '')[:24]:24s} | "
            f"{(c.get('tour_zh') or '')[:50]}"
        )
    if len(changes) > 60:
        print(f"  ... 另有 {len(changes) - 60} 筆未顯示")

    if not args.apply:
        print()
        print("（dry-run 結束。確認無誤後請加 --apply 真的寫入）")
        return 0

    print()
    print("=== 正在寫入 Supabase ... ===")
    ok = 0
    fail = 0
    for c, old, new in changes:
        if update_genre(base_url, key, c["id"], new):
            ok += 1
        else:
            fail += 1
    print(f"完成：成功 {ok}、失敗 {fail}")
    return 0 if fail == 0 else 2


if __name__ == "__main__":
    # urllib.parse 在 update_genre 中使用，這裡 import 一次給整支腳本用
    import urllib.parse  # noqa: F401

    sys.exit(main())
