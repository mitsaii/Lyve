#!/usr/bin/env python3
"""probe_platforms_deep.py — 深入探測各平台事件卡結構"""
import ssl, urllib.request, re, time, json

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
H = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
}

def get(url, referer=None):
    headers = dict(H)
    if referer:
        headers["Referer"] = referer
    req = urllib.request.Request(url, headers=headers)
    return urllib.request.urlopen(req, timeout=20, context=ctx).read().decode("utf-8","ignore")

def strip(html):
    t = re.sub(r"<[^>]+>", " ", html)
    return re.sub(r"\s+", " ", t).strip()

# ═══════════════════ TIXCRAFT ════════════════════════════════════════════════
print("\n" + "="*60)
print("TIXCRAFT  https://tixcraft.com/activity/list")
print("="*60)
html = get("https://tixcraft.com/activity/list")

# The page has <li class="col-..."> cards
cards = re.findall(r'<li[^>]*class="[^"]*col[^"]*"[^>]*>(.*?)</li>', html, re.DOTALL)
print(f"event cards: {len(cards)}")
for c in cards[:4]:
    link = re.search(r'href="(/activity/detail/[^"]+)"', c)
    text = strip(c)
    dates = re.findall(r'\d{4}/\d{2}/\d{2}', text)
    print(f"  link : {link.group(1) if link else '-'}")
    print(f"  text : {text[:120]}")
    print(f"  dates: {dates}")
    print()

time.sleep(1.5)

# ═══════════════════ UDN ═════════════════════════════════════════════════════
print("\n" + "="*60)
print("UDN  https://tickets.udnfunlife.com/application/UTK01/UTK0101_.aspx")
print("="*60)
html2 = get("https://tickets.udnfunlife.com/application/UTK01/UTK0101_.aspx")

# UDN uses product links like UTK0101_05.aspx?PD_ID=xxx
prod_links = list(dict.fromkeys(re.findall(r'href="([^"]*UTK0101_05\.aspx[^"]*)"', html2)))
print(f"Product detail links: {len(prod_links)}")
for l in prod_links[:3]:
    print(f"  {l}")

# Check JSON-LD
jld = re.findall(r'<script[^>]+application/ld\+json[^>]*>(.*?)</script>', html2, re.DOTALL)
print(f"JSON-LD blocks: {len(jld)}")
for j in jld[:2]:
    print(f"  {j[:300]}")

# Look for event blocks with title+date in them
blocks = re.findall(r'class="[^"]*(?:show|event|item|prod)[^"]*"[^>]*>(.*?)</(?:div|li|td)>', html2, re.DOTALL)
print(f"Event blocks: {len(blocks)}")
for b in blocks[:3]:
    text = strip(b)
    if len(text) > 15:
        print(f"  -> {text[:180]}")

all_text = strip(html2)
dates = list(dict.fromkeys(re.findall(r'20(?:25|26|27)[/\-]\d{1,2}[/\-]\d{1,2}', all_text)))
print(f"All dates ({len(dates)}): {dates[:10]}")

time.sleep(1.5)

# ═══════════════════ ERAticket ═══════════════════════════════════════════════
print("\n" + "="*60)
print("ERAticket  https://ticket.com.tw/")
print("="*60)
html3 = get("https://ticket.com.tw/")

prod_ids = list(dict.fromkeys(re.findall(r'PRODUCT_ID=([A-Z0-9]+)', html3)))
print(f"Product IDs found: {len(prod_ids)}: {prod_ids[:6]}")

# Probe one product detail page
if prod_ids:
    time.sleep(1)
    url4 = f"https://ticket.com.tw/application/UTK02/UTK0201_.aspx?PRODUCT_ID={prod_ids[0]}"
    html4 = get(url4, referer="https://ticket.com.tw/")
    text4 = strip(html4)
    dates4 = re.findall(r'20(?:25|26)[/\-]\d{1,2}[/\-]\d{1,2}', text4)
    venues4 = re.findall(r'(?:台北|臺北|高雄|台中|林口)[^\s，,。]{0,25}(?:巨蛋|Arena|體育館|場館|劇場|小巨蛋)', text4)
    price4 = re.findall(r'NT\$\s?[\d,]+', text4)
    title4_m = re.search(r'<title[^>]*>(.*?)</title>', html4, re.DOTALL)
    title4 = strip(title4_m.group(1)) if title4_m else "?"
    print(f"Sample product: {url4}")
    print(f"  Title : {title4}")
    print(f"  Dates : {dates4[:4]}")
    print(f"  Venues: {venues4[:3]}")
    print(f"  Prices: {price4[:3]}")
    print(f"  Text  : {text4[:300]}")

time.sleep(1.5)

# ═══════════════════ KHAM ════════════════════════════════════════════════════
print("\n" + "="*60)
print("KHAM  https://kham.com.tw/")
print("="*60)
html5 = get("https://kham.com.tw/")

# Kham links out to teamear.tixcraft.com for events
tixcraft_links = list(dict.fromkeys(re.findall(r'href="(https://(?:teamear\.)?tixcraft\.com[^"]+)"', html5)))
print(f"Tixcraft links on Kham: {len(tixcraft_links)}")
for l in tixcraft_links[:5]:
    print(f"  {l}")

# Also look for any internal event links
kham_links = list(dict.fromkeys(re.findall(r'href="([^"]*UTK0[^"]+)"', html5)))
print(f"Internal UTK links: {len(kham_links)}")
for l in kham_links[:5]:
    print(f"  {l}")

# Check text
text5 = strip(html5)
dates5 = re.findall(r'20(?:25|26)[/\-]\d{1,2}[/\-]\d{1,2}', text5)
print(f"Dates on Kham homepage: {dates5[:6]}")
print(f"Text sample: {text5[:400]}")
