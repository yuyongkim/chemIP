"""ASGI entry for the snapshot server: installs the HTTP cassette, then serves backend.main:app unchanged.

Started by run_snapshots.py with --app-dir tests/snapshots. Never used by production.
Env: SNAPSHOT_CASSETTE (path), SNAPSHOT_MODE (record|replay).
"""
from __future__ import annotations

import logging
import os
import sys
from pathlib import Path

sys.dont_write_bytecode = True
PROJECT = Path(__file__).resolve().parents[2]
if str(PROJECT) not in sys.path:
    sys.path.insert(0, str(PROJECT))

import cassette  # noqa: E402  (same folder, on --app-dir)

cassette.install(cassette.Cassette(Path(os.environ["SNAPSHOT_CASSETTE"]), os.environ.get("SNAPSHOT_MODE", "replay")))

from backend.main import app  # noqa: E402,F401

# The audit logger writes to the production logs/audit.log; detach it for the snapshot server.
_audit = logging.getLogger("chemip.audit")
for _h in list(_audit.handlers):
    _audit.removeHandler(_h)
    _h.close()
_audit.addHandler(logging.NullHandler())
