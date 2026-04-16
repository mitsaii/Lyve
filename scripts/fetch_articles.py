#!/usr/bin/env python3
"""
Batch-scans kpopn.com listing pages to find Taiwan concert articles.
Usage:
  python3 scripts/fetch_articles.py             # scan pages 1-8, output JSON
  python3 scripts/fetch_articles.py --pages 15  # scan first 15 pages
"""
import re
import json
import ssl
import sys
import time
import urllib.request

SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE
HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}

TW_KEYWORDS = ["台北", "高雄", "台灣", "台中", "桃園", "林口", "開唱", "演唱會"]
CONCERT_KEYWORDS = ["演唱會", "開唱", "巡演", "巡迴"]

def fetch(url, timeout=20):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=timeout, context=SSL_CTX) as r:
        return r.read().decode("utf-8", errors="ignore")

def strip_tags(html):
    return re.sub(r"<[^>]+>", " ", html)

def clean(s):
    return re.sub(r"\s+", " ", s).strip()

def extract_context(url, text=None, keyword=None, window=150):
    try:
        html = fetch(url)
        # Get title
        title_m = re.search(r"<h1[^>]*>(.*?)</h1>", html, re.S)
        title = clean(strip_tags(title_m.group(1))) if title_m else "?"
        
        # Get article body (content between entry-content or article body)
        body_m = re.search(r'class="entry-content[^"]*"[^>]*>(.*?)</div>', html, re.DOTALL)
        if not body_m:
            body_m = re.search(r'<article[^>]*>(.*?)</article>', html, re.DOTALL)
        
        body_html = body_m.group(1) if body_m else html
        text = clean(strip_tags(body_html))
        
        # Check if this is a Taiwan concert article
        has_tw = any(kw in text for kw in TW_KEYWORDS)
        has_concert = any(kw in text for kw in CONCERT_KEYWORDS)
        
        if not (has_tw and has_concert):
            return None
        
        # Extract date patterns
        dates = re.findall(r"20(?:25|26)/\d{1,2}/\d{1,2}(?:-\d{1,2})?", text)
        dates += re.findall(r"20(?:25|26)年\d{1,2}月\d{1,2}日", text)
        
        # Extract venue patterns
        venues = re.findall(r"(?:台北|高雄|台中|林口)[^\s，,。、]{0,20}(?:巨蛋|場館|體育館|小巨蛋|大巨蛋|Arena)", text)
        
        # Extract price patterns
        prices = re.findall(r"NT\$[\s]?[\d,]+[^元\s]{0,20}", text)
        
        # Find images
        imgs = re.findall(r'https://www\.kpopn\.com/upload/[a-f0-9]+\.[a-z]+', html)
        
        return {
            "url": url,
            "title": title,
            "dates": list(dict.fromkeys(dates))[:3],
            "venues": list(dict.fromkeys(venues))[:3],
            "prices": list(dict.fromkeys(prices))[:3],
            "image": imgs[0] if imgs else None,
            "snippet": text[:500],
        }
    except Exception as e:
        return {"url": url, "error": str(e)}

# ── Article URL list ─────────────────────────────────────────────────────────
ARTICLE_URLS = [
    # Known concert articles from previous session
    "https://www.kpopn.com/2025/10/22/news-nct-wish-taiwan-concert",
    "https://www.kpopn.com/2026/02/03/news-mingyu-cxm-seventeen-tour",
    "https://www.kpopn.com/2026/01/26/news-seventeen-mingyu-cxm",
    # TWICE Taipei Dome (just confirmed - for sold_out)
    "https://www.kpopn.com/2026/03/23/news-tzuyu-twice-taipeidome-concert",
    # IVE Taiwan if any
    "https://www.kpopn.com/2026/01/16/news-ive-taiwan-concert",
    # aespa Taiwan
    "https://www.kpopn.com/2025/11/15/news-aespa-taiwan-concert",
    # SEVENTEEN taipei (CXM TOUR)
    "https://www.kpopn.com/2026/03/05/news-seventeen-cxm-taipei",
    "https://www.kpopn.com/2026/01/20/news-seventeen-cxm-tour-taipei",
    # boynextdoor taiwan
    "https://www.kpopn.com/2025/11/01/news-boynextdoor-taiwan",
    # ITZY taiwan
    "https://www.kpopn.com/2025/10/01/news-itzy-taiwan-concert",
    "https://www.kpopn.com/2026/02/15/news-itzy-taipei",
    # SHINee Key
    "https://www.kpopn.com/2025/12/20/news-key-shinee-taiwan",
    # Epik High
    "https://www.kpopn.com/2025/09/20/news-epik-high-taiwan",
]

if __name__ == "__main__":
    results = []
    for url in ARTICLE_URLS:
        print(f"Fetching: {url.split('/')[-1]}", file=sys.stderr)
        result = extract_context(url)
        if result and "error" not in result:
            results.append(result)
            print(f"  ✓ MATCH: {result['title'][:60]}", file=sys.stderr)
            print(f"    Dates: {result['dates']}", file=sys.stderr)
            print(f"    Venues: {result['venues']}", file=sys.stderr)
        elif result and "error" in result:
            print(f"  ✗ ERROR: {result['error']}", file=sys.stderr)
        else:
            print(f"  - Not a Taiwan concert article", file=sys.stderr)
    
    print(json.dumps(results, ensure_ascii=False, indent=2))
