"""kr_rules.json 의 한국 수입·수출 의무 규칙을 물질 사실(NCIS 분류 + 목록 등재)에 맞춰 고른다.

규칙의 when 형식: {"ncis_category": "유독물질"} 또는 {"list": "ROTTERDAM_PIC"}. 값은 문자열 또는 문자열 목록(그중 하나면 충족).
  {"any_substance": true} 는 모든 물질, {"any_of": [when, when, ...]} 는 그중 하나만 충족하면 된다.
when 에 키가 여럿이면 모두 충족해야 한다. 모르는 키가 있으면 그 규칙은 고르지 않는다(잘못된 의무 표시 방지).
"active": false 인 규칙은 고르지 않는다.
"""
from __future__ import annotations

from typing import Any, Iterable

from backend.core.trade_controls import paths
from backend.core.trade_controls.lists import load_json
from backend.core.trade_controls.substance import base_category

DIRECTIONS = ("import", "export")


def load_kr_rules() -> dict | None:
    return load_json(paths.file_path(paths.KR_RULES_FILE))


def _as_set(value: Any) -> set[str]:
    values = value if isinstance(value, (list, tuple)) else [value]
    return {str(v).strip() for v in values if str(v or "").strip()}


def _direction_applies(rule_direction: Any, direction: str) -> bool:
    d = str(rule_direction or "both").strip().lower()
    return d == "both" or d == direction


def _match_condition(when: dict, categories: set[str], lists: set[str]) -> dict | None:
    """충족한 조건을 돌려준다. 하나라도 못 맞추면 None."""
    if not isinstance(when, dict) or not when:
        return None
    matched: dict[str, list[str]] = {}
    for key, value in when.items():
        if key == "any_substance":
            if value is not True:
                return None
            matched[key] = ["*"]
            continue
        if key == "any_of":
            subs = [_match_condition(w, categories, lists) for w in value] if isinstance(value, list) else []
            hits = [m for m in subs if m]
            if not hits:
                return None
            for m in hits:  # 충족한 갈래를 모두 합쳐 보여 준다
                for k, v in m.items():
                    matched.setdefault(k, [])
                    matched[k] += [x for x in v if x not in matched[k]]
            continue
        if key == "ncis_category":
            wanted = {base_category(v) for v in _as_set(value)}
            hit = sorted(wanted & categories)
        elif key == "list":
            hit = sorted(_as_set(value) & lists)
        else:
            return None
        if not hit:
            return None
        matched[key] = hit
    return matched


def evaluate(rules: Iterable[dict], *, categories: set[str], lists: set[str], direction: str) -> list[dict]:
    """방향과 조건에 맞는 규칙만 골라 근거(citation)를 붙여 돌려준다."""
    out: list[dict] = []
    for rule in rules or []:
        if not isinstance(rule, dict) or rule.get("active") is False or not _direction_applies(rule.get("direction"), direction):
            continue
        matched = _match_condition(rule.get("when") or {}, categories, lists)
        if matched is None:
            continue
        out.append({
            **rule,
            "matched_by": matched,
            "customs_confirmation": bool(rule.get("customs_confirmation")),
            "citation": {
                "legal_basis": rule.get("legal_basis", ""),
                "source_url": rule.get("source_url", ""),
                "verified_text": rule.get("verified_text", ""),
                "supporting": [c for c in rule.get("supporting_citations") or [] if isinstance(c, dict)],
            },
        })
    return out
