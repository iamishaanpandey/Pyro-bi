"""
Chat History Service — manages saved chat sessions using a local JSON file.
"""
import json
import os
import uuid
from datetime import datetime

_BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SESSIONS_FILE = os.path.join(_BASE, "data", "sessions.json")

def _load_db() -> list[dict]:
    if not os.path.exists(SESSIONS_FILE):
        return []
    try:
        with open(SESSIONS_FILE, "r") as f:
            return json.load(f)
    except:
        return []

def _save_db(data: list[dict]) -> None:
    # Prune to max 100 global sessions to ensure the free-tier hard drive never fills up
    if len(data) > 100:
        data = data[-100:]
    os.makedirs(os.path.dirname(SESSIONS_FILE), exist_ok=True)
    with open(SESSIONS_FILE, "w") as f:
        json.dump(data, f, indent=2)

def list_sessions(user_id: str) -> list[dict]:
    """Return all sessions for a specific user, sorted by newest first (summary only)."""
    db = _load_db()
    # Strip heavy data for list view
    summaries = []
    for s in db:
        if s.get("user_id") == user_id:
            summaries.append({
                "id": s["id"],
                "title": s["title"],
                "timestamp": s["timestamp"]
            })
    return sorted(summaries, key=lambda x: x["timestamp"], reverse=True)

def get_session(session_id: str, user_id: str) -> dict | None:
    db = _load_db()
    for s in db:
        if s["id"] == session_id and s.get("user_id") == user_id:
            return s
    return None

def save_session(title: str, query: str, state: dict, user_id: str) -> dict:
    db = _load_db()
    session = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "title": title or ("Query: " + query[:30] + "..."),
        "timestamp": datetime.now().isoformat(),
        "query": query,
        "state": state
    }
    db.append(session)
    _save_db(db)
    return session

def delete_session(session_id: str, user_id: str) -> bool:
    db = _load_db()
    initial_len = len(db)
    db = [s for s in db if not (s["id"] == session_id and s.get("user_id") == user_id)]
    if len(db) < initial_len:
        _save_db(db)
        return True
    return False
