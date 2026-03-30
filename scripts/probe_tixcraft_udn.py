#!/usr/bin/env python3
"""probe_tixcraft_udn.py — Focused probing of Tixcraft and UDN structure"""
import ssl, urllib.request, re, time

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
H = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept-Language": "zh-TW,zh;q=0.9",
}

def get(url, referer=None):
    h = dict(H)
    if referer:
        h["Referer"] = referer
    req = urllib.request.Request(url, headers=h)
    return urllib.request.urlopen(req, timeout=20, context=ctx).read().decode("utf-8","ignore")

def strip(html):
    t = re.sub(r"<[^>]+>", " ", html)
    return re.sub(r"\s+", " ", t).strip()

# ── Tixcraft: find actual card structure ──────────────────────────────────────
print("=== TIXCRAFT card structure ===")
html = get("https://tixcraft.com/activity/list")

# Find all detail links with their surrounding ~200 chars context
detail_links = [(m.start(), m.group(1)) for m in re.finditer(r'href="(/activity/detail/[^"]+)"', html)]
print(f"Detail links: {len(detail_links)}")

# Extract context around first few event links to find the card wrapper
if detail_links:
    for pos, link in detail_links[:3]:
        start = max(0, pos - 400)
        snippet = html[start: pos + 300]
        # Find class attributes in this snippet
        classes = re.findall(r'class="([^"]*)"', snippet)
        text = strip(snippet)
        dates = re.findall(r'\d{4}/\d{2}/\d{2}', text)
        imgs = re.findall(r'src="([^"]+\.(?:jpg|png|webp)[^"]*)"', snippet)
        print(f"\n  LINK: {link}")
        print(f"  CLASSES near card: {classes[:5]}")
        print(f"  DATES: {dates}")
        print(f"  IMGS: {[i[:80] for i in imgs[:2]]}")
        print(f"  TEXT: {text[:200]}")

time.sleep(2)

# ── UDN: check the actual event listing page ───────────────────────────────────
print("\n\n=== UDN listing page ===")
html2 = get("https://tickets.udnfunlife.com/application/UTK01/UTK0101_05.aspx",
            referer="https://tickets.udnfunlife.com/application/UTK01/UTK0101_.aspx")

text2 = strip(html2)
print(f"Page size: {len(html2)}")
# Find event links
ev_links = list(dict.fromkeys(re.findall(r'href="([^"]*UTK0201[^"]*)"', html2)))
print(f"Event detail links: {len(ev_links)}: {ev_links[:3]}")

# Find blocks with event names
blocks2 = re.findall(r'<(?:div|li|tr)[^>]*class="[^"]*(?:show|event|item|prod|act)[^"]*"[^>]*>(.*?)</(?:div|li|tr)>', html2, re.DOTALL)
print(f"Event blocks: {len(blocks2)}")
for b in blocks2[:3]:
    t = strip(b)
    print(f"  -> {t[:200]}")

# Find title patterns from table rows (UDN uses asp.net table layout)
tds = re.findall(r'<td[^>]*>(.*?)</td>', html2, re.DOTALL)
print(f"TD cells: {len(tds)}, sample:")
for td in tds[:6]:
    t = strip(td)
    if len(t) > 5:
        print(f"  TD: {t[:120]}")

dates2 = list(dict.fromkeys(re.findall(r'20(?:25|26)[/\-]\d{1,2}[/\-]\d{1,2}', text2)))
print(f"Dates: {dates2[:8]}")
print(f"Text sample: {text2[:500]}")

time.sleep(2)

# ── UDN: main listing with CATEGORY=music ────────────────────────────────────
print("\n\n=== UDN main with category filter ===")
html3 = get("https://tickets.udnfunlife.com/application/UTK01/UTK0101_.aspx?FUNC=1&CLASSIFY=1",
            referer="https://tickets.udnfunlife.com/")
text3 = strip(html3)
dates3 = list(dict.fromkeys(re.findall(r'20(?:25|26)[/\-]\d{1,2}[/\-]\d{1,2}', text3)))
ev_links3 = list(dict.fromkeys(re.findall(r'href="([^"]*PD_ID=[^"]+)"', html3)))
print(f"Dates: {dates3[:8]}")
print(f"PD_ID links: {len(ev_links3)}: {ev_links3[:3]}")

# ── ERAticket: probe one product page (without blocking) ────────────────────
print("\n\n=== ERAticket product page ===")
html4 = get("https://ticket.com.tw/")
prod_ids = list(dict.fromkeys(re.findall(r'PRODUCT_ID=([A-Z0-9]+)', html4)))
print(f"Product IDs: {prod_ids[:6]}")

# Probe the main search/listing page 
era_listing = get("https://ticket.com.tw/application/UTK02/UTK0201_.aspx",
                  referer="https://ticket.com.tw/")
text_era = strip(era_listing)
dates_era = list(dict.fromkeys(re.findall(r'20(?:25|26)[/\-]\d{1,2}[/\-]\d{1,2}', text_era)))
print(f"ERA listing page size: {len(era_listing)}")
print(f"ERA dates: {dates_era[:8]}")
print(f"ERA text: {text_era[:400]}")
