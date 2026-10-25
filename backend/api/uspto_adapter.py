"""USPTO patent index adapter (local SQLite)."""

from __future__ import annotations

import logging
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


class UsptoAdapter(PatentIndexBase):
    def __init__(self, db_path: str | None = None):
        super().__init__(db_path or settings.USPTO_INDEX_DB_PATH)

    def search_patents_by_chem_id(
        self,
        chem_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        raw_limit = min(max(offset + (limit * 5), 100), 1000)
        sql = """\
            SELECT patent_id, title, file_path, matched_term, section, snippet, created_at
            FROM patent_index
            WHERE chem_id = ?
            LIMIT ?"""

        rows = self._query(sql, (chem_id, raw_limit))

        results = [
            {
                "patent_id": row[0],
                "title": row[1],
                "file_path": row[2],
                "matched_term": row[3],
                "section": row[4],
                "snippet": row[5],
                "created_at": row[6],
                "source": "USPTO (Local)",
            }
            for row in rows
        ]
        results.sort(
            key=lambda r: (
                SECTION_PRIORITY.get(str(r.get("section") or ""), 9),
                str(r.get("created_at") or ""),
            ),
        )
        paginated = results[offset: offset + limit]
        logger.info("USPTO search for '%s': %d results sampled, %d returned", chem_id, len(results), len(paginated))
        return paginated
