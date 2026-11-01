"""API router table: (route module, URL prefix, OpenAPI tag), mounted in this order by backend/main.py.

A new API area is one route module + one row here.
"""
from __future__ import annotations

from backend.api.routes import (
    ai, chemicals, docs, drugs, feedback, guides, handlers, integrations, patent_mapping, patents, regulations, trade, usage,
)
from backend.api.routes import prtr_map  # PRTR facility map (portal service 13)
from backend.api.routes import reach  # on-demand EU REACH registration lookup (ECHA CHEM, one CAS per request)
from backend.api.routes import static_areas  # /data/v1/<area>/ static export files on the PC site (portal service 6: reg)

API_ROUTERS = (
    (chemicals, "/api/chemicals", "Chemicals"),
    (patents, "/api/patents", "Patents"),
    (trade, "/api/trade", "Trade"),
    (drugs, "/api/drugs", "Drugs"),
    (guides, "/api/guides", "Guides"),
    (regulations, "/api/regulations", "Regulations"),
    (handlers, "/api/handlers", "Handlers"),
    (prtr_map, "/api/prtr", "PRTR facility map"),
    (reach, "/api/reach", "EU REACH registration"),
    (integrations, "/api/integrations", "Integrations"),
    (ai, "/api/ai", "AI"),
    (docs, "/api/docs", "Docs"),
    (feedback, "/api/feedback", "Feedback"),
    (usage, "/api/usage", "Usage"),
    # Static-file URL (same as the Cloudflare Worker), not /api: substance → patent mapping files.
    (patent_mapping, "/data/v1/pat", "Patent mapping"),
    (static_areas, "/data/v1", "Static export areas"),  # after patent_mapping; areas listed in static_areas.AREAS
)
