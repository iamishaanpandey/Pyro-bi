import json
import os
import uuid
from datetime import datetime
from services.redis_service import _get_client

_BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SESSIONS_FILE = os.path.join(_BASE, "data", "sessions.json")

def _load_db() -> list[dict]:
    client = _get_client()
    if client:
        try:
            keys = client.keys("session:*")
            if not keys: return []
            sessions = client.mget(keys)
            return [json.loads(s) for s in sessions if s]
        except Exception as e:
            print(f"[ChatHistory] Redis load failed: {e}")
            # Fallback to file below

    if not os.path.exists(SESSIONS_FILE):
        return []
    try:
        with open(SESSIONS_FILE, "r") as f:
            return json.load(f)
    except:
        return []

def _save_session_item(session: dict) -> None:
    client = _get_client()
    if client:
        try:
            key = f"session:{session['id']}"
            # Store for 7 days (604800 seconds)
            client.setex(key, 604800, json.dumps(session))
            return
        except Exception as e:
            print(f"[ChatHistory] Redis save failed: {e}")

    # Fallback to global file save
    db = _load_db()
    # Update existing or append
    existing = False
    for i, s in enumerate(db):
        if s["id"] == session["id"]:
            db[i] = session
            existing = True
            break
    if not existing:
        db.append(session)
    
    # Prune
    if len(db) > 100:
        db = db[-100:]
    
    os.makedirs(os.path.dirname(SESSIONS_FILE), exist_ok=True)
    with open(SESSIONS_FILE, "w") as f:
        json.dump(db, f, indent=2)

def list_sessions(user_id: str) -> list[dict]:
    db = _load_db()
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
    # Try Redis specifically first for efficiency
    client = _get_client()
    if client:
        try:
            raw = client.get(f"session:{session_id}")
            if raw:
                s = json.loads(raw)
                if s.get("user_id") == user_id: return s
        except: pass

    db = _load_db()
    for s in db:
        if s["id"] == session_id and s.get("user_id") == user_id:
            return s
    return None

def save_session(title: str, query: str, state: dict, user_id: str) -> dict:
    session_id = str(uuid.uuid4())
    session = {
        "id": session_id,
        "user_id": user_id,
        "title": title or ("Query: " + query[:30] + "..."),
        "timestamp": datetime.now().isoformat(),
        "query": query,
        "state": state
    }
    _save_session_item(session)
    return session

def delete_session(session_id: str, user_id: str) -> bool:
    client = _get_client()
    if client:
        try:
            # Check ownership before delete if using Redis
            raw = client.get(f"session:{session_id}")
            if raw:
                s = json.loads(raw)
                if s.get("user_id") == user_id:
                    client.delete(f"session:{session_id}")
                    return True
        except: pass

    db = _load_db()
    initial_len = len(db)
    db = [s for s in db if not (s["id"] == session_id and s.get("user_id") == user_id)]
    if len(db) < initial_len:
        # Re-save the whole file DB
        os.makedirs(os.path.dirname(SESSIONS_FILE), exist_ok=True)
        with open(SESSIONS_FILE, "w") as f:
            json.dump(db, f, indent=2)
        return True
    return False
