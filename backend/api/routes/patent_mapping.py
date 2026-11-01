"""GET/HEAD /data/v1/pat/<CAS>/{index,<JUR>}.json on the PC site — the same URLs the Cloudflare Worker serves from R2
(cloudflare/worker/src/routes/static_data.js), read from the local export folder (settings.PATENT_MAPPING_DIR).

Next (frontend/next.config.ts) rewrites /data/v1/pat/* here. ``<JUR>.json`` is stored gzip-compressed and is sent as is
with ``Content-Encoding: gzip`` (like R2); ``index.json`` is plain JSON. Missing or invalid → 404 JSON.
"""

from fastapi import APIRouter
from fastapi.responses import FileResponse, JSONResponse

from backend.core import patent_mapping

router = APIRouter()

HIT_CACHE_CONTROL = "public, max-age=604800, stale-while-revalidate=86400"  # same as the Worker's STATIC_DATA
MISS_CACHE_CONTROL = "public, max-age=60"


@router.api_route("/{cas}/{file}", methods=["GET", "HEAD"])
def get_patent_mapping_file(cas: str, file: str):
    found = patent_mapping.resolve_file(cas, file)
    if not found:
        return JSONResponse({"detail": "Not Found"}, status_code=404, headers={"Cache-Control": MISS_CACHE_CONTROL})
    path, is_gzip = found
    headers = {"Cache-Control": HIT_CACHE_CONTROL}
    if is_gzip:
        headers["Content-Encoding"] = "gzip"
    return FileResponse(path, media_type="application/json", headers=headers)
