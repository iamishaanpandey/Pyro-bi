"""
Agent 3 — Query Executor
Generates DuckDB-compatible SQL from natural language and executes it.
"""
import re
from services.llm_client import chat
from services.duckdb_service import execute_query

SQL_SYSTEM = (
    "You are an expert SQL engineer. Return ONLY the raw SQL query — "
    "no markdown, no explanation, no backticks."
)


def generate_and_execute(user_query: str, schema_context: str) -> dict:
    """
    Returns: {"sql": str, "data": list[dict], "error": str | None}
    """
    sql = _generate_sql(user_query, schema_context)
    try:
        data = execute_query(sql)
        if not data:
            return {"sql": sql, "data": [], "error": "Query returned no results."}
        return {"sql": sql, "data": data, "error": None}
    except Exception as ex:
        return {"sql": sql, "data": [], "error": str(ex)}


def _generate_sql(user_query: str, schema_context: str) -> str:
    user = f"""{schema_context}

=== TASK ===
Convert the following natural language question into a DuckDB SQL query.

Rules:
1. Return ONLY the raw SQL query — no markdown, no explanation, no backticks.
2. Use DuckDB-compatible syntax. LIMIT results to 500 rows max.
3. YEAR / INTEGER COLUMNS: If a column is named 'year', 'yr', 'fiscal_year' or contains 4-digit integers (2019, 2022 etc.) treat it as INTEGER. Filter with plain equality: WHERE year = 2022. NEVER apply strftime(), EXTRACT(), or CAST() to such columns.
4. DATE COLUMNS: Only use strftime()/EXTRACT() on columns typed DATE/TIMESTAMP/DATETIME. Cast when unsure: CAST(col AS DATE).
5. Always use readable column aliases (e.g., total_revenue, avg_growth, life_insurer).
6. Round all float results to 2 decimal places with ROUND(..., 2).
7. AGGREGATION: If asked to rank, list, or compare entities (e.g., insurers), you MUST return EXACTLY ONE ROW PER ENTITY. You MUST use GROUP BY on the entity column, and use aggregate functions like SUM() or AVG() on the metrics. Never return unsummarised individual rows.
8. DEDUPLICATION: All non-aggregated SELECT columns MUST appear in GROUP BY. Use SELECT DISTINCT for raw row queries. Duplicate rows are unacceptable.
9. YEAR RANGE: '2021-22' = fiscal year → WHERE year BETWEEN 2021 AND 2022 (integer) or EXTRACT(year FROM date_col) BETWEEN 2021 AND 2022 (date).
10. AAGR / CAGR / GROWTH RATE CALCULATIONS — use EXACTLY this pattern:
    - Compute ONE final rate per group, NOT year-by-year rows.
    - CAGR formula (use for any "average annual growth rate" / "AAGR" / "CAGR" question):
      ROUND((POWER(CAST(MAX(metric_col) AS DOUBLE) / NULLIF(MIN(metric_col), 0),
              1.0 / NULLIF(COUNT(DISTINCT year_col) - 1, 0)) - 1) * 100, 2) AS cagr_pct
    - GROUP BY the entity (e.g., life_insurer), ORDER BY cagr_pct DESC.
    - Do NOT use LAG(), window functions, or per-row subtraction for growth rate questions.
11. RANKING & METRICS: For ranking pre-calculated ratios across years, use AVG(ratio_column). Use ORDER BY metric DESC LIMIT N for top-N.
12. RATIO / SHARE: If computing from raw counts: ROUND(SUM(part_col) * 1.0 / NULLIF(SUM(total_col), 0) * 100, 2) — always guard against divide-by-zero.

User question: {user_query}

SQL:"""

    sql = chat(SQL_SYSTEM, user)
    # Strip markdown fences
    sql = re.sub(r"^```(?:sql)?\s*", "", sql, flags=re.IGNORECASE)
    sql = re.sub(r"\s*```$", "", sql)
    return sql.strip()
