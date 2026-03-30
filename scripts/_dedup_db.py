"""刪除 concerts 資料表中的重複資料，保留 id 較小（較早）的那一筆。"""
import json, ssl, urllib.request, re

env = open(".env.local").read()
svc = re.search(r"SUPABASE_SERVICE_ROLE_KEY=(.+)", env).group(1).strip()
base_url = re.search(r"NEXT_PUBLIC_SUPABASE_URL=(.+)", env).group(1).strip()

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def req(url, method="GET", data=None, extra_headers=None):
    headers = {"apikey": svc, "Authorization": f"Bearer {svc}"}
    if extra_headers:
        headers.update(extra_headers)
    if data:
        headers["Content-Type"] = "application/json"
    r = urllib.request.Request(url, data=data, method=method, headers=headers)
    with urllib.request.urlopen(r, context=ctx, timeout=20) as resp:
        body = resp.read()
        return json.loads(body) if body else []

# Fetch all concerts
all_rows = req(base_url + "/rest/v1/concerts?select=id,artist,date_str,venue_zh&order=id.asc&limit=500")
print(f"總筆數: {len(all_rows)}")

# Group by (artist, date_str, venue_zh)
groups = {}
for r in all_rows:
    k = (r["artist"], r["date_str"], r["venue_zh"])
    groups.setdefault(k, []).append(r["id"])

delete_ids = []
for k, ids in groups.items():
    if len(ids) > 1:
        # Keep smallest id, delete the rest
        to_del = ids[1:]
        print(f"  重複: {k[0]} | {k[1]} — 刪除 id {to_del}，保留 {ids[0]}")
        delete_ids.extend(to_del)

if not delete_ids:
    print("沒有重複，無需操作。")
else:
    # Delete via Supabase REST: DELETE /concerts?id=in.(1,2,3)
    ids_str = ",".join(str(i) for i in delete_ids)
    del_url = base_url + f"/rest/v1/concerts?id=in.({ids_str})"
    req(del_url, method="DELETE")
    print(f"\n✓ 已刪除 {len(delete_ids)} 筆重複資料")
    remaining = req(base_url + "/rest/v1/concerts?select=id&limit=1000")
    print(f"✓ 剩餘筆數: {len(remaining)}")
