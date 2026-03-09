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
    try:
        schema_context = build_schema_context(user_id)
        if not schema_context or "No table loaded" in schema_context:
            print(f"[Suggester] No schema context for user: {user_id}")
            return {"suggestions": []}

        user = f"""{schema_context}

Based on this schema, generate 4 groups of 3 analysis suggestions each.
Each group has a 'category' label, a 'description', an 'icon' (bar, trend, search, or list), and 3 'queries'.
IMPORTANT: The 'queries' must be natural language questions (plain English) that a business user would ask. 
DO NOT RETURN SQL. Use the column names only to make the questions accurate.

Return ONLY raw JSON in this format:
[
  {{
    "category": "Performance",
    "description": "...",
    "icon": "bar",
    "queries": ["What is the total...", "Which entity had...", "Compare..."]
  }}
]
"""
        text = chat(SYSTEM, user)
        
        # Robust JSON extraction
        if "```" in text:
            # Extract content from the first code block (regardless of header)
            text = text.split("```")[1]
            if text.lower().startswith("json"):
                text = text[4:]
        
        parsed = json.loads(text.strip())
        print(f"[Suggester] Successfully generated {len(parsed)} groups.")
        return {"suggestions": parsed}

    except Exception as ex:
        print(f"[Suggester] Error: {ex}")
        return {"suggestions": []}
