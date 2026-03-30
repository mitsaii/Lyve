import json, ssl, urllib.request, re
from collections import Counter

env = open(".env.local").read()
svc = re.search(r"SUPABASE_SERVICE_ROLE_KEY=(.+)", env).group(1).strip()
base_url = re.search(r"NEXT_PUBLIC_SUPABASE_URL=(.+)", env).group(1).strip()

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = base_url + "/rest/v1/concerts?select=artist,date_str,venue_zh,genre,status&order=date_str.asc&limit=200"
req = urllib.request.Request(url, headers={"apikey": svc, "Authorization": f"Bearer {svc}"})
with urllib.request.urlopen(req, context=ctx) as r:
    data = json.loads(r.read())

print(f"總筆數: {len(data)}")

# 重複檢查
seen = {}
for r in data:
    k = (r["artist"], r["date_str"], r["venue_zh"])
    seen.setdefault(k, 0)
    seen[k] += 1
dups = {k: v for k, v in seen.items() if v > 1}
print(f"重複筆數: {len(dups)}")
if dups:
    for k, v in list(dups.items())[:5]:
        print(f"  {k[0]} | {k[1]} | {k[2]}  x{v}")

print()
print("類型分布:")
for g, cnt in Counter(r["genre"] for r in data).most_common():
    bar = "█" * cnt
    print(f"  {g:12s}: {cnt:2d} 場  {bar}")

print()
print("最近 5 場（依日期）:")
for r in data[:5]:
    print(f"  {r['date_str']}  {r['artist']:20s}  {r['venue_zh']:15s}  [{r['genre']}]")
