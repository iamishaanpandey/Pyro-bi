"""
Agent 1 — Gatekeeper
Validates whether the user query is a data/analytics question.
"""
import json
from services.llm_client import chat

SYSTEM = (
    "You are a query classifier for a Business Intelligence platform. "
    "Respond ONLY with a JSON object — no markdown, no extra text."
)


def validate_query(user_query: str) -> dict:
    """
    Returns {"valid": bool, "reason": str}
    """
    user = f"""Determine whether the following user input is a valid data analytics or business
intelligence question that can be answered by querying a structured database.

Valid questions involve: sales data, revenue, customers, trends, comparisons, aggregations,
filtering by date/region/category, top/bottom performers, KPIs, counts, averages, etc.

Invalid inputs include: casual conversation, requests to write code, off-topic questions,
inappropriate content, or anything not related to data analysis.

User input: "{user_query}"

Respond ONLY with a JSON object:
{{"valid": true, "reason": "brief explanation"}}"""

    try:
        text = chat(SYSTEM, user)
        # Strip markdown fences if model adds them anyway
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text.strip())
    except Exception as ex:
        # On parse failure, assume valid so we don't block good queries
        return {"valid": True, "reason": f"Classification unavailable: {ex}"}
