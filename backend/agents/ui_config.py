"""
Agent 5 — UI Config Agent
Analyses query results and returns a full Apache ECharts configuration JSON.
"""
import json
from services.llm_client import chat

SYSTEM = (
    "You are an expert data visualization engineer."
    "Your job is to generate a fully valid 'option' JSON object for Apache ECharts based on the query data and user question."
    "Return ONLY raw JSON, with no markdown formatting, no text before or after."
)

def determine_chart_config(data: list[dict], user_query: str) -> dict:
    """
    Returns a full ECharts option dictionary.
    Supports ANY chart type (bar, line, pie, scatter, heatmap, radar, treemap, funnel, etc.).
    """
    if not data:
        return _fallback_config()

    columns = list(data[0].keys())
    # Send minimal sample — chart agent only needs structure, not all rows
    sample_rows = data[:5]
    row_count = len(data)

    user = f"""The user asked: "{user_query}"

Data summary:
Total rows: {row_count}
Columns available: {columns}
First 5 sample rows (for type/shape reference only):
{json.dumps(sample_rows, default=str)}

Instructions:
1. Choose the *absolute best* ECharts visualization type for this specific data structure (e.g. bar, line, pie, scatter, radar, funnel, heatmap).
2. DO NOT include 'data' arrays in xAxis or series. Instead, configure the series to use the dataset via the 'encode' property.
3. DO NOT set hardcoded itemStyle colors. The frontend will inject a global Bauhaus color palette dynamically.
4. Include a title, tooltip, and legend.
5. If the data has many rows but isn't aggregated properly, group/aggregate the series logically.
6. Add the 'toolbox' component with saveAsImage and magicType options. DO NOT include dataView.
7. To provide SLICERS and FILTERS, explicitly configure 'dataZoom' (type: 'slider') on the x-axis, and if appropriate, a 'visualMap' for filtering values.
8. Return ONLY the JSON object that corresponds to the ECharts 'option' property. No markdown, no "```json".

Example structure for a bar chart using dataset:
{{
  "title": {{ "text": "Sales by Region", "left": "center" }},
  "tooltip": {{ "trigger": "axis" }},
  "toolbox": {{ "feature": {{ "saveAsImage": {{}}, "magicType": {{"type": ["line", "bar"]}} }} }},
  "legend": {{ "bottom": 0 }},
  "dataZoom": [{{ "type": "slider", "bottom": 10 }}],
  "xAxis": {{ "type": "category" }},
  "yAxis": {{ "type": "value" }},
  "series": [
    {{ "type": "bar", "encode": {{ "x": "Region", "y": "Sales" }} }}
  ]
}}
"""

    try:
        text = chat(SYSTEM, user)
        # Clean up if the LLM ignores instructions and wraps in markdown
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        config = json.loads(text.strip())
        
        # Inject the raw data as a dataset so ECharts can map it automatically
        config["dataset"] = {"source": data}
        # Ensure toolbox is always injected to satisfy user requirement for slicers/filters/export
        if "toolbox" not in config:
            config["toolbox"] = {
                "show": True,
                "feature": {
                    "dataZoom": {"yAxisIndex": "none"},
                    "magicType": {"type": ["line", "bar"]},
                    "restore": {},
                    "saveAsImage": {}
                }
            }
        # Add dataZoom automatically if it's a cartesian coordinate chart and we have many rows
        if row_count > 15 and "xAxis" in config and "dataZoom" not in config:
            config["dataZoom"] = [
                {"type": "inside", "start": 0, "end": 100},
                {"start": 0, "end": 100}
            ]
            
        return {"echarts_config": config, "chart_type": "echarts"}
    except Exception as ex:
        print(f"[UI Config] Parse error: {ex}. Using fallback.")
        return {"echarts_config": _fallback_config(columns, sample_rows), "chart_type": "echarts"}


def _fallback_config(columns: list[str] = None, data: list[dict] = None) -> dict:
    """A safe fallback bar chart using dataset."""
    cols = columns or []
    x_col = cols[0] if cols else ""
    y_col = cols[1] if len(cols) > 1 else ""
    
    return {
        "title": {"text": "Query Results (Fallback)", "left": "center"},
        "tooltip": {"trigger": "axis"},
        "dataset": {"source": data or []},
        "xAxis": {"type": "category"},
        "yAxis": {"type": "value"},
        "series": [{"type": "bar", "encode": {"x": x_col, "y": y_col}}]
    }
