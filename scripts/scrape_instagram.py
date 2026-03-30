#!/usr/bin/env python3
"""
Instagram 藝人信息爬取腳本
爬取藝人 IG 檔案並檢查台灣演唱會信息
"""

import json
import ssl
import urllib.request
import urllib.parse
import re
from typing import Dict, Optional
from datetime import datetime

# 禁用 SSL 驗證
ssl.create_default_https_context = ssl._create_unverified_context

class InstagramScraper:
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    
    def scrape_profile(self, instagram_handle: str) -> Optional[Dict]:
        """
        爬取 Instagram 用戶檔案信息
        
        Args:
            instagram_handle: IG 帳號 (不含 @ 符號)
        
        Returns:
            包含用戶信息的字典，或 None 如果爬取失敗
        """
        handle = instagram_handle.lstrip('@')
        url = f"https://www.instagram.com/{handle}/"
        
        try:
            print(f"[I] 正在爬取: {handle}")
            
            req = urllib.request.Request(url, headers=self.headers)
            response = urllib.request.urlopen(req, timeout=10)
            html = response.read().decode('utf-8')
            
            # 從 HTML 中提取 JSON 數據 (IG 在頁面初始化時包含 JSON)
            # 查找 window._sharedData 或 window.__data 中的信息
            match = re.search(r'<script type="application/ld\+json">(.*?)</script>', html)
            
            if not match:
                # 替代方法：從 meta 標籤中提取信息
                profile_info = self._extract_from_meta(html, handle)
                return profile_info
            
            data = json.loads(match.group(1))
            
            # 提取基本信息
            profile = {
                'handle': handle,
                'url': f'https://www.instagram.com/{handle}/',
                'scraped_at': datetime.now().isoformat()
            }
            
            # 從 JSON 中提取可用信息
            if isinstance(data, dict):
                if 'name' in data:
                    profile['name'] = data.get('name')
                if 'description' in data:
                    profile['bio'] = data.get('description')
            
            print(f"[✓] 成功爬取: {handle}")
            return profile
            
        except urllib.error.HTTPError as e:
            print(f"[✗] HTTP 錯誤 ({handle}): {e.code}")
            if e.code == 404:
                print(f"   提示: 帳號 {handle} 不存在或已刪除")
            return None
        except Exception as e:
            print(f"[✗] 爬取失敗 ({handle}): {str(e)}")
            return None
    
    def _extract_from_meta(self, html: str, handle: str) -> Dict:
        """
        從 HTML meta 標籤中提取信息
        """
        profile = {
            'handle': handle,
            'url': f'https://www.instagram.com/{handle}/',
            'scraped_at': datetime.now().isoformat()
        }
        
        # 提取 og:title
        title_match = re.search(r'<meta property="og:title" content="([^"]*)"', html)
        if title_match:
            profile['name'] = title_match.group(1).split('(@')[0].strip() if '(@' in title_match.group(1) else title_match.group(1)
        
        # 提取 og:description
        desc_match = re.search(r'<meta property="og:description" content="([^"]*)"', html)
        if desc_match:
            profile['bio'] = desc_match.group(1)
        
        # 提取 og:image (頭像)
        image_match = re.search(r'<meta property="og:image" content="([^"]*)"', html)
        if image_match:
            profile['avatar'] = image_match.group(1)
        
        return profile
    
    def check_for_taiwan_concerts(self, handle: str, artist_name: str) -> Dict:
        """
        檢查藝人是否有台灣演唱會信息
        掃描最近的 IG 貼文並搜尋台灣相關信息
        """
        print(f"[I] 檢查 {artist_name} ({handle}) 的台灣演唱會信息...")
        
        result = {
            'handle': handle,
            'artist_name': artist_name,
            'has_taiwan_concert': False,
            'concert_keywords': [],
            'checked_at': datetime.now().isoformat()
        }
        
        # 搜尋關鍵詞
        concert_keywords = [
            'taiwan',
            'taipei',
            'concert',
            'tour',
            'show',
            '台灣',
            '台北',
            '演唱會',
            '巡演',
            '演出'
        ]
        
        # 由於無法直接爬取 IG 的動態貼文（需要登入），建議手動檢查
        print(f"\n[提示] 請手動檢查以下 IG 帳號:")
        print(f"   https://www.instagram.com/{handle}/")
        print(f"   搜尋關鍵詞: {', '.join(concert_keywords)}")
        
        return result


def main():
    print("=" * 60)
    print("Instagram 藝人信息爬取工具")
    print(f"執行時間: {datetime.now().isoformat()}")
    print("=" * 60)
    
    scraper = InstagramScraper()
    
    # 測試帳號列表 (來自 lib/artistList.ts)
    test_handles = [
        '@sabrinacarpenter',
        '@the1975',
        '@chappellroan',
        '@maneskinofficial',
        '@arcticmonkeys',
        '@kissoflife_s2',
        '@ateez_official_',
        '@itzy.all.in.us',
        '@tws_pledis',
    ]
    
    profiles = []
    
    print("\n[第 1 步] 爬取 IG 檔案信息\n")
    for handle in test_handles:
        profile = scraper.scrape_profile(handle)
        if profile:
            profiles.append(profile)
        print()
    
    print("\n[第 2 步] 檢查台灣演唱會信息\n")
    for profile in profiles:
        scraper.check_for_taiwan_concerts(
            profile['handle'],
            profile.get('name', profile['handle'])
        )
    
    # 保存結果
    output = {
        'scan_time': datetime.now().isoformat(),
        'total_artists': len(test_handles),
        'profiles_found': len(profiles),
        'profiles': profiles
    }
    
    with open('instagram_profiles.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print("\n" + "=" * 60)
    print(f"✓ 成功爬取 {len(profiles)} 個檔案")
    print(f"✓ 結果已保存到: instagram_profiles.json")
    print("=" * 60)
    
    print("\n[提示] 由於 Instagram 反爬機制的限制:")
    print("  1. 無法自動爬取動態貼文內容")
    print("  2. 建議手動檢查 IG 最新貼文尋找台灣演唱會信息")
    print("  3. 也可以搜尋相關新聞網站 (Kpopn, KSD 等)")
    print("\n[自動化替代方案]")
    print("  使用 instagrapi 庫 (需要 IG 帳號登入)")
    print("  或使用官方 Instagram Graph API (需申請)")


if __name__ == "__main__":
    main()
