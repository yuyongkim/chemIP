"""GET/HEAD /data/v1/<area>/[<sub>/]<file> on the PC site for the static areas listed in AREAS — the same URLs the
Cloudflare Worker serves from R2 (cloudflare/worker/src/routes/static_data.js), read from the local export folder
(scripts/static_export/config.py OUT, default E:\\dev-cache\\chemip-static\\out\\v1; env CHEMIP_STATIC_EXPORT_DIR).

Next (frontend/next.config.ts) rewrites those paths here. Files are stored gzip-compressed (CONTRACT.md) and sent as is
with ``Content-Encoding: gzip``. Missing or invalid → 404 JSON. A new area = one entry in AREAS.
"""
from __future__ import annotations

import os
import re
from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import JSONResponse, Response

router = APIRouter()

EXPORT_DIR = Path(os.getenv("CHEMIP_STATIC_EXPORT_DIR", r"E:\dev-cache\chemip-static\out\v1"))
# area path (as in the URL) → cache-control. Same values as the Worker's STATIC_DATA.AREA_CACHE_CONTROL.
AREAS = {
    "reg": "public, max-age=3600, stale-while-revalidate=86400",
    "reg/list": "public, max-age=86400",
    "oel": "public, max-age=604800, stale-while-revalidate=86400",  # exposure limits by CAS (Worker HIT_CACHE_CONTROL)
    "el": "public, max-age=604800, stale-while-revalidate=86400",  # emergency exposure guidelines by CAS + index.json
    "feed": "public, max-age=900, stale-while-revalidate=3600",  # incident feed latest.json (CONTRACT.md "feed/")
    "feed/by-cas": "public, max-age=3600",
    "f": "public, max-age=604800, stale-while-revalidate=86400",  # facts·identifiers·UN (CONTRACT.md "f/<CAS>.json")
    "rel": "public, max-age=604800, stale-while-revalidate=86400",  # related substances
    "prtr": "public, max-age=604800, stale-while-revalidate=86400",  # PRTR facility map
    "gs": "public, max-age=604800, stale-while-revalidate=86400",  # KOSHA guide full-text index
    "tp": "public, max-age=604800, stale-while-revalidate=86400",  # temperature-dependent property correlations by CAS
    "law": "public, max-age=604800, stale-while-revalidate=86400",  # Korean law corpus (index·toc·lists·<doc id>·cas_<n>)
    "g": "public, max-age=3600, stale-while-revalidate=86400",  # shared files (rulebook, guide_index, un_index, oel_summary …)
}
FILE_RE = re.compile(r"^[A-Za-z0-9_][A-Za-z0-9_.\-]*\.(json|xml)$")
TYPES = {"json": "application/json", "xml": "application/rss+xml; charset=utf-8"}
MISS_CACHE_CONTROL = "public, max-age=60"


def resolve(area: str, file: str) -> Path | None:
    """URL area + file name → local file, or None when the area is not served, the name is unsafe or it is missing."""
    if area not in AREAS or not FILE_RE.match(file or "") or ".." in file:
        return None
    path = EXPORT_DIR.joinpath(*area.split("/"), file)
    return path if path.is_file() else None


def _send(area: str, file: str) -> Response:
    path = resolve(area, file)
    if path is None:
        return JSONResponse({"detail": "Not Found"}, status_code=404, headers={"Cache-Control": MISS_CACHE_CONTROL})
    body = path.read_bytes()
    headers = {"Cache-Control": AREAS[area]}
    if body[:2] == b"\x1f\x8b":
        headers["Content-Encoding"] = "gzip"
    return Response(body, media_type=TYPES[file.rsplit(".", 1)[1]], headers=headers)


@router.api_route("/{area}/{file}", methods=["GET", "HEAD"])
def get_area_file(area: str, file: str):
    return _send(area, file)


@router.api_route("/{area}/{sub}/{file}", methods=["GET", "HEAD"])
def get_area_sub_file(area: str, sub: str, file: str):
    return _send(f"{area}/{sub}", file)
