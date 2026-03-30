"""檢查 DB 中各活動的 image_url 狀態"""
import json, ssl, urllib.request, re

env = open(".env.local").read()
svc = re.search(r"SUPABASE_SERVICE_ROLE_KEY=(.+)", env).group(1).strip()
base_url = re.search(r"NEXT_PUBLIC_SUPABASE_URL=(.+)", env).group(1).strip()

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def fetch_json(url):
    r = urllib.request.Request(url, headers={"apikey": svc, "Authorization": f"Bearer {svc}"})
    with urllib.request.urlopen(r, context=ctx, timeout=20) as resp:
        return json.loads(resp.read())

rows = fetch_json(base_url + "/rest/v1/concerts?select=id,artist,platform,image_url&order=id.asc&limit=200")
total = len(rows)
has_img = [r for r in rows if r.get("image_url")]
no_img  = [r for r in rows if not r.get("image_url")]

print(f"總筆數: {total}")
print(f"有圖片: {len(has_img)}")
print(f"缺圖片: {len(no_img)}")
print()
print("缺圖片的活動:")
for r in no_img:
    print(f"  [{r['platform'][:10]}] {r['artist']}")
print()
print("有圖片範例:")
for r in has_img[:3]:
    print(f"  {r['artist']:20s}  {r['image_url'][:70]}")
