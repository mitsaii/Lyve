#!/usr/bin/env python3
"""
_probe_sale_sources.py
探查 KKTIX 和 ERA 頁面是否包含售票時間資訊。
在 mac terminal 執行: python3 scripts/_probe_sale_sources.py
"""
import ssl, urllib.request, re, time

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
H = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept-Language": "zh-TW,zh;q=0.9",
    "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
}

def get(url, referer=None):
    h = dict(H)
    if referer:
        h["Referer"] = referer
    req = urllib.request.Request(url, headers=h)
    try:
        return urllib.request.urlopen(req, timeout=15, context=ctx).read().decode("utf-8", "ignore")
    except Exception as e:
        return f"[ERROR: {e}]"

def strip(html):
    t = re.sub(r"<[^>]+>", " ", html)
    return re.sub(r"\s+", " ", t).strip()

SALE_KWS = ["開賣", "售票", "購票", "sale", "on sale", "ticket"]

# ═══════════════════════════════════════════════════════════════
# 1. KKTIX 音樂活動列表
# ═══════════════════════════════════════════════════════════════
print("=" * 60)
print("1. KKTIX 台灣音樂活動列表")
print("=" * 60)
kktix_html = get("https://kktix.com/events?category=music&area=tw")
if kktix_html.startswith("[ERROR"):
    print(f"  ✗ {kktix_html}")
else:
    print(f"  頁面大小: {len(kktix_html)} chars")
    # 找活動卡片連結
    event_links = list(dict.fromkeys(re.findall(
        r'href="(https://(?:[\w]+\.)?kktix\.(?:com|cc)/events/[^"?#]+)"', kktix_html
    )))
    # 過濾台灣相關
    tw_links = [l for l in event_links if not any(x in l.lower() for x in ['hong-kong', '-hk-', '-jp-', '-sg-', '-kr-'])]
    print(f"  活動連結總數: {len(event_links)}，台灣相關: {len(tw_links)}")
    print(f"  前 8 個台灣連結:")
    for l in tw_links[:8]:
        print(f"    {l}")

    # 找售票關鍵字
    for kw in ["開賣", "售票日期", "saleDate", "sale_start"]:
        count = len(re.findall(re.escape(kw), kktix_html, re.IGNORECASE))
        if count:
            print(f"  ✅ '{kw}' 出現 {count} 次")

    # 看第一個活動卡片
    card_m = re.search(r'class="[^"]*(?:event-card|eventItem|event-item|card)[^"]*"[^>]*>([\s\S]{0,500}?)</(?:div|li|article)>', kktix_html)
    if card_m:
        print(f"\n  第一個卡片文字: {strip(card_m.group(1))[:300]}")

# ═══════════════════════════════════════════════════════════════
# 2. KKTIX 個別活動頁面（取第一個台灣連結）
# ═══════════════════════════════════════════════════════════════
if not kktix_html.startswith("[ERROR") and tw_links:
    print("\n" + "=" * 60)
    print(f"2. KKTIX 個別活動頁面: {tw_links[0]}")
    print("=" * 60)
    time.sleep(1)
    detail_html = get(tw_links[0], referer="https://kktix.com/events")
    if detail_html.startswith("[ERROR"):
        print(f"  ✗ {detail_html}")
    else:
        print(f"  頁面大小: {len(detail_html)} chars")
        text = strip(detail_html)
        # 找售票時間關鍵字及上下文
        for kw in ["開賣", "售票", "開放購票", "sale start", "on sale", "ticket sale"]:
            for m in re.finditer(re.escape(kw), text, re.IGNORECASE):
                ctx_snip = text[max(0, m.start()-30):m.start()+200]
                print(f"  [{kw}] → {ctx_snip[:250]}")
                break
        # JSON-LD
        jlds = re.findall(r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>([\s\S]*?)</script>', detail_html, re.IGNORECASE)
        for i, jld in enumerate(jlds[:2]):
            print(f"\n  JSON-LD {i+1}: {jld[:400]}")

# ═══════════════════════════════════════════════════════════════
# 3. ERA 年代售票 — 第一個 product 頁面的售票時間文字
# ═══════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("3. ERA 年代售票 homepage → 第一個 product")
print("=" * 60)
era_html = get("https://ticket.com.tw/")
if era_html.startswith("[ERROR"):
    print(f"  ✗ {era_html}")
else:
    prod_ids = list(dict.fromkeys(re.findall(r'PRODUCT_ID=([A-Z0-9]+)', era_html)))[:3]
    print(f"  Product IDs: {prod_ids}")
    if prod_ids:
        time.sleep(1)
        pd_url = f"https://ticket.com.tw/application/UTK02/UTK0201_.aspx?PRODUCT_ID={prod_ids[0]}"
        pd_html = get(pd_url, referer="https://ticket.com.tw/")
        if pd_html.startswith("[ERROR"):
            print(f"  ✗ {pd_html}")
        else:
            pd_text = strip(pd_html)
            print(f"  頁面大小: {len(pd_html)} chars")
            # 找售票時間文字
            for kw in ["開賣", "售票", "網路售票", "公開售票", "購票開始"]:
                for m in re.finditer(re.escape(kw), pd_text, re.IGNORECASE):
                    ctx_snip = pd_text[max(0, m.start()-30):m.start()+200]
                    print(f"  [{kw}] → {ctx_snip[:250]}")
                    break
            # 找有日期的片段
            date_matches = re.findall(r'20\d{2}[/\-]\d{1,2}[/\-]\d{1,2}.{0,50}', pd_text)
            print(f"\n  日期片段 (前 5 個):")
            for d in date_matches[:5]:
                print(f"    {d[:150]}")

print("\n✅ 探查完成")
