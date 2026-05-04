#!/usr/bin/env python3
"""cleanup_fake_concerts.py — 清掉 DB 中的列表頁/網站文字假活動
================================================================
用 Supabase REST API 直接刪除 concerts 表中：
  • artist / tour_zh 為「節目資訊」「節目清單」等網站區塊標題
  • platform_url 為 listing 頁 / 首頁（非單一活動詳情頁）
  • artist 為售票平台名稱本身（Tixcraft、KKTIX 等）
  • GTM JS 片段、Legacy 導覽列文字等雜訊

執行：
  python3 scripts/cleanup_fake_concerts.py        # 預覽 (不刪除)
  python3 scripts/cleanup_fake_concerts.py --yes  # 實際執行刪除
"""
from __future__ import annotations

import json
import ssl
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENV_FILE = ROOT / ".env.local"


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    if not ENV_FILE.exists():
        sys.exit(f"找不到 {ENV_FILE}")
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def main() -> None:
    env = load_env()
    base = env.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not base or not key:
        sys.exit("缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY")

    apply_changes = "--yes" in sys.argv or "-y" in sys.argv

    ctx = ssl.create_default_context()

    def call(path: str, method: str = "GET") -> tuple[int, str]:
        url = f"{base}/rest/v1/{path}"
        headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }
        req = urllib.request.Request(url, headers=headers, method=method)
        with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
            return resp.status, resp.read().decode("utf-8")

    def encode(qs: str) -> str:
        # 支援 unicode 在 query value 中
        out_parts = []
        for part in qs.split("&"):
            if "=" not in part:
                out_parts.append(part)
                continue
            k, v = part.split("=", 1)
            out_parts.append(f"{k}={urllib.parse.quote(v, safe='*.()=,!')}")
        return "&".join(out_parts)

    # 每個規則：(篩選條件, 描述)
    rules = [
        ("artist=ilike.*節目資訊*", "artist 含「節目資訊」"),
        ("tour_zh=ilike.*節目資訊*", "tour_zh 含「節目資訊」"),
        ("artist=ilike.*節目清單*", "artist 含「節目清單」"),
        ("tour_zh=ilike.*節目清單*", "tour_zh 含「節目清單」"),
        ("artist=ilike.*演出節目*", "artist 含「演出節目」"),
        ("tour_zh=ilike.*演出節目*", "tour_zh 含「演出節目」"),
        ("artist=ilike.*關於LEGACY*", "artist 含「關於LEGACY」"),
        ("artist=ilike.*寬宏售票*", "artist 含「寬宏售票」"),
        ("artist=ilike.*function%28w,d,s,l,i%29*", "artist 含 GTM JS"),
        ("tour_zh=ilike.*function%28w,d,s,l,i%29*", "tour_zh 含 GTM JS"),
        # 列表頁/首頁 URL
        ("platform_url=eq.https://tixcraft.com/activity", "platform_url 為 tixcraft 列表頁"),
        ("platform_url=eq.https://tixcraft.com/activity/", "platform_url 為 tixcraft 列表頁(尾斜線)"),
        ("platform_url=eq.https://tixcraft.com/activity/list", "platform_url 為 tixcraft list"),
        ("platform_url=eq.https://tixcraft.com", "platform_url 為 tixcraft 首頁"),
        ("platform_url=eq.https://www.indievox.com/activity", "platform_url 為 indievox 列表頁"),
        ("platform_url=eq.https://www.indievox.com", "platform_url 為 indievox 首頁"),
        ("platform_url=eq.https://kham.com.tw", "platform_url 為 kham 首頁"),
        ("platform_url=eq.https://www.kktix.com", "platform_url 為 kktix 首頁"),
        ("platform_url=eq.https://kktix.com", "platform_url 為 kktix 首頁"),
        ("platform_url=eq.https://ibon.com.tw", "platform_url 為 ibon 首頁"),
        ("platform_url=eq.https://ticketmaster.com.tw", "platform_url 為 ticketmaster 首頁"),
        ("platform_url=eq.https://tickets.udnfunlife.com", "platform_url 為 udn 首頁"),
        # 純平台名稱當 artist
        ("artist=in.(Tixcraft,tixcraft,拓元售票,拓元,KKTIX,kktix,ERAticket,年代售票,ibon售票,KKday,Klook客路,首頁,搜尋結果)",
         "artist 為平台名稱/UI 文字"),
    ]

    print(f"連線：{base}")
    print(f"模式：{'執行刪除' if apply_changes else '預覽 (dry run) — 加 --yes 才會真的刪'}")
    print("=" * 70)

    total_ids: set[int] = set()
    plan: list[tuple[str, str, list[dict]]] = []

    for qs, label in rules:
        try:
            code, body = call(f"concerts?{encode(qs)}&select=id,artist,date_str,tour_zh,platform_url")
        except Exception as e:
            print(f"  ✗ [{label}] 查詢失敗：{e}")
            continue
        rows = json.loads(body)
        if not rows:
            continue
        new_rows = [r for r in rows if r["id"] not in total_ids]
        for r in new_rows:
            total_ids.add(r["id"])
        if new_rows:
            plan.append((qs, label, new_rows))
            print(f"\n[{label}] +{len(new_rows)} 筆 (規則找到 {len(rows)})")
            for r in new_rows[:5]:
                a = (r.get("artist") or "")[:25]
                t = (r.get("tour_zh") or "")[:25]
                u = (r.get("platform_url") or "")[:35]
                print(f"   id={r['id']:>5}  {r.get('date_str','')}  {a}  ｜ {t}  ｜ {u}")
            if len(new_rows) > 5:
                print(f"   …還有 {len(new_rows) - 5} 筆")

    print("\n" + "=" * 70)
    print(f"預計刪除（去重後）：{len(total_ids)} 筆")
    print("=" * 70)

    if not apply_changes or not total_ids:
        if not total_ids:
            print("✓ 沒有髒資料，DB 乾淨。")
        else:
            print("\n（沒有真的刪除。確認上方沒有誤刪後，重跑：")
            print("  python3 scripts/cleanup_fake_concerts.py --yes")
        return

    # 真的刪
    deleted = 0
    for qs, label, _ in plan:
        try:
            code, body = call(f"concerts?{encode(qs)}", method="DELETE")
            arr = json.loads(body) if body else []
            n = len(arr) if isinstance(arr, list) else 0
            deleted += n
            print(f"  ✓ {label} 刪了 {n} 筆")
        except Exception as e:
            print(f"  ✗ {label} 刪除失敗：{e}")

    print("=" * 70)
    print(f"完成，共刪除 {deleted} 筆（去重後預計 {len(total_ids)} 筆）")


if __name__ == "__main__":
    main()
