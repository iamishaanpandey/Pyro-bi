"""
DuckDB Service — manages the in-process analytical database.
Supports query execution and dynamic CSV uploads with automatic data sanitization
and data quality profiling.
"""
import math
import duckdb
import pandas as pd
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

_BASE = Path(__file__).parent.parent
DB_PATH = str(_BASE / "data" / "analytics.db")

_conn: duckdb.DuckDBPyConnection | None = None


def get_connection() -> duckdb.DuckDBPyConnection:
    global _conn
    if _conn is None:
        # Use in-memory DB — normalization bundled in upload response avoids any race condition
        _conn = duckdb.connect(':memory:')
    return _conn


def clear_all_tables() -> None:
    """Drop all user tables to reset the database."""
    conn = get_connection()
    tables = get_table_names()
    for t in tables:
        conn.execute(f'DROP TABLE "{t}"')


def execute_query(sql: str) -> list[dict]:
    """Execute a SQL query and return results as a list of JSON-safe dicts."""
    conn = get_connection()
    result = conn.execute(sql).fetchdf()

    # Sanitize non-JSON-compliant float values (NaN, Inf, -Inf) → None
    rows = result.to_dict(orient="records")
    clean = []
    for row in rows:
        clean_row = {}
        for k, v in row.items():
            if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
                clean_row[k] = None
            else:
                clean_row[k] = v
        clean.append(clean_row)
    return clean


def _sanitize_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Clean a DataFrame before loading into DuckDB:
    - Normalize column names (strip, no double spaces)
    - Trim leading/trailing whitespace from all string columns
    - Replace empty strings / whitespace-only strings with NaN (→ SQL NULL)
    - Attempt numeric coercion on columns that look numeric but are strings
    """
    # ── Column names ─────────────────────────────────────────────────────────
    df.columns = [c.strip() for c in df.columns]

    for col in df.columns:
        if df[col].dtype == object:
            # Trim whitespace
            df[col] = df[col].astype(str).str.strip()
            # Replace empty / whitespace-only / literal 'nan' / 'None' → NaN
            df[col] = df[col].replace(r'^\s*$', pd.NA, regex=True)
            df[col] = df[col].replace({'nan': pd.NA, 'None': pd.NA, 'NULL': pd.NA, 'null': pd.NA, 'N/A': pd.NA, 'n/a': pd.NA, '-': pd.NA})

            # Attempt numeric coercion for columns that are all-numeric strings
            coerced = pd.to_numeric(df[col], errors='coerce')
            # If >90% successfully coerced, treat as numeric
            non_null = df[col].notna().sum()
            if non_null > 0 and coerced.notna().sum() / non_null >= 0.90:
                df[col] = coerced

    return df


def compute_data_quality(table_name: str) -> dict:
    """
    Computes data quality statistics for a table using pure DuckDB SQL.
    Returns a quality report detailing null/blank counts per column.
    Zero LLM calls — pure computation.
    """
    conn = get_connection()
    row_count = conn.execute(f'SELECT COUNT(*) FROM "{table_name}"').fetchone()[0]
    if row_count == 0:
        return {"row_count": 0, "column_quality": [], "anomalies": []}

    # Get column names and types
    desc = conn.execute(f'DESCRIBE "{table_name}"').fetchall()
    columns = [{"name": row[0], "type": row[1]} for row in desc]

    column_quality = []
    anomalies = []

    for col in columns:
        cname = col["name"]
        ctype = col["type"]

        # Count NULLs (and empty strings for VARCHAR columns)
        if "VARCHAR" in ctype.upper() or "TEXT" in ctype.upper():
            null_count = conn.execute(
                f'SELECT COUNT(*) FROM "{table_name}" WHERE "{cname}" IS NULL OR TRIM("{cname}") = \'\'',
            ).fetchone()[0]
        else:
            null_count = conn.execute(
                f'SELECT COUNT(*) FROM "{table_name}" WHERE "{cname}" IS NULL',
            ).fetchone()[0]

        null_pct = round(null_count / row_count * 100, 1)

        entry = {
            "column": cname,
            "type": ctype,
            "null_count": null_count,
            "null_pct": null_pct,
        }

        # Distinct count for string columns (to detect low-cardinality / high-duplicate)
        if "VARCHAR" in ctype.upper() or "TEXT" in ctype.upper():
            distinct = conn.execute(
                f'SELECT COUNT(DISTINCT "{cname}") FROM "{table_name}" WHERE "{cname}" IS NOT NULL'
            ).fetchone()[0]
            entry["distinct_values"] = distinct

        column_quality.append(entry)

        # Flag as anomaly if >20% null/blank
        if null_pct >= 20:
            severity = "High" if null_pct >= 50 else "Medium"
            anomalies.append(
                f"[{severity}] Column '{cname}': {null_pct}% of values are blank or missing "
                f"({null_count:,} of {row_count:,} rows). This may affect query accuracy."
            )

    return {
        "row_count": row_count,
        "column_quality": column_quality,
        "anomalies": anomalies,
        "summary": f"Dataset has {row_count:,} rows and {len(columns)} columns. "
                   f"{len(anomalies)} column(s) have significant missing data.",
    }


def load_csv_as_table(table_name: str, file_path: str, user_id: str) -> dict:
    """
    Load a CSV file into a new DuckDB table with automatic data sanitization.
    Returns metadata + data quality report.
    """
    conn = get_connection()

    # ── Load CSV via pandas for sanitization ─────────────────────────────────
    try:
        df = pd.read_csv(file_path, low_memory=False)
        df = _sanitize_dataframe(df)

        # Clear only this user's previous tables to emulate fresh memory state
        for t in get_table_names(user_id):
            conn.execute(f'DROP TABLE IF EXISTS "{t}"')
        
        # Register the sanitized DataFrame directly into DuckDB
        conn.execute(f'CREATE TABLE "{table_name}" AS SELECT * FROM df')
    except Exception as e:
        # Fallback to raw DuckDB CSV reader if pandas fails
        print(f"[DuckDB] Pandas load failed ({e}), falling back to read_csv_auto")
        conn.execute(f'DROP TABLE IF EXISTS "{table_name}"')
        conn.execute(f"""
            CREATE TABLE "{table_name}" AS
            SELECT * FROM read_csv_auto('{file_path}')
        """)

    # Fetch metadata + quality report
    meta = get_table_info(table_name)
    quality = compute_data_quality(table_name)
    meta["data_quality"] = quality
    return meta


def get_table_names(user_id: str = None) -> list[str]:
    conn = get_connection()
    rows = conn.execute("SHOW TABLES").fetchall()
    tables = [r[0] for r in rows]
    
    if user_id:
        safe_uuid = user_id.replace("-", "_").lower()
        prefix = f"tbl_{safe_uuid}_"
        tables = [t for t in tables if t.startswith(prefix)]
        
    return tables


def get_table_info(table_name: str) -> dict:
    conn = get_connection()
    result = conn.execute(f'DESCRIBE "{table_name}"').fetchall()
    columns = [{"name": row[0], "type": row[1]} for row in result]
    row_count = conn.execute(f'SELECT COUNT(*) FROM "{table_name}"').fetchone()[0]
    return {"table_name": table_name, "columns": columns, "row_count": row_count}

def update_column_type(table_name: str, column_name: str, new_type: str) -> dict:
    conn = get_connection()
    try:
        conn.execute(f'ALTER TABLE "{table_name}" ALTER COLUMN "{column_name}" TYPE {new_type}')
        # Return updated table info
        return get_table_info(table_name)
    except Exception as e:
        raise Exception(f"Failed to cast column '{column_name}' to {new_type}: {str(e)}")
