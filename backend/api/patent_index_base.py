"""Base class for SQLite patent-index adapters.

Both :class:`GlobalPatentAdapter` and :class:`UsptoAdapter` share an
identical connection/query lifecycle.  This module captures the common
pattern so each concrete adapter only needs to define its column list,
result mapping, and default DB path.
"""

from __future__ import annotations

import logging
import os
import sqlite3
from typing import Any

logger = logging.getLogger(__name__)

# SQL fragment shared by every patent-index query.
SECTION_PRIORITY_ORDER = """\
ORDER BY
    CASE
        WHEN section = 'Title'       THEN 1
        WHEN section = 'Abstract'    THEN 2
        WHEN section = 'Claims'      THEN 3
        WHEN section = 'Description' THEN 4
        ELSE 5
    END ASC,
    created_at DESC"""


class PatentIndexBase:
    """Thin wrapper around a read-only SQLite patent index."""

    def __init__(self, db_path: str):
        self.db_path = db_path

    # -- connection management ------------------------------------------

    def _connect(self) -> sqlite3.Connection | None:
        if not os.path.exists(self.db_path):
            logger.warning("Patent database not found: %s", self.db_path)
            return None
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA busy_timeout=5000")
        return conn

    def _query(
        self,
        sql: str,
        params: tuple[Any, ...],
    ) -> list[sqlite3.Row] | list[tuple[Any, ...]]:
        """Execute *sql* and return all rows, or ``[]`` on any error."""
        conn = self._connect()
        if not conn:
            return []
        try:
            cursor = conn.cursor()
            cursor.execute(sql, params)
            return cursor.fetchall()
        except Exception as exc:
            logger.error("Patent index query error (%s): %s", self.db_path, exc)
            return []
        finally:
            conn.close()
