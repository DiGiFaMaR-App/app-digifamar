#!/usr/bin/env python3
"""Seed App-DIGIFAMAR with demo farmers + listings derived from the mock catalog.

Creates one farmer auth user per mock farm (handle_new_user trigger auto-creates
the profile + farmer role + wallet), promotes each farmer_profile to verified,
and inserts the mock products as real listings. Idempotent on re-run.
"""
import json, os, sys, urllib.request, urllib.error

REF = "cgmwdwnijifwprgdkvxk"
BASE = f"https://{REF}.supabase.co"
ACCESS = os.environ["SUPABASE_ACCESS_TOKEN"]

def mgmt_query(sql):
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{REF}/database/query",
        data=json.dumps({"query": sql}).encode(),
        headers={"Authorization": f"Bearer {ACCESS}", "Content-Type": "application/json", "User-Agent": "curl/8.0"},
        method="POST",
    )
    with urllib.request.urlopen(req) as r:
        return json.load(r)

# fetch service_role key
def get_service_key():
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{REF}/api-keys?reveal=true",
        headers={"Authorization": f"Bearer {ACCESS}", "User-Agent": "curl/8.0"},
    )
    with urllib.request.urlopen(req) as r:
        for k in json.load(r):
            if k.get("name") == "service_role":
                return k["api_key"]
    raise RuntimeError("no service_role key")

SERVICE = get_service_key()

def auth_admin(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        f"{BASE}/auth/v1{path}", data=data, method=method,
        headers={"apikey": SERVICE, "Authorization": f"Bearer {SERVICE}",
                 "Content-Type": "application/json", "User-Agent": "curl/8.0"},
    )
    try:
        with urllib.request.urlopen(req) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        print("AUTH ERR", e.code, e.read().decode()[:300]); raise

def find_user_by_email(email):
    res = auth_admin("GET", f"/admin/users?page=1&per_page=200")
    for u in res.get("users", []):
        if u.get("email") == email:
            return u
    return None

def ensure_farmer(email, full_name):
    u = find_user_by_email(email)
    if u:
        return u["id"]
    u = auth_admin("POST", "/admin/users", {
        "email": email,
        "password": os.environ.get("DEMO_FARMER_PASSWORD", "DigifamarDemo!2026"),
        "email_confirm": True,
        "user_metadata": {"full_name": full_name, "role": "farmer"},
    })
    return u["id"]

FARMS = [
  ("blue-ridge","Blue Ridge Family Farm","Asheville","North Carolina","28801",35.5951,-82.5515,
   "Four generations of stewardship in the Blue Ridge foothills.",["USDA Organic","Non-GMO","Family Owned"]),
  ("sunrise-orchards","Sunrise Orchards","Walla Walla","Washington","99362",46.0646,-118.343,
   "Award-winning stone fruit and heritage apples from the high desert.",["USDA Organic","Non-GMO"]),
  ("morning-glory","Morning Glory Dairy","Madison","Wisconsin","53703",43.0731,-89.4012,
   "Small-herd Jersey dairy producing creamline milk, butter, and cheese.",["Pasture-Raised","Non-GMO"]),
  ("golden-meadow","Golden Meadow Apiary","Bozeman","Montana","59715",45.6769,-111.0429,
   "Single-origin raw honey and beeswax goods from 400 hives.",["Raw","Unfiltered","Small Batch"]),
  ("river-bend","River Bend Produce","Lancaster","Pennsylvania","17602",40.0379,-76.3055,
   "Amish-country roots; 80+ varieties of heirloom vegetables.",["USDA Organic","Heirloom"]),
  ("homestead-hollow","Homestead Hollow Farm","Austin","Texas","78701",30.2672,-97.7431,
   "Grass-fed beef, pastured pork, and free-range eggs.",["Grass-Fed","Pasture-Raised","Non-GMO"]),
]

PRODUCTS = [
  ("heirloom-tomatoes","Heirloom Tomato Mix","river-bend","vegetables",550,24,"lb",
   "Vine-ripened heirlooms picked the morning of shipment."),
  ("honeycrisp-apples","Honeycrisp Apples","sunrise-orchards","fruits",325,180,"lb",
   "Crisp, sweet-tart Honeycrisps with that signature snap."),
  ("creamline-milk","Creamline Whole Milk","morning-glory","dairy-eggs",725,36,"half gal",
   "Non-homogenized, low-temp pasteurized milk from grass-fed Jerseys."),
  ("wildflower-honey","Raw Wildflower Honey","golden-meadow","honey-preserves",1400,52,"jar",
   "Single-origin wildflower honey from Gallatin Valley hives."),
  ("grass-fed-ribeye","Grass-Fed Ribeye Steak","homestead-hollow","meat-poultry",2800,18,"steak",
   "100% grass-fed, dry-aged ribeye from Texas Hill Country pasture."),
  ("salad-mix","Spring Salad Mix","blue-ridge","vegetables",600,42,"bag",
   "A fresh blend of baby lettuces, arugula, mizuna, and edible flowers."),
  ("pasture-eggs","Pasture-Raised Eggs","blue-ridge","dairy-eggs",850,60,"dozen",
   "Eggs from hens that roam 5 acres of fresh pasture daily."),
  ("peach-preserves","Small-Batch Peach Preserves","sunrise-orchards","honey-preserves",1100,28,"jar",
   "Cooked in small copper kettles with our own orchard peaches."),
]

def q(s): return s.replace("'", "''")

farm_ids = {}
for slug, name, city, state, zipc, lat, lng, desc, certs in FARMS:
    email = f"{slug}@farms.digifamar.demo"
    uid = ensure_farmer(email, name)
    farm_ids[slug] = uid
    print("farmer", slug, uid)

# farmer_profiles (verified) + a buyer test account
sql = []
for slug, name, city, state, zipc, lat, lng, desc, certs in FARMS:
    uid = farm_ids[slug]
    certs_arr = "ARRAY[" + ",".join(f"'{q(c)}'" for c in certs) + "]::text[]"
    sql.append(f"""INSERT INTO public.farmer_profiles
      (user_id, farm_name, description, city, state, zip, lat, lng, certifications, verification_status)
      VALUES ('{uid}','{q(name)}','{q(desc)}','{q(city)}','{q(state)}','{zipc}',{lat},{lng},{certs_arr},'verified')
      ON CONFLICT (user_id) DO UPDATE SET verification_status='verified',
        farm_name=EXCLUDED.farm_name, description=EXCLUDED.description, city=EXCLUDED.city,
        state=EXCLUDED.state, zip=EXCLUDED.zip, lat=EXCLUDED.lat, lng=EXCLUDED.lng,
        certifications=EXCLUDED.certifications;""")

for pid, name, farm, cat, price, stock, unit, desc in PRODUCTS:
    uid = farm_ids[farm]
    sql.append(f"""INSERT INTO public.listings
      (farmer_id, title, slug, category, description, price_cents, qty_available, unit, status)
      VALUES ('{uid}','{q(name)}','{pid}','{cat}','{q(desc)}',{price},{stock},'{q(unit)}','active')
      ON CONFLICT (slug) DO UPDATE SET title=EXCLUDED.title, category=EXCLUDED.category,
        description=EXCLUDED.description, price_cents=EXCLUDED.price_cents,
        qty_available=EXCLUDED.qty_available, unit=EXCLUDED.unit, status='active';""")

res = mgmt_query("\n".join(sql))
print("seed result:", res)

counts = mgmt_query("SELECT (SELECT count(*) FROM public.listings) AS listings, (SELECT count(*) FROM public.farmer_profiles) AS farmers, (SELECT count(*) FROM public.user_roles WHERE role='farmer') AS farmer_roles;")
print("counts:", counts)
