"""
Agent — Analysis Suggester
Uses the schema context to generate intelligent, grouped analysis suggestions
tailored to the specific dataset the user has uploaded.
"""
import json
from services.llm_client import chat
from agents.schema_translator import build_schema_context

SYSTEM = (
    "You are an expert data analyst and business intelligence consultant. "
    "Given a database schema, generate smart, grouped natural-language analysis suggestions "
    "that users would typically run in a BI tool like Power BI or Tableau. "
    "Return ONLY raw JSON, no markdown."
)

def generate_suggestions(user_id: str = None) -> dict:
    """
    Returns a JSON object with grouped analysis suggestion categories.
    """
    schema_context = build_schema_context(user_id)
    
    user = f"""{schema_context}

Based on this schema, generate 4 groups of 3 analysis suggestions each.
Each group has a 'category' label and a 'description' and a list of 3 'queries' (natural English questions).
Make the queries highly specific to the actual column names and table names in the schema.
Make them feel like real analyst questions.

Return ONLY this exact JSON structure:
[
  {{
    "category": "Performance Benchmarking",
    "description": "Compare and rank entities by KPIs",
    "icon": "bar",
    "queries": [
      "Rank all ...",
      "Which ... had the highest ...",
      "Compare ... between ..."
    ]
  }},
  ...
]
"""
    try:
        text = chat(SYSTEM, user)
        # Strip markdown fences
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return {"suggestions": json.loads(text.strip())}
    except Exception as ex:
        print(f"[Suggester] Error: {ex}")
        return {"suggestions": []}
