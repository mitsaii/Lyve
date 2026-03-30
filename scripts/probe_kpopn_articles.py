#!/usr/bin/env python3
import re
import ssl
import urllib.request

URLS = [
    'https://www.kpopn.com/2025/10/22/news-nct-wish-taiwan-concert',
    'https://www.kpopn.com/2026/03/05/news-seventeen-cxm-taipei',
    'https://www.kpopn.com/2025/11/15/news-aespa-taiwan-concert',
    'https://www.kpopn.com/2025/10/01/news-itzy-taiwan-concert',
    'https://www.kpopn.com/2025/11/01/news-boynextdoor-taiwan',
    'https://www.kpopn.com/2025/12/20/news-key-shinee-taiwan',
    'https://www.kpopn.com/2025/09/20/news-epik-high-taiwan',
]

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

for url in URLS:
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        html = urllib.request.urlopen(req, timeout=25, context=ctx).read().decode('utf-8', 'ignore')
        title_match = re.search(r'<h1[^>]*>(.*?)</h1>', html, re.S)
        title = re.sub(r'<[^>]+>', ' ', title_match.group(1)).strip() if title_match else '?'
        text = re.sub(r'<[^>]+>', ' ', html)
        text = re.sub(r'\s+', ' ', text)

        dates = re.findall(r'20(?:25|26)[/年]\d{1,2}[/月]\d{1,2}(?:日)?(?:[-–]\d{1,2})?', text)
        if not dates:
            dates = re.findall(r'\d{1,2}月\d{1,2}日', text)

        venues = re.findall(r'(?:台北|臺北|高雄|台中|林口)[^，。,. ]{0,24}(?:巨蛋|小巨蛋|大巨蛋|體育館|場館|Arena)', text)

        print(f'URL: {url}')
        print(f'TITLE: {title[:160]}')
        print(f'DATES: {dates[:6]}')
        print(f'VENUES: {venues[:6]}')
        print('---')
    except Exception as e:
        print(f'URL: {url}')
        print(f'ERROR: {e}')
        print('---')
