"""
Quick diagnostic: run the fuzzy normalizer directly on the CSV and print what it finds.
"""
import pandas as pd
from collections import Counter
from rapidfuzz import fuzz, process

AUTO_THRESHOLD   = 93
REVIEW_THRESHOLD = 75
MIN_DISTINCT = 2
MAX_DISTINCT = 300

csv_path = r"data\uploads\india_life_insurance_claims.csv"
df = pd.read_csv(csv_path, low_memory=False)

print(f"CSV shape: {df.shape}")
print(f"Columns: {list(df.columns)}")
print()

all_suggestions = []

for col in df.columns:
    if df[col].dtype != object:
        continue

    counts = df[col].dropna().value_counts()
    n = len(counts)
    if not (MIN_DISTINCT <= n <= MAX_DISTINCT):
        print(f"  SKIP {col!r:40s} distinct={n} (out of range {MIN_DISTINCT}-{MAX_DISTINCT})")
        continue

    print(f"  CHECK {col!r:40s} distinct={n}")
    freq = Counter(dict(counts))
    values = list(freq.keys())
    visited = set()

    for val in sorted(values, key=lambda v: freq[v], reverse=True):
        if val in visited:
            continue
        unvisited = [v for v in values if v not in visited]
        matches = process.extract(val, unvisited, scorer=fuzz.WRatio,
                                  score_cutoff=REVIEW_THRESHOLD, limit=None)
        matched_vals = set(m[0] for m in matches)
        if not matched_vals:
            visited.add(val)
            continue

        cluster_vals = [val] + list(matched_vals)
        for v in cluster_vals:
            visited.add(v)

        canonical = max(cluster_vals, key=lambda s: (freq[s], len(s)))
        for v in cluster_vals:
            if v == canonical:
                continue
            score = fuzz.WRatio(v, canonical)
            if score < REVIEW_THRESHOLD:
                continue
            tier = "AUTO" if score >= AUTO_THRESHOLD else "REVIEW"
            all_suggestions.append((tier, col, v, canonical, round(score,1)))
            print(f"    [{tier}] '{v}' → '{canonical}' (score={score:.1f})")

print()
if all_suggestions:
    print(f"Total suggestions: {len(all_suggestions)}")
else:
    print("→ NO suggestions found — the dataset is genuinely clean by these thresholds.")
