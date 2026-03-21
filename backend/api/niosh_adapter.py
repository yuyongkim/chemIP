"""NIOSH Pocket Guide (NPG) adapter.

Provides occupational exposure limits (REL, PEL, IDLH) and PPE recommendations
from a static dataset derived from the NIOSH Pocket Guide to Chemical Hazards.

Source: https://www.cdc.gov/niosh/npg/
No API key required — data is bundled as a local JSON file.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Dict, List

logger = logging.getLogger(__name__)

_DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "niosh_npg.json"

# CAS → record index built once on first access
_cas_index: dict[str, dict] = {}
_name_lower_index: dict[str, dict] = {}
_all_chemicals: list[dict] = []
_loaded = False


def _ensure_loaded() -> None:
    """Lazily load and index the NIOSH NPG dataset."""
    global _loaded
    if _loaded:
        return

    try:
        raw = _DATA_PATH.read_text(encoding="utf-8")
        data = json.loads(raw)
        chemicals = data.get("chemicals", [])

        for chem in chemicals:
            cas = chem.get("cas", "").strip()
            if cas:
                _cas_index[cas] = chem
            name = chem.get("name", "").strip().lower()
            if name:
                _name_lower_index[name] = chem
            _all_chemicals.append(chem)

        _loaded = True
        logger.info("NIOSH NPG loaded: %d chemicals indexed", len(_all_chemicals))

    except FileNotFoundError:
        logger.error("NIOSH NPG data file not found: %s", _DATA_PATH)
    except Exception as exc:
        logger.exception("Failed to load NIOSH NPG data: %s", exc)


class NioshAdapter:
    """Read-only adapter for the local NIOSH Pocket Guide dataset."""

    def search_by_cas(self, cas: str) -> Dict[str, Any]:
        """Look up a chemical by CAS Registry Number.

        Returns the full NIOSH NPG record including REL, PEL, IDLH, and PPE.
        """
        _ensure_loaded()
        cas = cas.strip()
        if not cas:
            return {"status": "error", "message": "Empty CAS number"}

        record = _cas_index.get(cas)
        if record:
            return {"status": "success", "data": [record], "total": 1}
        return {"status": "success", "data": [], "total": 0}

    def search_by_name(self, query: str, limit: int = 20) -> Dict[str, Any]:
        """Search by chemical name (case-insensitive substring match)."""
        _ensure_loaded()
        query = query.strip().lower()
        if not query:
            return {"status": "error", "message": "Empty query"}

        # Exact match first
        exact = _name_lower_index.get(query)
        if exact:
            return {"status": "success", "data": [exact], "total": 1}

        # Substring match
        matches: List[dict] = []
        for chem in _all_chemicals:
            name = chem.get("name", "").lower()
            if query in name:
                matches.append(chem)
                if len(matches) >= limit:
                    break

        return {"status": "success", "data": matches, "total": len(matches)}

    def search(self, query: str, limit: int = 20) -> Dict[str, Any]:
        """Search by CAS number or name (auto-detects CAS pattern)."""
        query = query.strip()
        if not query:
            return {"status": "error", "message": "Empty query"}

        # CAS pattern: digits-digits-digit(s)
        if _looks_like_cas(query):
            result = self.search_by_cas(query)
            if result.get("total", 0) > 0:
                return result

        # Fall back to name search
        return self.search_by_name(query, limit=limit)

    def list_carcinogens(self) -> Dict[str, Any]:
        """Return all NIOSH-designated potential occupational carcinogens."""
        _ensure_loaded()
        carcinogens = [c for c in _all_chemicals if c.get("carcinogen")]
        return {"status": "success", "data": carcinogens, "total": len(carcinogens)}

    def get_exposure_summary(self, cas: str) -> Dict[str, Any]:
        """Return a compact exposure-limit summary for a CAS number.

        Designed for embedding into a broader chemical report.
        """
        _ensure_loaded()
        cas = cas.strip()
        record = _cas_index.get(cas)
        if not record:
            return {"status": "success", "data": None, "total": 0}

        summary = {
            "name": record.get("name"),
            "cas": record.get("cas"),
            "niosh_rel": record.get("rel"),
            "niosh_rel_stel": record.get("rel_stel"),
            "niosh_rel_ceiling": record.get("rel_ceiling"),
            "osha_pel": record.get("pel"),
            "idlh": record.get("idlh"),
            "carcinogen": record.get("carcinogen", False),
            "skin_absorption": record.get("ppe_skin", False),
            "target_organs": record.get("target_organs"),
        }
        return {"status": "success", "data": summary, "total": 1}


def _looks_like_cas(s: str) -> bool:
    """Heuristic: CAS numbers look like 7664-93-9."""
    import re
    return bool(re.match(r"^\d{1,7}-\d{2}-\d$", s))
