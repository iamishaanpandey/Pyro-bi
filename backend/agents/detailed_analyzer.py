"""
Agent — Detailed Analyzer
Produces a deep, structured analysis report from query results.
Data quality anomalies (null/blank columns) are pre-computed from DuckDB
and injected into the anomalies section — zero extra LLM calls.
"""
import json
from services.llm_client import chat

SYSTEM = (
    "You are a senior data analyst writing a structured business report. "
    "You will be given SQL query results and a user's question. "
    "Produce a thorough, well-structured analysis. "
    "Return ONLY a JSON object — no markdown, no surrounding text."
)


def generate_detailed_analysis(data: list[dict], user_query: str, sql: str) -> dict:
    """
    Returns a structured analysis object with multiple sections.
    Data quality anomalies are injected from pre-computed DuckDB stats (no LLM cost).
    """
    if not data:
        return {"error": "No data to analyze."}

    # ── Pre-compute data quality anomalies (zero LLM cost) ───────────────────
    quality_anomalies = []
    try:
        from services.duckdb_service import compute_data_quality, get_table_names
        tables = get_table_names()
        if tables:
            quality = compute_data_quality(tables[0])
            quality_anomalies = quality.get("anomalies", [])
    except Exception as qe:
        print(f"[DetailedAnalyzer] Quality check skipped: {qe}")

    # ── LLM analysis with reduced 5-row sample ────────────────────────────────
    sample = data[:5]
    row_count = len(data)
    columns = list(data[0].keys()) if data else []

    user = f"""User asked: "{user_query}"
SQL executed: {sql}
Total rows returned: {row_count}
Columns: {columns}
Sample data (first 5 rows):
{json.dumps(sample, default=str)}

Produce a structured analysis report as a JSON object with these EXACT keys:
{{
  "executive_summary": "2-3 sentence high-level answer to the user's question",
  "key_findings": ["Finding 1", "Finding 2", "Finding 3"],
  "trends": ["Trend or pattern 1", "Trend or pattern 2"],
  "anomalies": ["Any statistical anomaly or outlier observed in the query results"],
  "recommendations": ["Recommendation 1", "Recommendation 2"],
  "data_quality_notes": "Brief note on query result quality"
}}
Return ONLY the JSON object."""

    try:
        text = chat(SYSTEM, user)
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        result = json.loads(text.strip())

        # Merge pre-computed data quality anomalies at the top of the anomalies list
        if quality_anomalies:
            existing = result.get("anomalies", [])
            if not isinstance(existing, list):
                existing = []
            result["anomalies"] = quality_anomalies + existing
            result["data_quality_notes"] = (
                f"{len(quality_anomalies)} column(s) have significant missing data. "
                + result.get("data_quality_notes", "")
            )

        return result

    except Exception as ex:
        print(f"[Detailed Analyzer] Error: {ex}")
        return {
            "executive_summary": "Analysis could not be generated.",
            "key_findings": [],
            "trends": [],
            "anomalies": quality_anomalies or [],
            "recommendations": [],
            "data_quality_notes": (
                f"{len(quality_anomalies)} column(s) flagged with significant missing data."
                if quality_anomalies else ""
            )
        }
