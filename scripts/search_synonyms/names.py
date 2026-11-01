"""Pure helpers: one raw text cell -> the clean names it holds (rules come from synonym_sources.json)."""
from __future__ import annotations

import re

from spec import PROJECT  # noqa: F401  (backend on sys.path)
from backend.core.chemical_aliases import normalize_alias

_CAS = re.compile(r"^\d{2,7} \d{2} \d$")


def paren_after_name_en(name: str | None, name_en: str | None) -> str:
    """ECHA rows are stored as '<name_en> (<IUPAC name>)'; return the IUPAC part, or '' when absent/identical."""
    name, name_en = (name or "").strip(), (name_en or "").strip()
    if not name_en or not name.startswith(name_en):
        return ""
    rest = name[len(name_en):].strip()
    if not (rest.startswith("(") and rest.endswith(")")):
        return ""
    inner = rest[1:-1].strip()
    return "" if normalize_alias(inner) == normalize_alias(name_en) else inner


def split_names(raw: str | None, spec: dict, src: dict | None = None) -> list[str]:
    """Split a cell on the spec separator, strip edge characters and a per-source suffix, drop CAS-like and
    too-short / too-long parts. src may set split (regex), skip_if (regex on the whole cell), strip_suffix (regex)."""
    src = src or {}
    raw = raw or ""
    if src.get("skip_if") and re.search(src["skip_if"], raw):
        return []
    parts = re.split(src["split"], raw) if src.get("split") else raw.split(spec["split"])
    out = []
    for part in parts:
        part = part.strip(spec["strip_chars"])
        if src.get("strip_suffix"):
            part = re.sub(src["strip_suffix"], "", part, flags=re.IGNORECASE).strip(spec["strip_chars"])
        norm = normalize_alias(part)
        if len(norm) >= 2 and len(part) <= spec["max_name_chars"] and not _CAS.match(norm):
            out.append(part)
    return out
