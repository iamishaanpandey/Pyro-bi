"""
Fuzzy Entity Normalizer
=======================
Detects near-duplicate entity names within low-cardinality string columns
and provides two-tier suggestions:

  AUTO tier  (score >= 93) → safe to merge automatically (typos, spacing)
  REVIEW tier (80–92)       → shown to user for manual approval

Zero LLM calls. Uses rapidfuzz token_sort_ratio for robustness against
word reordering ("PNB Met Life" vs "MetLife PNB").
"""
from __future__ import annotations
from rapidfuzz import fuzz, process
from collections import defaultdict, Counter


# ── Thresholds ────────────────────────────────────────────────────────────────
AUTO_THRESHOLD   = 93   # >= auto-merge without asking
REVIEW_THRESHOLD = 75   # >= 75 and < 93 → suggest to user

# Only run on columns whose distinct value count is in this range
# (too many = not entity column; too few = no disambiguation needed)
MIN_DISTINCT = 2
MAX_DISTINCT = 300


def _canonical(cluster: list[str], freq: Counter) -> str:
    """Return the most frequent string in a cluster as the canonical name."""
    return max(cluster, key=lambda s: (freq[s], len(s)))


def detect_suggestions(table_name: str) -> dict:
    """
    Analyse all low-cardinality string columns in `table_name` and return
    fuzzy-match suggestions grouped by tier.

    Returns:
    {
      "auto": [
        { "column": "life_insurer", "from": "PNB Met Life",
          "to": "PNB MetLife", "score": 96 }, ...
      ],
      "review": [
        { "column": "life_insurer", "from": "Reliance",
          "to": "Reliance Nippon", "score": 84 }, ...
      ]
    }
    """
    from services.duckdb_service import get_connection, get_table_names

    conn = get_connection()
    auto_suggestions   = []
    review_suggestions = []

    # Get column names and types
    desc = conn.execute(f'DESCRIBE "{table_name}"').fetchall()

    for row in desc:
        col_name, col_type = row[0], row[1]
        if "VARCHAR" not in col_type.upper() and "TEXT" not in col_type.upper():
            continue  # only string columns

        # Fetch distinct non-null values and their frequencies
        rows = conn.execute(
            f'SELECT "{col_name}", COUNT(*) as cnt FROM "{table_name}" '
            f'WHERE "{col_name}" IS NOT NULL GROUP BY "{col_name}"'
        ).fetchall()

        if not (MIN_DISTINCT <= len(rows) <= MAX_DISTINCT):
            continue

        values = [r[0] for r in rows]
        freq   = Counter({r[0]: r[1] for r in rows})

        # Build clusters using greedy deduplication
        visited  = set()
        
        import re
        def check_acronym(s1, s2):
            """Returns True if one string is a likely acronym of the other."""
            def _chk(sht, lng):
                if not (2 <= len(sht) <= 6): return False
                words = [w for w in re.split(r'[^a-zA-Z]', lng) if w]
                if len(words) < 2: return False
                acr = "".join([w[0].upper() for w in words])
                return sht.upper() == acr or (len(sht) >= 3 and sht.upper() == acr[:len(sht)])
            return _chk(s1, s2) or _chk(s2, s1)

        for val in sorted(values, key=lambda v: freq[v], reverse=True):
            if val in visited:
                continue
                
            unvisited = [v for v in values if v not in visited]
            
            # 1. Fuzzy matches via WRatio (handles substring / reordering better)
            matches = process.extract(
                val, unvisited,
                scorer=fuzz.WRatio,
                score_cutoff=REVIEW_THRESHOLD,
                limit=None,
            )
            matched_vals = set(m[0] for m in matches)
            
            # 2. Acronym matches
            for u in unvisited:
                if u not in matched_vals and check_acronym(val, u):
                    matched_vals.add(u)
            
            if not matched_vals:
                visited.add(val)
                continue

            cluster_vals = [val] + list(matched_vals)
            for v in cluster_vals:
                visited.add(v)

            canonical = _canonical(cluster_vals, freq)

            # Route everything in the cluster to the canonical name
            for v in cluster_vals:
                if v == canonical:
                    continue
                
                # Determine score purely between the variance and the canonical name
                if check_acronym(v, canonical):
                    score = 96.0  # Safe auto-merge for perfect acronyms
                else:
                    score = fuzz.WRatio(v, canonical)
                
                # Double check that we still meet criteria (since canonical might be a different node)
                if score < REVIEW_THRESHOLD and not check_acronym(v, canonical):
                    continue

                entry = {
                    "column": col_name,
                    "from":   v,
                    "to":     canonical,
                    "score":  round(score, 1),
                }
                
                if score >= AUTO_THRESHOLD:
                    auto_suggestions.append(entry)
                else:
                    review_suggestions.append(entry)

    return {
        "auto":   auto_suggestions,
        "review": review_suggestions,
        "table":  table_name,
    }


def apply_normalization(table_name: str, mappings: list[dict]) -> dict:
    """
    Apply approved mappings to the DuckDB table.
    Each mapping: { "column": str, "from": str, "to": str }

    Uses DuckDB UPDATE for atomicity.
    Returns { "applied": int, "errors": list }
    """
    from services.duckdb_service import get_connection

    conn = get_connection()
    applied = 0
    errors  = []

    for m in mappings:
        col  = m.get("column")
        from_val = m.get("from")
        to_val   = m.get("to")
        if not col or from_val is None or to_val is None:
            continue
        try:
            conn.execute(
                f'UPDATE "{table_name}" SET "{col}" = ? WHERE "{col}" = ?',
                [to_val, from_val]
            )
            applied += 1
        except Exception as e:
            errors.append(f"Failed to remap '{from_val}' → '{to_val}' in {col}: {e}")

    return {"applied": applied, "errors": errors}
