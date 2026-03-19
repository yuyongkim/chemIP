"""USPTO patent index adapter (local SQLite)."""

from __future__ import annotations

import logging
from typing import Any

from backend.api.patent_index_base import SECTION_PRIORITY_ORDER, PatentIndexBase
from backend.config.settings import settings

logger = logging.getLogger(__name__)


class UsptoAdapter(PatentIndexBase):
    def __init__(self, db_path: str | None = None):
        super().__init__(db_path or settings.USPTO_INDEX_DB_PATH)

    def search_patents_by_chem_id(
        self,
        chem_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        sql = f"""\
            SELECT patent_id, title, file_path, matched_term, created_at
            FROM patent_index
            WHERE chem_id = ?
            {SECTION_PRIORITY_ORDER}
            LIMIT ? OFFSET ?"""

        rows = self._query(sql, (chem_id, limit, offset))

        results = [
            {
                "patent_id": row[0],
                "title": row[1],
                "file_path": row[2],
                "matched_term": row[3],
                "source": "USPTO (Local)",
            }
            for row in rows
        ]
        logger.info("USPTO search for '%s': %d results", chem_id, len(results))
        return results
