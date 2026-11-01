"""Read-only access to the ChemIP backend and its databases.

- Puts G:\\MSDS on sys.path so backend modules are imported, not copied (exports equal API output by construction).
- On import: every TerminologyDB opens terminology.db READ-ONLY (sqlite URI mode=ro) and skips create_tables()
  (the backend's own trade/permit/HS stores already open their DBs with mode=ro).
- prepare_backend(): additionally disables the KOSHA live-fetch fallback of GET /chemicals/{id};
  the exporter never calls external APIs. Call it once per process before using the chemicals route.
"""
from __future__ import annotations

import os
import sqlite3
import sys

sys.dont_write_bytecode = True  # never write __pycache__ under G:\MSDS

import config  # noqa: E402

if config.PROJECT not in sys.path:
    sys.path.insert(0, config.PROJECT)

_PREPARED = False


def ro_connect(path: str = config.TERM_DB) -> sqlite3.Connection:
    return sqlite3.connect(f"file:{path.replace(os.sep, '/')}?mode=ro", uri=True, check_same_thread=False)


def _patch_terminology_db() -> None:
    from backend.config.settings import settings
    from backend.core import terminology_db as tdb

    if os.path.normcase(str(settings.TERMINOLOGY_DB_PATH)) != os.path.normcase(config.TERM_DB):
        raise SystemExit(f"backend TERMINOLOGY_DB_PATH {settings.TERMINOLOGY_DB_PATH} != config.TERM_DB {config.TERM_DB}")

    def _ro_init(self, db_path=None):
        self.db_path = db_path or config.TERM_DB
        self.conn = ro_connect(self.db_path)

    tdb.TerminologyDB.__init__ = _ro_init


def prepare_backend() -> None:
    global _PREPARED
    if _PREPARED:
        return
    from backend.api.routes import chemicals as chem_routes

    chem_routes.adapter.get_msds_detail = lambda *a, **k: {"status": "error", "message": "static export: live fetch disabled"}
    _PREPARED = True


_patch_terminology_db()
