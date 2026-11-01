"""Substance → patent mapping files (read-only): ``<PATENT_MAPPING_DIR>/<CAS>/index.json`` + ``<JUR>.json.gz``.

Built by ``scripts/patent_export`` (format and matching rules: ``scripts/patent_export/README.md``). The same files
are in R2 under ``v1/pat/<CAS>/`` (``<JUR>.json`` there = ``<JUR>.json.gz`` here) and served by the Worker; on the PC
site ``backend/api/routes/patent_mapping.py`` serves them from this folder. Nothing here writes.

Licence of the Lens.org-derived source is unconfirmed, so callers that pass data on (AI evidence) use titles only.
"""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path

from backend.config.settings import settings

logger = logging.getLogger(__name__)

CAS_RE = re.compile(r"^\d{2,7}-\d{2}-\d$")
INDEX_FILE = "index.json"
JURISDICTION_FILE_RE = re.compile(r"^([A-Z]{2})\.json$")  # published name; stored as <JUR>.json.gz
GZIP_SUFFIX = ".gz"


def mapping_dir() -> Path:
    return Path(settings.PATENT_MAPPING_DIR)


def resolve_file(cas: str, name: str) -> tuple[Path, bool] | None:
    """Published ``<CAS>/<name>`` → (local path, is_gzip), or None when invalid or missing."""
    if not CAS_RE.match(cas or ""):
        return None
    folder = mapping_dir() / cas
    if name == INDEX_FILE:
        path, gz = folder / INDEX_FILE, False
    elif JURISDICTION_FILE_RE.match(name or ""):
        path, gz = folder / f"{name}{GZIP_SUFFIX}", True
    else:
        return None
    return (path, gz) if path.is_file() else None


def read_index(cas: str) -> dict | None:
    """``<CAS>/index.json`` as a dict, or None (no mapping, unreadable, or folder not present on this host)."""
    found = resolve_file(cas, INDEX_FILE)
    if not found:
        return None
    try:
        return json.loads(found[0].read_text(encoding="utf-8"))
    except (OSError, ValueError):
        logger.warning("Unreadable patent mapping index for %s", cas)
        return None


def recent_titles(index: dict | None, limit: int = 3) -> list[dict]:
    """Newest records of an index reduced to id / title / jurisdiction / year / link (no snippet, no abstract text)."""
    rows: list[dict] = []
    for item in (index or {}).get("recent") or []:
        title = str(item.get("title", "") or "").strip()
        patent_id = str(item.get("patent_id", "") or "").strip()
        if not title or not patent_id:
            continue
        rows.append({
            "patent_id": patent_id,
            "title": title,
            "jurisdiction": str(item.get("jurisdiction", "") or "").strip(),
            "year": item.get("year"),
            "link": str(item.get("link", "") or "").strip(),  # viewer URL (Espacenet / Patentscope)
        })
        if len(rows) >= limit:
            break
    return rows
