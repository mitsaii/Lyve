"""
手動補圖工具：編輯下方的 MANUAL_IMAGES 字典，填入圖片 URL，執行即可更新
使用方式：
  1. 用 Google/Bing 搜尋「{音樂祭名稱} 2025 海報」
  2. 右鍵複製圖片位址（必須是直接圖片 URL，如 .jpg/.png/.webp 結尾）
  3. 貼進下方字典對應的鍵值
  4. 執行 .venv/bin/python scripts/_manual_images.py
"""
import json, ssl, urllib.request, re

env = open(".env.local").read()
svc = re.search(r"SUPABASE_SERVICE_ROLE_KEY=(.+)", env).group(1).strip()
base_url = re.search(r"NEXT_PUBLIC_SUPABASE_URL=(.+)", env).group(1).strip()
ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE

# ────────────────────────────────────────────────────────────────────────────
# 在這裡填入圖片 URL
MANUAL_IMAGES = {
    "貴人散步音樂節":   "",   # 搜尋: 貴人散步音樂節 2025 海報
    "浪人祭":          "",   # 搜尋: 浪人祭音樂節 2025
    "月光·海音樂會":   "",   # 搜尋: 月光海音樂會 2025
    "覺醒音樂節":      "",   # 搜尋: 覺醒音樂節 2025
    "有機體音樂節":    "",   # 搜尋: 有機體音樂節 2025
    "Smoke Machine Taipei": "",  # 搜尋: Smoke Machine Taipei
    "島嶼音樂節":      "",   # 搜尋: 島嶼音樂節 台灣 2025
    "打狗祭":          "",   # 搜尋: 打狗祭 高雄 2025
}
# ────────────────────────────────────────────────────────────────────────────

def supa_req(path, method="GET", data=None):
    h = {"apikey": svc, "Authorization": f"Bearer {svc}"}
    if data: h["Content-Type"] = "application/json"
    req = urllib.request.Request(base_url + path, data=data, method=method, headers=h)
    with urllib.request.urlopen(req, context=ctx, timeout=20) as r:
        body = r.read()
        return json.loads(body) if body else []

rows = supa_req("/rest/v1/concerts?select=id,artist&limit=300")
id_map = {r["artist"]: r["id"] for r in rows}

updated = 0
for artist, url in MANUAL_IMAGES.items():
    if not url.strip():
        print(f"  – {artist}: 尚未填入")
        continue
    if artist not in id_map:
        print(f"  ? {artist}: DB 中找不到此藝人")
        continue
    body = json.dumps({"image_url": url.strip()}).encode()
    supa_req(f"/rest/v1/concerts?id=eq.{id_map[artist]}", method="PATCH", data=body)
    print(f"  ✓ {artist}: 已更新")
    updated += 1

print(f"\n完成！更新 {updated} 筆")
