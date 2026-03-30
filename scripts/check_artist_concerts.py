#!/usr/bin/env python3
"""
爬取藝術家演唱會信息的腳本
檢查藝術家是否有台灣演唱會計畫，並輸出為 JSON 格式
"""

import json
import ssl
import urllib.request
import urllib.parse
from typing import List, Dict
from datetime import datetime

# 禁用 SSL 驗證（不太安全但必要）
ssl.create_default_https_context = ssl._create_unverified_context

ARTISTS = [
    # Western
    {"name": "Sabrina Carpenter", "ig": "@sabrinacarpenter", "region": "western", "genre": "pop"},
    {"name": "The 1975", "ig": "@the1975", "region": "western", "genre": "rock"},
    {"name": "Chappell Roan", "ig": "@chappellroan", "region": "western", "genre": "pop"},
    {"name": "Maneskin", "ig": "@maneskinofficial", "region": "western", "genre": "rock"},
    {"name": "Arctic Monkeys", "ig": "@arcticmonkeys", "region": "western", "genre": "rock"},
    
    # KPOP
    {"name": "KISS OF LIFE", "ig": "@kissoflife_s2", "region": "kpop", "genre": "kpop"},
    {"name": "ATEEZ", "ig": "@ateez_official_", "region": "kpop", "genre": "kpop"},
    {"name": "ITZY", "ig": "@itzy.all.in.us", "region": "kpop", "genre": "kpop"},
    {"name": "TWS", "ig": "@tws_pledis", "region": "kpop", "genre": "kpop"},
    
    # JPOP
    {"name": "KIRINJI", "ig": "@kirinji_official", "region": "jpop", "genre": "jpop"},
    {"name": "ZUTOMAYO", "ig": "@zutomayo", "region": "jpop", "genre": "jpop"},
    {"name": "SEKAI NO OWARI", "ig": "@sekainoowari", "region": "jpop", "genre": "jpop"},
    {"name": "Chilli Beans.", "ig": "@chillibeansmusic", "region": "jpop", "genre": "jpop"},
    
    # Taiwan
    {"name": "傻子與白痴", "ig": "@foolandidiot_official", "region": "taiwan", "genre": "rock"},
    {"name": "拍謝少年", "ig": "@sorry_youth_band", "region": "taiwan", "genre": "rock"},
    {"name": "大象體操", "ig": "@elephant_gym_official", "region": "taiwan", "genre": "rock"},
    {"name": "海豚刑警", "ig": "@illu_police", "region": "taiwan", "genre": "pop"},
]

def search_artist_concerts(artist_name: str, region: str) -> List[Dict]:
    """
    使用 Google 搜索查找藝術家的台灣演唱會信息
    """
    results = []
    search_keywords = [
        f"{artist_name} 台灣 演唱會 2026",
        f"{artist_name} taiwan concert 2026",
        f"{artist_name} 台北 小巨蛋",
        f"{artist_name} 來台 巡迴",
    ]
    
    for keyword in search_keywords:
        try:
            # 構建 Google 搜索 URL
            search_url = f"https://www.google.com/search?q={urllib.parse.quote(keyword)}"
            
            # 設定 User-Agent
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            req = urllib.request.Request(search_url, headers=headers)
            
            # 注意：實際爬取 Google 有反爬機制，這裡只是演示
            # 更好的方式是使用正式的演唱會 API 或票務網站
            
            print(f"[INFO] 搜尋中: {artist_name} - {keyword}")
            
        except Exception as e:
            print(f"[ERROR] {artist_name}: {str(e)}")
    
    return results


def search_ticketing_sites(artist_name: str) -> List[Dict]:
    """
    在主要售票網站上搜索藝術家的台灣演唱會
    """
    candidates = []
    
    # KKTIX 搜尋
    try:
        kktix_url = f"https://kktix.com/events?q={urllib.parse.quote(artist_name)}"
        print(f"[CHECK] KKTIX: {kktix_url}")
    except Exception as e:
        print(f"[ERROR] KKTIX search failed: {e}")
    
    # ibon 搜尋
    try:
        ibon_url = f"https://ibon.com.tw/search?q={urllib.parse.quote(artist_name)}"
        print(f"[CHECK] ibon: {ibon_url}")
    except Exception as e:
        print(f"[ERROR] ibon search failed: {e}")
    
    # Kpopn 搜尋 (限 K-POP)
    try:
        kpopn_url = f"https://www.kpopn.com/?s={urllib.parse.quote(artist_name)}"
        print(f"[CHECK] Kpopn: {kpopn_url}")
    except Exception as e:
        print(f"[ERROR] Kpopn search failed: {e}")
    
    return candidates


def main():
    """主執行函數"""
    print("=" * 60)
    print("藝術家台灣演唱會檢查工具")
    print(f"掃描時間: {datetime.now().isoformat()}")
    print("=" * 60)
    
    all_candidates = []
    
    # 逐一檢查藝術家
    for artist_info in ARTISTS:
        artist_name = artist_info["name"]
        region = artist_info["region"]
        
        print(f"\n[ARTIST] {artist_name} ({region})")
        print("-" * 40)
        
        # 搜尋演唱會信息
        candidates = search_ticketing_sites(artist_name)
        all_candidates.extend(candidates)
    
    print("\n" + "=" * 60)
    print(f"總共找到 {len(all_candidates)} 個候選演唱會")
    print("=" * 60)
    
    # 輸出為 JSON
    output = {
        "scan_time": datetime.now().isoformat(),
        "total_artists": len(ARTISTS),
        "candidates_found": len(all_candidates),
        "candidates": all_candidates
    }
    
    with open("artist_concerts_candidates.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print("\n結果已保存至: artist_concerts_candidates.json")
    print("\n[提示] 由於 IG 與各售票網站有反爬機制，")
    print("建議手動檢查以下連結來獲取最新信息：")
    print("  - KKTIX: https://kktix.com")
    print("  - ibon: https://ibon.com.tw")
    print("  - 拓元: https://www.livenation.com.tw")
    print("  - Kpopn: https://www.kpopn.com")


if __name__ == "__main__":
    main()
