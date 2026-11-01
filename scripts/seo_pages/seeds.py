"""Live SEO seed list, read from frontend/lib/chemip-seed.ts at build time (the single source; never copied here).

Those CAS are the URLs live today (/chemip/cas/<CAS>, Next route + sitemap.xml, submitted to Search Console), so the
static build must keep every one of them, indexable, under the same URL.
"""
from __future__ import annotations

import re

import config

# one entry per line in the TS array: { cas: "71-43-2", ko: "벤젠" },
_ENTRY = re.compile(r'\{\s*cas:\s*"([^"]+)"\s*,\s*ko:\s*"([^"]*)"\s*\}')
_ARRAY = re.compile(r"SEED_CHEMICALS\s*:\s*SeedChem\[\]\s*=\s*\[(.*?)\];", re.S)


def parse(text: str) -> list[tuple[str, str]]:
    """TS source -> [(cas, ko)] in file order. Fails loudly on an empty array or duplicate CAS."""
    m = _ARRAY.search(text)
    if not m:
        raise SystemExit(f"SEED_CHEMICALS array not found in {config.SEED_TS}")
    body = m.group(1)
    entries = _ENTRY.findall(body)
    if not entries or len(entries) != body.count("cas:"):
        raise SystemExit(f"seed parse: {len(entries)} entries parsed, {body.count('cas:')} 'cas:' keys in the array")
    dupes = sorted({c for c, _ in entries if sum(1 for x, _ in entries if x == c) > 1})
    if dupes:
        raise SystemExit(f"seed parse: duplicate CAS {dupes}")
    return [(cas.strip(), ko.strip()) for cas, ko in entries]


def load() -> dict[str, str]:
    """CAS -> seed Korean name, in file order."""
    with open(config.SEED_TS, encoding="utf-8") as fh:
        return dict(parse(fh.read()))


def extra_rows(seed: dict[str, str], kosha: dict[str, dict]) -> dict[str, dict]:
    """Rows shaped like sources.kosha_substances() for seeds with no KOSHA record (no chem_id, no MSDS)."""
    return {cas: {"chem_id": "", "name": ko, "name_en": "", "has_s2": False}
            for cas, ko in seed.items() if cas not in kosha}
