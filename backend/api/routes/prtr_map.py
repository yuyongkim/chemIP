"""PRTR facility map on the PC site: GET /api/prtr/index and /api/prtr/{cas}.

Same bodies as the static files v1/prtr/index.json and v1/prtr/<CAS>.json (backend/core/prtr_map.py builds both),
so the screen works the same with static data switched off. Reads data/prtr/prtr_facilities.sqlite read-only.
"""
from __future__ import annotations

import time
from functools import lru_cache
from pathlib import Path

from fastapi import APIRouter, HTTPException

from backend.config.settings import PROJECT_ROOT
from backend.core.prtr_map import CAS_RE, build_all, connect_ro

router = APIRouter()
PRTR_DB = Path(PROJECT_ROOT) / "data" / "prtr" / "prtr_facilities.sqlite"


@lru_cache(maxsize=2)
def _built(mtime: float) -> tuple[dict, dict]:
    conn = connect_ro(PRTR_DB)
    try:
        return build_all(conn, exported_at=time.strftime("%Y-%m-%d", time.localtime(mtime)))
    finally:
        conn.close()


def _all() -> tuple[dict, dict]:
    if not PRTR_DB.exists():
        raise HTTPException(status_code=404, detail="PRTR cache is not loaded")
    return _built(PRTR_DB.stat().st_mtime)


@router.get("/index")
def prtr_index():
    """Substances that have PRTR facility rows (prtr/index.json)."""
    return _all()[0]


@router.get("/{cas}")
def prtr_substance(cas: str):
    """Per-region counts and reported amounts plus the facility list for one CAS (prtr/<CAS>.json)."""
    if not CAS_RE.match(cas or ""):
        raise HTTPException(status_code=400, detail="CAS number expected, e.g. 108-88-3")
    body = _all()[1].get(cas)
    if body is None:
        raise HTTPException(status_code=404, detail="No PRTR facility rows for this CAS")
    return body
