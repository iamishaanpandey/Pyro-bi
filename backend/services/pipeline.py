"""
Pipeline — Orchestrates the 6-agent pipeline for every query.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.gatekeeper import validate_query
from agents.schema_translator import build_schema_context
from agents.query_executor import generate_and_execute
from agents.self_healing import heal_and_retry
from agents.ui_config import determine_chart_config
from agents.insight_summarizer import summarize_insights
from services.redis_service import get_cached, set_cached


def run_pipeline(user_query: str, session_id: str = "", user_id: str = "") -> dict:
    """
    Runs all 6 agents sequentially and returns the full response dict.
    """

    # ── Check cache first ─────────────────────────────────────────────────────
    cached = get_cached(user_query)
    if cached:
        print(f"[Pipeline] Cache hit for query: {user_query[:60]}")
        cached["cached"] = True
        return cached

    # ── Agent 1: Gatekeeper ───────────────────────────────────────────────────
    print("[Pipeline] Agent 1: Gatekeeper")
    gate = validate_query(user_query)
    if not gate.get("valid", True):
        return {
            "chart_type": None,
            "chart_config": {},
            "data": [],
            "sql_executed": None,
            "insight_summary": None,
            "error": f"I can only answer data and analytics questions. {gate.get('reason', '')}",
            "cached": False,
        }

    # ── Agent 2: Schema Translator ────────────────────────────────────────────
    print("[Pipeline] Agent 2: Schema Translator")
    schema_context = build_schema_context(user_id)

    # ── Agent 3: Query Executor ───────────────────────────────────────────────
    print("[Pipeline] Agent 3: Query Executor")
    exec_result = generate_and_execute(user_query, schema_context)

    # ── Agent 4: Self-Healing (only on error) ─────────────────────────────────
    if exec_result["error"] and not exec_result["data"]:
        print(f"[Pipeline] Agent 4: Self-Healing triggered — {exec_result['error'][:80]}")
        exec_result = heal_and_retry(
            user_query,
            exec_result["sql"],
            exec_result["error"],
            schema_context,
        )

    # If still erroring out, return graceful error
    if exec_result["error"] and not exec_result["data"]:
        return {
            "chart_type": None,
            "chart_config": {},
            "data": [],
            "sql_executed": exec_result["sql"],
            "insight_summary": None,
            "error": exec_result["error"],
            "cached": False,
        }

    data = exec_result["data"]
    sql = exec_result["sql"]

    # ── Agent 5: UI Config ────────────────────────────────────────────────────
    print(f"[{session_id}] Agent 5: Determining ECharts config...")
    ui_dict = determine_chart_config(data, user_query)
    chart_type = ui_dict.get("chart_type")
    echarts_config = ui_dict.get("echarts_config", {})

    # ── Agent 6: Insight Summarizer ───────────────────────────────────────────
    print("[Pipeline] Agent 6: Insight Summarizer")
    insight = summarize_insights(data, echarts_config, user_query)

    result = {
        "chart_type": chart_type or "bar",
        "echarts_config": echarts_config,
        "data": data,
        "sql_executed": sql,
        "insight_summary": insight,
        "error": None,
        "cached": False,
    }

    # ── Cache result ──────────────────────────────────────────────────────────
    set_cached(user_query, result)

    return result
