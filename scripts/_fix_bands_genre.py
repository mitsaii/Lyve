"""
修正資料庫中 genre 分類錯誤的演唱會：
- 將應為 'bands' 的演唱會從 cpop/western 改成 bands
用法：cd taiwan-concerts && python3 scripts/_fix_bands_genre.py
"""
import json, ssl, urllib.request, urllib.parse, re

env = open(".env.local").read()
svc = re.search(r"SUPABASE_SERVICE_ROLE_KEY=(.+)", env).group(1).strip().strip('"').strip("'")
base_url = re.search(r"NEXT_PUBLIC_SUPABASE_URL=(.+)", env).group(1).strip().strip('"').strip("'")
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

HEADERS = {"apikey": svc, "Authorization": f"Bearer {svc}", "Content-Type": "application/json"}

# 應歸類為 bands 的關鍵字（小寫）
_BANDS = {
    # 台灣樂團
    "五月天", "mayday", "告五人", "accusefive", "茄子蛋", "動力火車", "power station",
    "草東沒有派對", "no party for cao dong", "落日飛車", "sunset rollercoaster",
    "盧廣仲", "sodagreen", "蘇打綠", "傻子與白痴", "拍謝少年", "sorry youth",
    "大象體操", "elephant gym", "老王樂隊", "宇宙人", "cosmos people",
    "魚丁糸", "滅火器", "fire ex", "旺福", "wonfu", "閃靈", "chthonic",
    "橘子海", "tan lines", "山嵐", "生祥樂隊", "甜約翰", "deca joins",
    # 西洋樂團
    "coldplay", "arctic monkeys", "radiohead", "oasis", "the 1975",
    "kings of leon", "imagine dragons", "linkin park", "green day",
    "foo fighters", "red hot chili peppers", "rhcp", "maroon 5",
    "the killers", "thirty seconds to mars", "30 seconds to mars",
    "fall out boy", "panic! at the disco", "my chemical romance",
    "paramore", "weezer", "blink-182", "sum 41", "simple plan",
    "muse", "blur", "the strokes", "vampire weekend", "mgmt",
    "the national", "bon iver", "fleet foxes", "beach house",
    "tame impala", "alvvays", "japanese breakfast", "big thief",
    "phoebe bridgers", "boygenius", "death cab for cutie",
    "modest mouse", "arcade fire", "wolf parade", "broken social scene",
    "phoenix", "two door cinema club", "the xx", "glass animals",
    "alt-j", "foals", "bastille", "nothing but thieves", "frank turner",
    "the lumineers", "mumford", "of monsters and men",
    "the head and the heart", "iron & wine", "explosions in the sky",
    "bring me the horizon", "bmth", "a day to remember",
    "pierce the veil", "sleeping with sirens",
    "portishead", "massive attack", "röyksopp",
}

def api(method, path, body=None):
    url = base_url + path
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=HEADERS, method=method)
    with urllib.request.urlopen(req, context=ctx) as r:
        return json.loads(r.read()) if r.length else []

# 1. 取出所有非 bands 的演唱會
print("🔍 查詢資料庫...")
concerts = api("GET", "/rest/v1/concerts?select=id,artist,genre&limit=300")
print(f"   共 {len(concerts)} 筆")

# 2. 找出需要改成 bands 的
to_fix = []
for c in concerts:
    if c["genre"] == "bands":
        continue
    name_lower = c["artist"].lower()
    if any(k.lower() in name_lower for k in _BANDS):
        to_fix.append(c)

print(f"\n📋 需要修正為 'bands' 的演唱會（共 {len(to_fix)} 筆）：")
for c in to_fix:
    print(f"   [{c['genre']:10s}] → bands  |  {c['artist']}")

if not to_fix:
    print("   ✅ 沒有需要修正的！")
else:
    fixed = 0
    for c in to_fix:
        api("PATCH", f"/rest/v1/concerts?id=eq.{c['id']}", {"genre": "bands"})
        print(f"   ✅ 已更新：{c['artist']}")
        fixed += 1
    print(f"\n🎸 完成！共修正 {fixed} 筆")
