"""GET /api/reach/{cas} — EU REACH registration status of one substance (on-demand ECHA CHEM lookup, cached).

PC twin of the Cloudflare Worker route (cloudflare/worker/src/routes/reach.js), same body:
{cas, list_id, status: registered|not_registered|unknown, registered: true|false|null, reason, entry, echa_url, checked,
 attribution, schema, cached}. Logic and legal rationale: backend/core/reach_registration.py.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from backend.core import reach_registration as reach

router = APIRouter()
BROWSER_CACHE = {"registered": "public, max-age=86400", "not_registered": "public, max-age=3600", "unknown": "no-store"}


@router.get("/{cas}")
def reach_registration(cas: str):
    """REACH registration of this CAS: bundled list → cache → ECHA CHEM. Upstream failure → status "unknown" (200)."""
    c = "".join((cas or "").split())
    if not reach.cas_is_valid(c):
        raise HTTPException(status_code=422, detail="invalid CAS number")
    body = reach.reach_status(c)
    code = 429 if body.get("reason") == "rate_limited" else 200
    return JSONResponse(body, status_code=code, headers={"Cache-Control": BROWSER_CACHE.get(body["status"], "no-store")})
