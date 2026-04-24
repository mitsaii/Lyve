#!/usr/bin/env python3
"""
repatch_sale_dates.py — 補齊 Supabase 裡缺少「搶票時間」的活動
=====================================================================
找出 DB 裡 sale_start_at 為 NULL、演出日期在今天以後的場次，
重新拜訪各平台頁面嘗試抓取搶票時間，有找到就寫回 DB。

執行方式（在 taiwan-concerts 目錄）：
  python3 scripts/repatch_sale_dates.py

也可只列出結果不寫入 DB（乾跑模式）：
  python3 scripts/repatch_sale_dates.py --dry-run
"""
from __future__ import annotations

import html as html_lib
import json
import re
import ssl
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime
from pathlib import Path

DRY_RUN = "--dry-run" in sys.argv

ROOT = Path(__file__).resolve().parents[1]
ENV_FILE = ROOT / ".env.local"

SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE

_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)


# ── 環境變數 ──────────────────────────────────────────────────────────────────

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


# ── HTTP 工具 ─────────────────────────────────────────────────────────────────

def fetch(url: str, *, referer: str = "", timeout: int = 12) -> str:
    headers = {
        "User-Agent": _UA,
        "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
        "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
    }
    if referer:
        headers["Referer"] = referer
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, context=SSL_CTX, timeout=timeout) as r:
            return r.read().decode("utf-8", errors="replace")
    except Exception:
        return ""


def strip_tags(html: str) -> str:
    return re.sub(r"<[^>]+>", " ", html)


def clean(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


# ── 時間推算輔助 ──────────────────────────────────────────────────────────────

def _cn_hour(qualifier: str, h: int) -> int:
    if qualifier in ("下午", "晚上") and h < 12:
        return h + 12
    if qualifier == "中午" and h == 12:
        return 12
    if qualifier in ("上午", "早上") and h == 12:
        return 0
    return h


def _infer_sale_year(mo: int, d: int) -> int:
    today = date.today()
    for y in (today.year, today.year + 1):
        try:
            if date(y, mo, d) >= today:
                return y
        except ValueError:
            pass
    return today.year


# ── 核心：parse_sale_start（與 daily_concert_scraper 保持一致）──────────────

def parse_sale_start(text: str) -> str | None:
    kw = (
        r"(?:開賣|售票開始|搶票|票券開賣|票務開始|購票開始|會員預售|公開發售|"
        r"售票日期|售票時間|開售時間|購票時間|開售日期|購票日期|"
        r"公開售票|網路售票|一般售票|現場售票開始|預售開始|"
        r"on[\s\-]+sale|sale[\s\-]+start|tickets?\s+on\s+sale)"
    )

    # Pattern 1: keyword + YYYY/MM/DD HH:MM
    m = re.search(
        kw + r"[^\n\d]{0,30}(20(?:25|26|27))[/\-年](\d{1,2})[/\-月](\d{1,2})"
        r"[日\s\(（\)）A-Za-z,]*(\d{1,2}):(\d{2})",
        text, re.IGNORECASE,
    )
    if m:
        y, mo, d, h, mi = m.group(1), m.group(2), m.group(3), m.group(4), m.group(5)
        try:
            return f"{y}-{int(mo):02d}-{int(d):02d}T{int(h):02d}:{mi}:00+08:00"
        except ValueError:
            pass

    # Pattern 2: keyword + YYYY/MM/DD（預設正午）
    m = re.search(
        kw + r"[^\n\d]{0,30}(20(?:25|26|27))[/\-年](\d{1,2})[/\-月](\d{1,2})",
        text, re.IGNORECASE,
    )
    if m:
        y, mo, d = m.group(1), m.group(2), m.group(3)
        try:
            return f"{y}-{int(mo):02d}-{int(d):02d}T12:00:00+08:00"
        except ValueError:
            pass

    # Pattern 3: keyword 跨行 + YYYY/MM/DD HH:MM
    m = re.search(
        kw + r"[\s\S]{0,60}?(20(?:25|26|27))[/\-](\d{1,2})[/\-](\d{1,2})"
        r"[^\n\d]{0,20}(\d{1,2}):(\d{2})",
        text, re.IGNORECASE,
    )
    if m:
        y, mo, d, h, mi = m.group(1), m.group(2), m.group(3), m.group(4), m.group(5)
        try:
            return f"{y}-{int(mo):02d}-{int(d):02d}T{int(h):02d}:{mi}:00+08:00"
        except ValueError:
            pass

    # Pattern 4: 中文月日 + 時段詞 + X點 + keyword
    m = re.search(
        r"(\d{1,2})\s*月\s*(\d{1,2})\s*日\s*"
        r"(上午|早上|中午|下午|晚上)?\s*"
        r"(\d{1,2})\s*[點点]\s*(?:半\s*)?"
        r"[^\n\d]{0,10}" + kw,
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

    # Pattern 5: 中文月日 + HH:MM + keyword
    m = re.search(
        r"(\d{1,2})\s*月\s*(\d{1,2})\s*日\s*"
        r"(?:上午|早上|中午|下午|晚上)?\s*"
        r"(\d{1,2}):(\d{2})\s*"
        r"[^\n\d]{0,10}" + kw,
        text, re.IGNORECASE,
    )
    if m:
        mo_s, d_s, h_s, mi_s = m.group(1), m.group(2), m.group(3), m.group(4)
        qualifier = ""
        q_m = re.search(r"(上午|早上|中午|下午|晚上)", text[m.start():m.end()])
        if q_m:
            qualifier = q_m.group(1)
        try:
            mo_i, d_i = int(mo_s), int(d_s)
            h_i = _cn_hour(qualifier, int(h_s))
            y_i = _infer_sale_year(mo_i, d_i)
            return f"{y_i}-{mo_i:02d}-{d_i:02d}T{h_i:02d}:{mi_s}:00+08:00"
        except ValueError:
            pass

    # Pattern 6: 純日期 + 時間，無關鍵字（部分平台直接列 "2026/05/10 12:00"）
    # 只在文字很短時（detail 區塊）才用，避免誤抓演出時間
    if len(text) < 500:
        m = re.search(
            r"(20(?:25|26|27))[/\-](\d{1,2})[/\-](\d{1,2})"
            r"[^\n\d]{0,10}(\d{1,2}):(\d{2})",
            text,
        )
        if m:
            y, mo, d, h, mi = m.group(1), m.group(2), m.group(3), m.group(4), m.group(5)
            try:
                return f"{y}-{int(mo):02d}-{int(d):02d}T{int(h):02d}:{mi}:00+08:00"
            except ValueError:
                pass

    return None


# ── DuckDuckGo 搜尋（備援）────────────────────────────────────────────────────

def ddg_search_sale_start(artist: str, concert_date: str) -> str | None:
    """
    用 DuckDuckGo HTML lite 搜尋「artist 搶票 開賣」，
    從 snippet 裡嘗試解析搶票時間。
    """
    query = f"{artist} 台灣 搶票 開賣 {concert_date[:7]}"
    url = "https://html.duckduckgo.com/html/?q=" + urllib.parse.quote(query)
    html = fetch(url, referer="https://duckduckgo.com/", timeout=10)
    if not html:
        return None
    # 擷取 snippet 文字
    snippets = re.findall(r'class="result__snippet"[^>]*>(.*?)</a>', html, re.DOTALL)
    for s in snippets[:5]:
        text = clean(strip_tags(html_lib.unescape(s)))
        result = parse_sale_start(text)
        if result:
            return result
    return None


# ── Supabase API ───────────────────────────────────────────────────────────────

def sb_get(url: str, key: str, query: str = "") -> list[dict]:
    full_url = url + ("?" + query if query else "")
    req = urllib.request.Request(full_url, headers={
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Accept": "application/json",
    })
    try:
        with urllib.request.urlopen(req, context=SSL_CTX, timeout=15) as r:
            return json.loads(r.read().decode())
    except Exception as e:
        print(f"  [SB GET ERROR] {e}")
        return []


def sb_patch(url: str, key: str, row_id: str, payload: dict) -> bool:
    body = json.dumps(payload).encode()
    req = urllib.request.Request(
        url + f"?id=eq.{row_id}",
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
        with urllib.request.urlopen(req, context=SSL_CTX, timeout=15) as r:
            return r.status in (200, 204)
    except Exception as e:
        print(f"  [SB PATCH ERROR] {e}")
        return False


# ── 各平台頁面抓取邏輯 ─────────────────────────────────────────────────────────

REFERERS: dict[str, str] = {
    "tixcraft":  "https://tixcraft.com/activity/list",
    "indievox":  "https://www.indievox.com/activity",
    "eraticket": "https://www.ticket.com.tw/",
    "kham":      "https://www.kham.com.tw/",
    "legacy":    "https://www.legacy.com.tw/",
    "ticketplus": "https://ticketplus.com.tw/",
    "colatour":  "https://www.colatour.com.tw/",
    "tmc_taipei": "https://tmc.taipei/",
    "kpmc":      "https://www.kpmc.com.tw/",
    "nuzone":    "https://nuzone.com.tw/",
    "zepp":      "https://zepp.com/",
    "riverside": "https://www.riverside.com.tw/",
}

# 已知需要 JS 渲染或有 Bot 防護的 source，跳過直接 fetch
SKIP_SOURCES = {"kktix", "ibon", "klook", "kkday"}


def probe_url(platform_url: str, source: str) -> str | None:
    """
    拜訪 platform_url，嘗試從頁面內容解析開賣時間。
    回傳 ISO 8601 字串或 None。
    """
    if source in SKIP_SOURCES:
        return None
    if not platform_url or not platform_url.startswith("http"):
        return None

    referer = REFERERS.get(source, "")
    html = fetch(platform_url, referer=referer, timeout=14)
    if not html or len(html) < 200:
        return None

    text = clean(strip_tags(html_lib.unescape(html)))

    # 先嘗試 JSON-LD
    for block in re.findall(
        r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        html, re.DOTALL
    ):
        try:
            data = json.loads(block)
            if isinstance(data, list):
                data = data[0]
            start_date = data.get("startDate", "")
            # 某些 JSON-LD 把 offers.validFrom 當作開賣時間
            offers = data.get("offers")
            if isinstance(offers, dict):
                valid_from = offers.get("validFrom", "")
                if valid_from:
                    m = re.match(r"(20\d{2}-\d{2}-\d{2})[T ](\d{2}:\d{2})", valid_from)
                    if m:
                        return f"{m.group(1)}T{m.group(2)}:00+08:00"
            if isinstance(offers, list):
                for offer in offers:
                    valid_from = offer.get("validFrom", "")
                    if valid_from:
                        m = re.match(r"(20\d{2}-\d{2}-\d{2})[T ](\d{2}:\d{2})", valid_from)
                        if m:
                            return f"{m.group(1)}T{m.group(2)}:00+08:00"
        except (json.JSONDecodeError, AttributeError):
            pass

    # 再嘗試文字 parse
    return parse_sale_start(text)


# ── 主程式 ────────────────────────────────────────────────────────────────────

def main():
    env = read_env()
    sb_url = env.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
    sb_key = env.get("SUPABASE_SERVICE_ROLE_KEY", "")

    if not sb_url or not sb_key:
        print("❌ 找不到 SUPABASE_SERVICE_ROLE_KEY，請在 .env.local 設定後再執行")
        sys.exit(1)

    concerts_url = sb_url + "/rest/v1/concerts"
    today_str = date.today().isoformat()

    print(f"{'[DRY RUN] ' if DRY_RUN else ''}🔍 查詢 sale_start_at 為空的未來場次...")
    rows = sb_get(
        concerts_url, sb_key,
        query=f"sale_start_at=is.null&date_str=gte.{today_str}&status=neq.ended&select=id,artist,date_str,platform_url,source&order=date_str.asc&limit=200",
    )
    print(f"  找到 {len(rows)} 筆待補值場次")

    updated = 0
    skipped = 0
    failed  = 0

    for i, row in enumerate(rows):
        artist      = row.get("artist", "")
        date_str    = row.get("date_str", "")
        platform_url = row.get("platform_url", "")
        source      = row.get("source", "")
        row_id      = row.get("id", "")

        print(f"\n[{i+1}/{len(rows)}] {artist} ({date_str}) — {source}")

        # ① 先從 platform URL 抓
        result = probe_url(platform_url, source)

        # ② 抓不到，改用 DuckDuckGo 搜尋
        if not result and artist and date_str:
            print(f"  ⚡ 嘗試 DuckDuckGo 搜尋...")
            result = ddg_search_sale_start(artist, date_str)
            if result:
                print(f"  ✅ DDG 找到: {result}")

        if result:
            print(f"  ✅ 開賣時間: {result}")
            if not DRY_RUN:
                ok = sb_patch(concerts_url, sb_key, row_id, {"sale_start_at": result})
                if ok:
                    updated += 1
                else:
                    failed += 1
                    print(f"  ❌ 寫入失敗")
            else:
                updated += 1
        else:
            print(f"  — 仍無法取得")
            skipped += 1

        # 每筆間隔避免觸發 rate limit
        time.sleep(1.2)

    print(f"\n{'=' * 50}")
    print(f"{'[DRY RUN] ' if DRY_RUN else ''}完成！更新: {updated}，跳過: {skipped}，失敗: {failed}")


if __name__ == "__main__":
    main()
