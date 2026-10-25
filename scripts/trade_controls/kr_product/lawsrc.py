"""law.go.kr access for kr_product.

Reuses the sibling kr_env DRF client (search / fetch_law / fetch_admrul / annexes) instead of a
third copy, but points its download cache at our own raw folder. The override is process-local:
kr_product runs in its own interpreter, kr_env's own runs are unaffected.
"""
from __future__ import annotations

from kr_env import config as _env_config
from kr_env import lawgo as _lawgo

from . import config

_env_config.RAW_ROOT = config.RAW_ROOT

LawDoc = _lawgo.LawDoc
search = _lawgo.search
fetch_law = _lawgo.fetch_law
fetch_admrul = _lawgo.fetch_admrul
annexes = _lawgo.annexes
annex = _lawgo.annex
article_text = _lawgo.article_text
download = _lawgo.download
