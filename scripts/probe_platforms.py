#!/usr/bin/env python3
"""probe_platforms.py — 一次探測所有台灣售票平台的可爬性"""
import ssl, urllib.request, re, time

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
    "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
}

PLATFORMS = [
    ("Tixcraft",    "https://tixcraft.com/activity/list"),
    ("KKTIX",       "https://kktix.com/events?locale=zh-TW"),
    ("TicketPlus",  "https://ticketplus.com.tw/eventlist.html"),
    ("OpenTix",     "https://www.opentix.life/events?categoryIds=2"),
    ("UDN",         "https://tickets.udnfunlife.com/application/UTK01/UTK0101_.aspx"),
    ("ibon",        "https://ticket.ibon.com.tw/"),
    ("Kham",        "https://kham.com.tw/"),
    ("ERAticket",   "https://ticket.com.tw/"),
    ("Klook",       "https://www.klook.com/zh-TW/event/city-events/"),
    ("KKday",       "https://www.kkday.com/zh-tw/product/theme/entertainment"),
]

TW_KW   = ["台北","高雄","台中","台灣","臺灣","taipei","kaohsiung","taichung"]
SHOW_KW = ["演唱","開唱","concert","tour","live","活動","售票","event","ticket"]

def probe(name, url):
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        resp = urllib.request.urlopen(req, timeout=18, context=ctx)
        html = resp.read().decode("utf-8", "ignore")
        text = re.sub(r"<[^>]+>", " ", html)
        text = re.sub(r"\s+", " ", text).strip()

        size  = len(html)
        title_m = re.search(r"<title[^>]*>(.*?)</title>", html, re.DOTALL)
        title = re.sub(r"<[^>]+>","",title_m.group(1)).strip()[:60] if title_m else "?"

        has_tw    = any(k.lower() in text.lower() for k in TW_KW)
        has_show  = any(k.lower() in text.lower() for k in SHOW_KW)
        blocked   = any(x in html for x in ["cf-browser-verification","Enable JavaScript and cookies","Just a moment","challenge-platform","__cf_chl"])
        js_only   = size < 4000 or ("window.__" in html and len(re.findall(r"<(?:li|article|div class=\"event|div class=\"activity)", html)) == 0)

        # Count detectable event entries
        event_links = re.findall(r'href="[^"]*(?:event|activity|detail|concert|ticket)[^"]*"', html, re.IGNORECASE)
        dates = re.findall(r"20(?:25|26|27)[/\-]\d{1,2}[/\-]\d{1,2}", text)
        json_ld = len(re.findall(r'application/ld\+json', html))

        status = "✅ 可爬" if (not blocked and not js_only and size > 5000 and (has_tw or has_show)) \
            else ("🚫 Bot防護" if blocked else ("⚠️  JS渲染" if js_only else "❓ 需確認"))

        print(f"\n{'='*55}")
        print(f"【{name}】 {status}")
        print(f"  URL    : {url}")
        print(f"  Title  : {title}")
        print(f"  Size   : {size:,} bytes | JSON-LD blocks: {json_ld}")
        print(f"  TW kw  : {has_tw} | Show kw: {has_show} | Blocked: {blocked} | JS-only: {js_only}")
        print(f"  Event links: {len(event_links)} | Dates found: {len(dates)}")
        print(f"  Sample dates: {dates[:4]}")
        # show a snippet of event links
        unique_ev = list(dict.fromkeys(event_links))[:5]
        for l in unique_ev:
            print(f"    -> {l[:100]}")
        return status
    except Exception as e:
        print(f"\n【{name}】 ❌ ERROR: {e}")
        return "❌ Error"

results = {}
for name, url in PLATFORMS:
    results[name] = probe(name, url)
    time.sleep(1.5)

print("\n\n" + "="*55)
print("總結")
print("="*55)
for name, status in results.items():
    print(f"  {name:15s}: {status}")
