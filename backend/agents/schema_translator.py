"""
Agent 2 — Schema Translator
Converts live DuckDB schemas into a clean LLM-readable context string.
"""
from services.duckdb_service import get_table_names, get_table_info


def build_schema_context(user_id: str = None) -> str:
    """
    Reads live tables from DuckDB and formats it as a readable schema description
    for injection into downstream agent prompts.
    """
    tables = get_table_names(user_id)
    
    if not tables:
        return "=== DATABASE SCHEMA ===\n(No tables uploaded yet.)\n"

    lines = ["=== DATABASE SCHEMA ===\n"]

    for table in tables:
        info = get_table_info(table)
        # Generate a clean readable alias by stripping tbl_uuid_ 
        clean_name = table.split("_", 2)[-1].replace("_", " ") if table.startswith("tbl_") else table
        
        lines.append(f"TABLE: {info['table_name']} (Readable Alias: {clean_name})")
        lines.append(f"  Rows: {info['row_count']}")
        lines.append("  Columns:")
        for col in info["columns"]:
            lines.append(f"    - {col['name']} ({col['type']})")
        lines.append("")

    lines.append("\n=== NOTES ===")
    lines.append("  - Use DuckDB SQL syntax (not PostgreSQL or MySQL).")
    lines.append("  - Date columns support strftime, date_trunc, EXTRACT.")
    lines.append("  - Always qualify column names if joining tables.")
    lines.append("  - For SQL, ALWAYS use the official TABLE name. But for natural language conversation/suggestions, use the Readable Alias.")

    return "\n".join(lines)
