"""Read-only access to the ChemIP backend: sys.path, read-only sqlite, trade_controls import.

- Puts G:\\MSDS on sys.path so backend modules are imported, not copied (page facts equal API output by construction).
- Every TerminologyDB opens terminology.db with sqlite URI mode=ro and skips create_tables().
  (trade_controls' own NCIS / HS lookups already open their DBs with mode=ro.)
- Run with `python -I -B` so nothing (no __pycache__) is written under G:\\MSDS.
"""
from __future__ import annotations

import os
import sqlite3
import sys

sys.dont_write_bytecode = True

import config  # noqa: E402

if config.PROJECT not in sys.path:
    sys.path.insert(0, config.PROJECT)


def ro_connect(path: str = config.TERM_DB) -> sqlite3.Connection:
    return sqlite3.connect(f"file:{path.replace(os.sep, '/')}?mode=ro", uri=True, check_same_thread=False)


def _patch_terminology_db() -> None:
    from backend.config.settings import settings
    from backend.core import terminology_db as tdb

    if os.path.normcase(os.path.abspath(str(settings.TERMINOLOGY_DB_PATH))) != os.path.normcase(config.TERM_DB):
        raise SystemExit(f"backend TERMINOLOGY_DB_PATH {settings.TERMINOLOGY_DB_PATH} != {config.TERM_DB}")

    def _ro_init(self, db_path=None):
        self.db_path = db_path or config.TERM_DB
        self.conn = ro_connect(self.db_path)

    tdb.TerminologyDB.__init__ = _ro_init


_patch_terminology_db()

# re-exported for the other modules (they never import backend.* themselves)
from backend.core.trade_controls import build_trade_controls, hs_codes, permits  # noqa: E402
from backend.core.trade_controls import lists as tc_lists  # noqa: E402
from backend.core.trade_controls.substance import base_category  # noqa: E402

__all__ = ["ro_connect", "build_trade_controls", "hs_codes", "permits", "tc_lists", "base_category"]
