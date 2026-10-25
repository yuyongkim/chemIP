"""Spelling normalisation for law item names (data in data/element_aliases.json)."""
from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path

_DATA = Path(__file__).with_name("data")


@lru_cache(maxsize=1)
def element_aliases() -> dict[str, str]:
    return json.loads((_DATA / "element_aliases.json").read_text(encoding="utf-8"))["aliases"]


def element_name(name: str) -> str:
    """'안티모니' -> '안티몬' (kr_env element table spelling); other names unchanged."""
    return element_aliases().get(name, name)


@lru_cache(maxsize=1)
def _ko_en() -> dict[str, list[str]]:
    from kr_env import termdb
    raw = json.loads((_DATA / "ko_en_names.json").read_text(encoding="utf-8"))["names"]
    return {termdb.norm(k): (v if isinstance(v, list) else [v]) for k, v in raw.items()}


def english_for(name: str) -> list[str] | None:
    """English name(s) for a Korean law name from data/ko_en_names.json (exact normalised key)."""
    from kr_env import termdb
    return _ko_en().get(termdb.norm(name))


@lru_cache(maxsize=1)
def _rejects() -> list[dict]:
    return json.loads((_DATA / "match_rejects.json").read_text(encoding="utf-8"))["rejects"]


def drop_rejected(acc: dict, list_id: str = "*") -> int:
    """Move reviewed-wrong name matches (data/match_rejects.json) from entries to unmatched."""
    from kr_env import termdb
    keep, moved = [], 0
    for e in acc["entries"]:
        hit = None
        if e.get("match_method") == "name_match":
            n = termdb.norm(e.get("name_ko") or "")
            hit = next((r for r in _rejects() if r["cas"] == e["cas"] and r["lists"] in ("*", list_id)
                        and n.startswith(termdb.norm(r["name_prefix"]))), None)
        if hit:
            moved += 1
            acc["unmatched"].append({"name": e.get("name_ko"), "name_en": e.get("name_en"), "detail": e.get("detail"),
                                     "item_no": e.get("item_no"), "reason": "rejected_wrong_db_match",
                                     "rejected_cas": e["cas"], "why": hit["why"], "candidates": []})
        else:
            keep.append(e)
    acc["entries"] = keep
    return moved


_FAMILY_SUFFIX = re.compile(r"\s*(?:및|과|와)\s*그\s*(염류|염|에스텔류|에스터류|에스터|유도체)(?:\s*및\s*(?:그\s*)?(염류|에스텔류|에스터류))?")


def family_base(name: str) -> str | None:
    """'X 및 그 염류' / 'X 및 그 에스텔류' -> 'X' (None when the name has no such suffix)."""
    m = _FAMILY_SUFFIX.search(name)
    return name[:m.start()].strip() if m else None
