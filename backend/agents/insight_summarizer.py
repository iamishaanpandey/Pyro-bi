"""
Agent 6 — Insight Summarizer
Generates a 2-3 sentence plain-English executive summary of query results.
"""
import json
from services.llm_client import chat

SYSTEM = "You are a data analyst providing an executive insight summary for a business dashboard."


def summarize_insights(data: list[dict], chart_config: dict, user_query: str) -> str:
    """
    Returns a 2-3 sentence human-readable insight string.
    """
    if not data:
        return "No data was returned for this query."

    # 5 rows is enough for key insights — avoid sending 20+ rows to LLM
    sample = data[:5]
    row_count = len(data)

    user = f"""User question: "{user_query}"
Chart type: {chart_config.get('chart_type', 'bar')}
Total rows in result: {row_count}
Top 5 rows sample: {json.dumps(sample, default=str)}

Write a 2-3 sentence plain-English executive summary of the KEY insights from this data.
Rules:
- Be specific: reference actual numbers, names, and dates from the data.
- Do NOT invent numbers or trends not present in the data.
- Use a business-friendly tone (e.g., "Revenue peaked in...", "The top region was...").
- Highlight the most important finding first.
- Keep it concise — maximum 60 words.

Summary:"""

    try:
        return chat(SYSTEM, user, temperature=0.3)
    except Exception:
        return f"Data analysis complete. {row_count} records returned."
