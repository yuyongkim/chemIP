"""Local LLM client via Ollama.

Provides a thin async/sync wrapper around the Ollama HTTP API.
Falls back gracefully when Ollama is unavailable — callers always
get a result (possibly with ``llm_available=False``).
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

import httpx

from backend.config.settings import settings

logger = logging.getLogger(__name__)


@dataclass
class LLMResponse:
    text: str
    model: str
    available: bool
    error: str = ""


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

def is_ollama_ready() -> bool:
    """Return True if Ollama is reachable and has the configured model."""
    if not settings.LLM_ENABLED:
        return False
    try:
        r = httpx.get(f"{settings.LLM_BASE_URL}/api/tags", timeout=3)
        if r.status_code != 200:
            return False
        models = [m.get("name", "") for m in r.json().get("models", [])]
        model_base = settings.LLM_MODEL.split(":")[0]
        return any(model_base in m for m in models)
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Synchronous generation (used inside FastAPI sync endpoints)
# ---------------------------------------------------------------------------

def generate(prompt: str, *, system: str = "") -> LLMResponse:
    """Send a single-turn prompt to the local Ollama model.

    Returns an :class:`LLMResponse` — never raises.
    """
    if not settings.LLM_ENABLED:
        return LLMResponse(text="", model="", available=False, error="LLM disabled")

    payload = {
        "model": settings.LLM_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {
            "num_predict": settings.LLM_MAX_TOKENS,
            "temperature": settings.LLM_TEMPERATURE,
        },
    }
    if system:
        payload["system"] = system

    try:
        r = httpx.post(
            f"{settings.LLM_BASE_URL}/api/generate",
            json=payload,
            timeout=settings.LLM_TIMEOUT_SECONDS,
        )
        if r.status_code != 200:
            msg = f"Ollama HTTP {r.status_code}"
            logger.warning("LLM request failed: %s", msg)
            return LLMResponse(text="", model=settings.LLM_MODEL, available=False, error=msg)

        body = r.json()
        return LLMResponse(
            text=body.get("response", "").strip(),
            model=body.get("model", settings.LLM_MODEL),
            available=True,
        )
    except httpx.ConnectError:
        logger.info("Ollama not reachable at %s", settings.LLM_BASE_URL)
        return LLMResponse(text="", model="", available=False, error="Ollama not reachable")
    except httpx.TimeoutException:
        logger.warning("Ollama timed out after %ss", settings.LLM_TIMEOUT_SECONDS)
        return LLMResponse(text="", model=settings.LLM_MODEL, available=False, error="timeout")
    except Exception as exc:
        logger.error("LLM generation error: %s", exc)
        return LLMResponse(text="", model="", available=False, error=str(exc))
