"""Global patent index adapter (USPTO, EPO, WIPO, JPO, KIPRIS, CNIPA)."""

from __future__ import annotations

import logging
import re
from typing import Any

from backend.api.patent_index_base import PatentIndexBase
from backend.config.settings import settings

logger = logging.getLogger(__name__)

SECTION_PRIORITY = {
    "Title": 0,
    "Abstract": 1,
    "Claims": 2,
    "Description": 3,
}

_EXCLUSION_RE = re.compile(
    r"\b(free of|no|without|non|substantially free|less than)\b.{0,30}",
)
_USAGE_RE = re.compile(
    r"\b(solvent|solution|dissolved|mixture|comprising|containing|"
    r"reaction|yield|catalyst|reagent|using|use of)\b",
)


class GlobalPatentAdapter(PatentIndexBase):
    def __init__(self, db_path: str | None = None):
        super().__init__(db_path or settings.GLOBAL_PATENT_INDEX_DB_PATH)

    # -- public API -----------------------------------------------------

    def search_patents_by_chem_id(
        self,
        chem_id: str,
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        raw_limit = min(max(offset + (limit * 5), 100), 1000)
        sql = """\
            SELECT patent_id, title, file_path, matched_term,
                   jurisdiction, section, snippet, created_at
            FROM patent_index
            WHERE chem_id = ?
            LIMIT ?"""

        rows = self._query(sql, (chem_id, raw_limit))

        results = [self._map_row(row) for row in rows]
        results.sort(
            key=lambda r: (
                SECTION_PRIORITY.get(str(r.get("section") or ""), 9),
                -int(r["relevance_score"]),
                str(r.get("created_at") or ""),
            ),
        )
        paginated = results[offset: offset + limit]
        logger.info("Global patent search for '%s': %d results sampled, %d returned", chem_id, len(results), len(paginated))
        return paginated

    # -- internals ------------------------------------------------------

    @staticmethod
    def _map_row(row: tuple[Any, ...]) -> dict[str, Any]:
        patent_id, title, file_path, matched_term, jurisdiction, section, snippet, created_at = row
        category, relevance_score = _classify_snippet(snippet, matched_term)
        return {
            "patent_id": patent_id,
            "title": title,
            "file_path": file_path,
            "matched_term": matched_term,
            "jurisdiction": jurisdiction,
            "section": section,
            "snippet": snippet,
            "created_at": created_at,
            "source": f"{jurisdiction} (Global Index)",
            "category": category,
            "relevance_score": relevance_score,
        }


def _classify_snippet(snippet: str | None, matched_term: str | None) -> tuple[str, int]:
    """Return ``(category, relevance_score)`` for a patent snippet."""
    if not snippet or not matched_term:
        return "mention", 1

    snippet_lower = snippet.lower()
    term_lower = matched_term.lower()

    if _EXCLUSION_RE.search(snippet_lower) and re.escape(term_lower) in snippet_lower:
        esc = re.escape(term_lower)
        if re.search(rf"{esc}[\s-]free", snippet_lower) or _EXCLUSION_RE.search(snippet_lower):
            return "exclusion", 0

    if _USAGE_RE.search(snippet_lower):
        return "usage", 2

    return "mention", 1
