"""
FastAPI Application Entry Point
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
import json

from services.pipeline import run_pipeline
from services.csv_loader import process_upload
from services.duckdb_service import get_connection, clear_all_tables, get_table_names, get_table_info
from services.chat_history import list_sessions, get_session, save_session, delete_session
from agents.analysis_suggester import generate_suggestions
from agents.detailed_analyzer import generate_detailed_analysis

app = FastAPI(title="Conversational BI Platform", version="1.0.0")

# CORS — allow Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Bootstrap DB on startup ───────────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    get_connection()  # Triggers CSV bootstrap
    print("[FastAPI] Server ready.")


# ── Models ─────────────────────────────────────────────────────────────────────
class QueryRequest(BaseModel):
    query: str
    session_id: str = ""

class SaveSessionRequest(BaseModel):
    title: str = ""
    query: str
    state: dict

class DetailedAnalysisRequest(BaseModel):
    data: list
    user_query: str
    sql: str = ""

class UpdateColumnRequest(BaseModel):
    table_name: str
    column_name: str
    new_type: str


# ── Endpoints ──────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/schema")
async def get_schema():
    schema_path = Path(__file__).parent / "schema" / "semantic_graph.json"
    with open(schema_path) as f:
        return json.load(f)


@app.get("/preview")
async def preview_data(limit: int = 50):
    """
    Returns the first N rows of the uploaded table directly from DuckDB.
    NO LLM calls — near-instant response for data preview.
    """
    try:
        from services.duckdb_service import execute_query, get_table_names
        tables = get_table_names()
        if not tables:
            return {"data": [], "table": None, "message": "No table loaded yet."}
        table = tables[0]
        safe_limit = min(max(1, limit), 500)
        rows = execute_query(f'SELECT * FROM "{table}" LIMIT {safe_limit}')
        return {"data": rows, "table": table, "row_count": len(rows)}
    except Exception as ex:
        raise HTTPException(status_code=500, detail=f"Preview failed: {ex}")


@app.get("/normalization-suggestions")
async def normalization_suggestions():
    """
    Returns two-tier fuzzy-match suggestions for entity deduplication.
    auto   (score >= 93): safe to merge silently
    review (80-92): shown to user for confirmation
    Zero LLM calls.
    """
    try:
        from services.duckdb_service import get_table_names
        from services.fuzzy_normalizer import detect_suggestions
        tables = get_table_names()
        if not tables:
            return {"auto": [], "review": [], "table": None}
        return detect_suggestions(tables[0])
    except Exception as ex:
        raise HTTPException(status_code=500, detail=f"Normalization scan failed: {ex}")


class NormalizationRequest(BaseModel):
    mappings: list[dict]   # [{ "column": str, "from": str, "to": str }]

@app.post("/apply-normalization")
async def apply_normalization(req: NormalizationRequest):
    """
    Applies approved entity mappings to the DuckDB table via UPDATE.
    Also auto-applies any auto-tier suggestions at the same time.
    """
    try:
        from services.duckdb_service import get_table_names
        from services.fuzzy_normalizer import apply_normalization as _apply
        tables = get_table_names()
        if not tables:
            raise HTTPException(status_code=400, detail="No table loaded.")
        result = _apply(tables[0], req.mappings)
        return result
    except HTTPException:
        raise
    except Exception as ex:
        raise HTTPException(status_code=500, detail=f"Normalization failed: {ex}")


@app.post("/query")
async def query(req: QueryRequest):
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
    try:
        result = run_pipeline(req.query.strip(), req.session_id)
        return result
    except Exception as ex:
        error_msg = str(ex)
        # Provide actionable error messages
        if 'column' in error_msg.lower() or 'binder' in error_msg.lower():
            friendly = f"Column not found. Check column names in your dataset. (Detail: {error_msg[:200]})"
        elif 'table' in error_msg.lower():
            friendly = f"Table not found. Try re-uploading your CSV file. (Detail: {error_msg[:200]})"
        elif 'syntax' in error_msg.lower():
            friendly = f"SQL syntax error — the AI generated invalid SQL. Please rephrase your question. (Detail: {error_msg[:200]})"
        else:
            friendly = f"Query failed: {error_msg[:300]}"
        return {
            "chart_type": None,
            "chart_config": {},
            "data": [],
            "sql_executed": None,
            "insight_summary": None,
            "error": friendly,
            "cached": False,
        }


@app.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")
    contents = await file.read()
    try:
        meta = process_upload(contents, file.filename)

        # Compute normalization suggestions and preview immediately
        # so the frontend gets everything in one round-trip (avoids race condition
        # with separate GET calls hitting a freshly-initialised DB singleton)
        from services.duckdb_service import execute_query, get_table_names
        from services.fuzzy_normalizer import detect_suggestions

        table = meta["table_name"]

        try:
            norm = detect_suggestions(table)
        except Exception:
            norm = {"auto": [], "review": [], "table": table}

        try:
            preview_rows = execute_query(f'SELECT * FROM "{table}" LIMIT 50')
        except Exception:
            preview_rows = []

        return {
            **meta,
            "normalization_suggestions": norm,
            "preview": preview_rows,
        }
    except Exception as ex:
        raise HTTPException(status_code=500, detail=f"Failed to load CSV: {str(ex)}")

@app.post("/update-column")
async def update_column_type_endpoint(req: UpdateColumnRequest):
    try:
        from services.duckdb_service import update_column_type
        return update_column_type(req.table_name, req.column_name, req.new_type)
    except Exception as ex:
        raise HTTPException(status_code=400, detail=str(ex))


@app.post("/clear-data")
async def clear_data():
    try:
        clear_all_tables()
        return {"success": True, "message": "All tables dropped."}
    except Exception as ex:
        raise HTTPException(status_code=500, detail=str(ex))


@app.get("/tables")
async def get_tables():
    return {"tables": get_table_names()}


@app.get("/tables/{table_name}/columns")
async def get_columns(table_name: str):
    try:
        return get_table_info(table_name)
    except Exception as ex:
        raise HTTPException(status_code=404, detail=f"Table not found: {str(ex)}")


@app.get("/sessions")
async def get_all_sessions():
    return {"sessions": list_sessions()}


@app.get("/sessions/{session_id}")
async def fetch_session(session_id: str):
    s = get_session(session_id)
    if not s:
        raise HTTPException(status_code=404, detail="Session not found.")
    return s


@app.post("/sessions")
async def create_session(req: SaveSessionRequest):
    return save_session(req.title, req.query, req.state)


@app.delete("/sessions/{session_id}")
async def remove_session(session_id: str):
    success = delete_session(session_id)
    if not success:
        raise HTTPException(status_code=404, detail="Session not found.")
    return {"success": True}


@app.get("/analysis-suggestions")
async def get_analysis_suggestions():
    """Generates schema-aware analysis suggestions using LLM."""
    try:
        return generate_suggestions()
    except Exception as ex:
        raise HTTPException(status_code=500, detail=str(ex))


@app.post("/detailed-analysis")
async def get_detailed_analysis(req: DetailedAnalysisRequest):
    """Generates deep structured analysis for given query + data."""
    try:
        result = generate_detailed_analysis(req.data, req.user_query, req.sql)
        return result
    except Exception as ex:
        raise HTTPException(status_code=500, detail=str(ex))
