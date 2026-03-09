"""
Shared LLM client — wraps Groq's chat completions API.
Implements model fallback: if a model hits a rate limit (429),
it automatically cascades to the next model in the list.

Priority order (cheapest first to preserve tokens):
  1. llama-3.1-8b-instant      — fastest, ~8x cheaper than 70b
  2. gemma2-9b-it               — Google Gemma, good for SQL/JSON
  3. mixtral-8x7b-32768         — Mixtral MoE, strong mid-tier
  4. llama-3.3-70b-versatile    — full power, last resort
"""
import os
import time
import logging
from groq import Groq, RateLimitError
from dotenv import load_dotenv

load_dotenv(override=True)

logger = logging.getLogger(__name__)

# ── Model cascade list ─────────────────────────────────────────────────────
# Override with GROQ_MODELS env var as comma-separated list, or use defaults.
_env_models = os.getenv("GROQ_MODELS", "")
GROQ_MODEL_CASCADE: list[str] = (
    [m.strip() for m in _env_models.split(",") if m.strip()]
    if _env_models
    else [
        "llama-3.3-70b-versatile",
        "llama-3.1-70b-versatile",
        "llama-3.1-8b-instant",
        "mixtral-8x7b-32768",
        "gemma2-9b-it",
    ]
)

_client: Groq | None = None


def _get_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=os.getenv("GROQ_API_KEY", ""))
    return _client


def chat(system: str, user: str, temperature: float = 0.0) -> str:
    """
    Sends a request to Groq using the first available model.
    On RateLimitError (429) cascades through GROQ_MODEL_CASCADE.
    """
    client = _get_client()
    last_error = None

    for model in GROQ_MODEL_CASCADE:
        try:
            print(f"[LLM] Trying model: {model}")
            response = client.chat.completions.create(
                model=model,
                temperature=temperature,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user",   "content": user},
                ],
            )
            content = response.choices[0].message.content.strip()
            if model != GROQ_MODEL_CASCADE[0]:
                print(f"[LLM] SUCCESS after fallback to {model}")
            return content

        except RateLimitError as e:
            print(f"[LLM] Rate limit on {model}. Trying next in cascade...")
            last_error = e
            time.sleep(0.5) 
            continue

        except Exception as e:
            print(f"[LLM] CRITICAL ERROR on {model}: {e}")
            raise

    print(f"[LLM] FAILED - All models exhausted. Last error: {last_error}")
    raise last_error
