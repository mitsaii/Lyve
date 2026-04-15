#!/usr/bin/env python3
"""
_probe_tixcraft_sale.py
探查 Tixcraft listing 頁面是否包含售票時間資訊。
在 mac terminal 執行: python3 scripts/_probe_tixcraft_sale.py
"""
import ssl, urllib.request, re

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
H = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept-Language": "zh-TW,zh;q=0.9",
}

def get(url):
    req = urllib.request.Request(url, headers=H)
    return urllib.request.urlopen(req, timeout=20, context=ctx).read().decode("utf-8", "ignore")

def strip(html):
    t = re.sub(r"<[^>]+>", " ", html)
    return re.sub(r"\s+", " ", t).strip()

print("=== 抓取 Tixcraft listing 頁面 ===")
html = get("https://tixcraft.com/activity/list")
print(f"頁面大小: {len(html)} chars\n")

# 1. 搜尋售票/開賣相關關鍵字
sale_kws = ["開賣", "售票", "saleDate", "saleStart", "on_sale", "onSale", "sale_date", "ticketOn", "openDate"]
print("=== 關鍵字搜尋 ===")
for kw in sale_kws:
    matches = [(m.start(), m.group()) for m in re.finditer(re.escape(kw), html, re.IGNORECASE)]
    if matches:
        print(f"\n✅ '{kw}' 出現 {len(matches)} 次，前 2 個上下文:")
        for idx, _ in matches[:2]:
            snippet = html[max(0, idx-100):idx+200]
            print(f"  → {strip(snippet)[:300]}")
    else:
        print(f"❌ '{kw}' 未出現")

# 2. 看第一個 eventbl 卡片的完整原始 HTML
print("\n\n=== 第一個 eventbl 卡片（原始 HTML，前 800 字元）===")
eventbl_starts = [m.start() for m in re.finditer(r'class="eventbl ', html)]
print(f"共有 {len(eventbl_starts)} 個 eventbl 卡片")
if eventbl_starts:
    card = html[eventbl_starts[0]:eventbl_starts[0]+1000]
    print(card[:800])

# 3. 找 data-* 屬性
print("\n\n=== 所有 data-* 屬性 ===")
data_attrs = list(dict.fromkeys(re.findall(r'data-[\w\-]+="[^"]*"', html)))
for attr in data_attrs[:20]:
    print(f"  {attr}")

# 4. 找 JSON-LD
print("\n\n=== JSON-LD / script type=application/json ===")
scripts = re.findall(r'<script[^>]*type=["\']application/(?:ld\+)?json["\'][^>]*>(.*?)</script>', html, re.DOTALL | re.IGNORECASE)
for i, s in enumerate(scripts[:3]):
    print(f"Script {i+1}: {s[:300]}")
