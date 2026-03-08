import csv
import random
from datetime import date, timedelta

random.seed(42)

# ── Customers ────────────────────────────────────────────────────────────────
STATES = ["CA","TX","NY","FL","WA","IL","PA","OH","GA","NC","MI","NJ","VA","AZ","MA"]
NAMES  = ["Alice Johnson","Bob Smith","Carol Davis","Dan Wilson","Eve Martinez",
          "Frank Brown","Grace Lee","Henry Taylor","Iris Anderson","Jack Thomas",
          "Karen Jackson","Leo White","Mia Harris","Nate Clark","Olivia Lewis",
          "Paul Robinson","Quinn Hall","Rachel Young","Sam King","Tina Wright",
          "Uma Scott","Victor Green","Wendy Adams","Xavier Baker","Yara Gonzalez",
          "Zach Nelson","Amy Carter","Brian Mitchell","Claire Perez","Dylan Roberts",
          "Elena Turner","Felix Phillips","Gina Campbell","Hank Parker","Iris Evans",
          "Jake Edwards","Kara Collins","Liam Stewart","Maya Sanchez","Noah Morris",
          "Olivia Rogers","Paul Reed","Quinn Cook","Rachel Morgan","Sam Bell",
          "Tina Murphy","Uma Bailey","Victor Rivera","Wendy Cooper","Zach Richardson",
          "Amy Cox","Brian Howard","Claire Ward","Dylan Torres","Elena Peterson",
          "Felix Gray","Gina Ramirez","Hank James","Iris Watson","Jake Brooks",
          "Kara Kelly","Liam Sanders","Maya Price","Noah Bennett","Olivia Wood",
          "Paul Barnes","Quinn Ross","Rachel Henderson","Sam Coleman","Tina Jenkins",
          "Uma Perry","Victor Powell","Wendy Long","Zach Patterson","Amy Hughes",
          "Brian Flores","Claire Washington","Dylan Butler","Elena Simmons","Felix Foster",
          "Gina Gonzales","Hank Bryant","Iris Alexander","Jake Russell","Kara Griffin",
          "Liam Diaz","Maya Hayes","Noah Myers","Olivia Ford","Paul Hamilton",
          "Quinn Graham","Rachel Sullivan","Sam Wallace","Tina Woods","Uma Cole",
          "Victor West","Wendy Jordan","Zach Owens","Amy Reynolds","Brian Fisher"]
TIERS  = ["Bronze","Silver","Gold"]
TIER_W = [0.5, 0.35, 0.15]

customers = []
base = date(2022, 1, 1)
for i in range(1, 101):
    sd = base + timedelta(days=random.randint(0, 365))
    customers.append({
        "customer_id": i,
        "name": NAMES[i-1],
        "state": random.choice(STATES),
        "signup_date": sd.isoformat(),
        "tier": random.choices(TIERS, TIER_W)[0]
    })

with open("customers.csv","w",newline="") as f:
    w = csv.DictWriter(f, fieldnames=["customer_id","name","state","signup_date","tier"])
    w.writeheader(); w.writerows(customers)

# ── Sales ─────────────────────────────────────────────────────────────────────
REGIONS    = ["North","South","East","West"]
CATEGORIES = ["Electronics","Clothing","Food","Books"]

# revenue ranges per category
REV_RANGE  = {"Electronics":(200,1500),"Clothing":(40,300),"Food":(10,80),"Books":(15,120)}
# seasonal multiplier by month
SEASON     = {1:.9,2:.85,3:1.0,4:1.05,5:1.1,6:1.0,7:.95,8:1.0,9:1.1,10:1.15,11:1.3,12:1.5}

year_start = date(2023, 1, 1)
sales = []
for i in range(500):
    day_offset = random.randint(0, 364)
    d = year_start + timedelta(days=day_offset)
    region   = random.choice(REGIONS)
    category = random.choice(CATEGORIES)
    lo, hi   = REV_RANGE[category]
    revenue  = round(random.uniform(lo, hi) * SEASON[d.month], 2)
    units    = random.randint(1, 50)
    cid      = random.randint(1, 100)
    sales.append({
        "date": d.isoformat(),
        "region": region,
        "product_category": category,
        "revenue": revenue,
        "units_sold": units,
        "customer_id": cid
    })

with open("sample_data.csv","w",newline="") as f:
    w = csv.DictWriter(f, fieldnames=["date","region","product_category","revenue","units_sold","customer_id"])
    w.writeheader(); w.writerows(sales)

print("Generated sample_data.csv and customers.csv")
