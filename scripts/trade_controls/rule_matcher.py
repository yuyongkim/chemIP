"""규칙의 when 조건을 CAS 집합으로 푼다.

지원 형식
- {"ncis_category": "분류명"} 또는 {"ncis_category": ["분류A", "분류B"]}  (목록은 '하나라도')
- {"list": "ROTTERDAM_PIC"} 또는 {"list": [...]}
- {"any_substance": true}  (NCIS 에 등재된 모든 물질)
- {"any_of": [조건, 조건, ...]}
"""
from __future__ import annotations

from .ncis_index import SubstanceIndex


def _as_list(value) -> list[str]:
    return [value] if isinstance(value, str) else list(value or [])


def referenced_categories(when: dict) -> list[str]:
    """조건이 참조하는 NCIS 분류명(검증용)."""
    out = _as_list(when.get("ncis_category"))
    for sub in when.get("any_of", []):
        out += referenced_categories(sub)
    return out


def referenced_lists(when: dict) -> list[str]:
    out = _as_list(when.get("list"))
    for sub in when.get("any_of", []):
        out += referenced_lists(sub)
    return out


def match(when: dict, idx: SubstanceIndex) -> set[str]:
    if when.get("any_substance"):
        return set(idx.all_cas)
    hit: set[str] = set()
    for name in _as_list(when.get("ncis_category")):
        hit |= idx.by_category.get(name, set())
    for code in _as_list(when.get("list")):
        hit |= idx.by_list.get(code, set())
    for sub in when.get("any_of", []):
        hit |= match(sub, idx)
    return hit
