"""
Agent 4 — Self-Healing Agent
Retries SQL generation when Agent 3 returns an error, up to MAX_RETRIES times.
"""
import re
import os
from dotenv import load_dotenv
from services.llm_client import chat
from services.duckdb_service import execute_query

load_dotenv(override=True)
MAX_RETRIES = int(os.getenv("MAX_RETRIES", "3"))

SQL_SYSTEM = (
    "You are an expert DuckDB SQL engineer. "
    "Return ONLY the corrected raw SQL — no markdown, no explanation, no backticks."
)


def heal_and_retry(
    user_query: str,
    failed_sql: str,
    error_message: str,
    schema_context: str,
) -> dict:
    """
    Attempts to fix a broken SQL query up to MAX_RETRIES times.
    Returns: {"sql": str, "data": list[dict], "error": str | None}
    """
    current_sql = failed_sql
    current_error = error_message

    for attempt in range(1, MAX_RETRIES + 1):
        print(f"[Self-Healing] Attempt {attempt}/{MAX_RETRIES}. Error: {current_error[:120]}")
        fixed_sql = _regenerate_sql(user_query, current_sql, current_error, schema_context)
        try:
            data = execute_query(fixed_sql)
            print(f"[Self-Healing] Succeeded on attempt {attempt}.")
            return {"sql": fixed_sql, "data": data or [], "error": None}
        except Exception as ex:
            current_sql = fixed_sql
            current_error = str(ex)

    return {
        "sql": current_sql,
        "data": [],
        "error": (
            f"I wasn't able to answer that question after {MAX_RETRIES} attempts. "
            f"The last error was: {current_error}"
        ),
    }


def _regenerate_sql(
    user_query: str,
    failed_sql: str,
    error_message: str,
    schema_context: str,
) -> str:
    user = f"""{schema_context}

=== TASK: FIX A BROKEN SQL QUERY ===

The following DuckDB SQL query failed with an error. Analyse the error and generate a corrected query.

Original user question: {user_query}

Failed SQL:
{failed_sql}

Error message:
{error_message}

Rules:
1. Return ONLY the corrected raw SQL — no markdown, no explanation, no backticks.
2. Use DuckDB-compatible syntax only.
3. Fix the specific error while still answering the original question.
4. Add LIMIT 500 if not already present.
5. Use ROUND(expr, 2) for float columns.

Corrected SQL:"""

    sql = chat(SQL_SYSTEM, user)
    sql = re.sub(r"^```(?:sql)?\s*", "", sql, flags=re.IGNORECASE)
    sql = re.sub(r"\s*```$", "", sql)
    return sql.strip()
