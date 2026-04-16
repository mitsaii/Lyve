#!/usr/bin/env python3
"""
Recovery script: Push existing JSON data files to Supabase.
Run this from the taiwan-concerts directory:
    python3 scripts/push_json_to_supabase.py
"""
import json
import urllib.request
import urllib.error
from pathlib import Path
from datetime import date

BASE_DIR = Path(__file__).parent.parent
ENV_FILE = BASE_DIR / ".env.local"
DATA_DIR = BASE_DIR / "data"


def read_env() -> dict:
    env = {}
    if not ENV_FILE.exists():
        return env
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def upsert_concerts(records: list, supabase_url: str, api_key: str) -> bool:
    url = f"{supabase_url}/rest/v1/concerts"
    payload = json.dumps(records).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        method="POST",
        headers={
            "apikey": api_key,
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates",
        },
    )
    try:
        resp = urllib.request.urlopen(req, timeout=30)
        print(f"  ✓ Supabase upsert OK ({resp.getcode()}) — {len(records)} 筆")
        return True
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(f"  ✗ Supabase upsert 失敗 ({e.code}): {body[:200]}")
        return False
    except Exception as e:
        print(f"  ✗ Supabase upsert 錯誤: {e}")
        return False


def delete_expired(supabase_url: str, api_key: str) -> None:
    today = date.today().isoformat()
    url = f"{supabase_url}/rest/v1/concerts?event_date=lt.{today}"
    req = urllib.request.Request(
        url,
        method="DELETE",
        headers={
            "apikey": api_key,
            "Authorization": f"Bearer {api_key}",
        },
    )
    try:
        resp = urllib.request.urlopen(req, timeout=15)
        print(f"  ✓ 清理過期資料完成 ({resp.getcode()})")
    except Exception as e:
        print(f"  ✗ 清理錯誤: {e}")


def main():
    env = read_env()
    supabase_url = env.get("NEXT_PUBLIC_SUPABASE_URL", "")
    api_key = env.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")

    if not supabase_url or not api_key:
        print("✗ 未設定 SUPABASE_URL 或 API key，請確認 .env.local")
        return

    print(f"Supabase URL: {supabase_url}")

    # Find all JSON files with data (> 10 bytes)
    json_files = sorted(DATA_DIR.glob("daily_*.json"))
    json_files = [f for f in json_files if f.stat().st_size > 10]

    if not json_files:
        print("找不到有效的 JSON 資料檔案")
        return

    all_records = []
    seen = set()

    for jf in json_files:
        records = json.loads(jf.read_text(encoding="utf-8"))
        if not records:
            continue
        print(f"  讀取 {jf.name}: {len(records)} 筆")
        for r in records:
            key = r.get("artist", "") + "|" + r.get("date_str", "") + "|" + r.get("venue_zh", "")
            if key not in seen:
                seen.add(key)
                all_records.append(r)

    print(f"\n合併後共 {len(all_records)} 筆唯一記錄")

    if not all_records:
        print("無資料需要推送")
        return

    # Push in batches of 50
    batch_size = 50
    success = True
    for i in range(0, len(all_records), batch_size):
        batch = all_records[i:i+batch_size]
        print(f"推送第 {i//batch_size + 1} 批 ({len(batch)} 筆)...")
        if not upsert_concerts(batch, supabase_url, api_key):
            success = False
            break

    if success:
        print("\n清理過期資料...")
        delete_expired(supabase_url, api_key)
        print("\n✓ 完成！")
    else:
        print("\n✗ 推送失敗，請檢查 Supabase 設定")


if __name__ == "__main__":
    main()
