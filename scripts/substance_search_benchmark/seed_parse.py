"""Parse frontend/lib/chemip-seed.ts (the SEO seed list) into [(cas, ko)] without copying it."""
from __future__ import annotations

import re

import config

_ENTRY = re.compile(r'\{\s*cas:\s*"([^"]+)"\s*,\s*ko:\s*"([^"]*)"\s*\}')


def load_seeds(path: str = config.SEED_TS) -> list[tuple[str, str]]:
    with open(path, encoding="utf-8") as fh:
        return [(m.group(1).strip(), m.group(2).strip()) for m in _ENTRY.finditer(fh.read())]
