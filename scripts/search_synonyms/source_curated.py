"""Hand-curated, cited name lists (synonym_sources.json curated: KCIA labels, element names, PubChem names).

Each file: {"sources": {code: {tier, ref[, url, derived_from]}}, "items": [{"name", "cas", "source"[, "expect_en"]}]}.
"""
from __future__ import annotations

import spec as S


def load(cfg_list: list[dict]) -> tuple[dict[str, dict], list[dict], list[str]]:
    """(sources, items, files read). An item may carry 'expect_en' (checked against the DB by the builder)."""
    sources, items, files = {}, [], []
    for cfg in cfg_list:
        if cfg.get("optional") and not S.exists(cfg["file"]):
            continue
        data = S.load(cfg["file"])
        files.append(cfg["file"])
        sources.update(data["sources"])
        for it in data["items"]:
            items.append({**it, "_file": cfg["file"]})
    return sources, items, files
