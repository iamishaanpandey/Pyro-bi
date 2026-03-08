"""
CSV Loader Service — handles file upload, auto-detection,
and registration into DuckDB + semantic graph.
"""
import os
import shutil
import tempfile
from services.duckdb_service import load_csv_as_table

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def process_upload(file_bytes: bytes, original_filename: str) -> dict:
    """
    Save uploaded CSV to disk and load it into DuckDB.
    Returns table metadata.
    """
    # Build a safe table name from the filename
    base = os.path.splitext(original_filename)[0]
    table_name = "".join(c if c.isalnum() or c == "_" else "_" for c in base).lower()
    if not table_name[0].isalpha():
        table_name = "tbl_" + table_name

    # Write to a temp path first, then persist
    dest_path = os.path.join(UPLOAD_DIR, f"{table_name}.csv")
    with open(dest_path, "wb") as f:
        f.write(file_bytes)

    meta = load_csv_as_table(table_name, dest_path)
    return {
        "success": True,
        "table_name": table_name,
        "columns": [c["name"] for c in meta["columns"]],
        "column_types": {c["name"]: c["type"] for c in meta["columns"]},
        "row_count": meta["row_count"],
        "file_path": dest_path,
    }
