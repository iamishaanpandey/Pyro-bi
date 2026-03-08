"""
Redis Service — optional caching layer for query results.
Falls back gracefully when Redis is unavailable.
"""
import os
import json
import hashlib
import redis as redis_lib
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
CACHE_TTL = int(os.getenv("CACHE_TTL_SECONDS", "300"))

_client: redis_lib.Redis | None = None
_available: bool = True


def _get_client() -> redis_lib.Redis | None:
    global _client, _available
    if not _available:
        return None
    if _client is None:
        try:
            _client = redis_lib.from_url(REDIS_URL, decode_responses=True, socket_connect_timeout=2)
            _client.ping()
            print("[Redis] Connected.")
        except Exception as ex:
            print(f"[Redis] Unavailable — caching disabled. ({ex})")
            _available = False
            return None
    return _client


def make_cache_key(query: str) -> str:
    return "bi_query:" + hashlib.sha256(query.strip().lower().encode()).hexdigest()


def get_cached(query: str) -> dict | None:
    client = _get_client()
    if not client:
        return None
    try:
        raw = client.get(make_cache_key(query))
        return json.loads(raw) if raw else None
    except Exception:
        return None


def set_cached(query: str, value: dict) -> None:
    client = _get_client()
    if not client:
        return
    try:
        client.setex(make_cache_key(query), CACHE_TTL, json.dumps(value, default=str))
    except Exception:
        pass
