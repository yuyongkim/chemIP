"""인허가·신고(kr_permits_*.json)를 물질이 등재된 목록에 맞춰 고른다. 수입·수출 방향과 무관하다.

항목 형식: {"trigger": {"list_id": "...", "condition": "..."}, "permit" 또는 "obligation", "authority",
          "legal_basis", "source_url", "verified_text", ...}
- trigger 는 dict 하나 또는 dict 목록(그중 하나면 충족). list_id(또는 list_ids)는 문자열 또는 목록.
- trigger 에 list_id 대신 ncis_category 를 써도 된다.
- condition(예: "연간 1톤 이상 취급")은 수량을 알 수 없어 평가하지 않고 그대로 보여 준다.
파일 머리는 dict(목록은 permits/items/rules/entries 키) 또는 항목 목록 그 자체.
"""
from __future__ import annotations

from typing import Any

from backend.core.trade_controls import paths
from backend.core.trade_controls.lists import load_json_any
from backend.core.trade_controls.substance import base_category

_ITEM_KEYS = ("permits", "items", "rules", "entries")


def _items_of(data: Any) -> list[dict] | None:
    if isinstance(data, list):
        return [x for x in data if isinstance(x, dict)]
    if isinstance(data, dict):
        for key in _ITEM_KEYS:
            if isinstance(data.get(key), list):
                return [x for x in data[key] if isinstance(x, dict)]
    return None


def load_permits() -> tuple[list[dict], dict[str, bool]]:
    """(항목들, 파일별 읽기 성공 여부). 없는 파일은 결과에 넣지 않는다."""
    items: list[dict] = []
    readable: dict[str, bool] = {}
    for name in paths.PERMIT_FILES:
        path = paths.file_path(name)
        if not path.is_file():
            continue
        found = _items_of(load_json_any(path))
        readable[name] = found is not None
        items.extend({**x, "_file": name} for x in found or [])
    return items, readable


def _as_set(value: Any) -> set[str]:
    values = value if isinstance(value, (list, tuple)) else [value]
    return {str(v).strip() for v in values if str(v or "").strip()}


def _match_trigger(trigger: Any, lists: set[str], categories: set[str]) -> dict | None:
    if not isinstance(trigger, dict):
        return None
    hit_lists = sorted((_as_set(trigger.get("list_id")) | _as_set(trigger.get("list_ids"))) & lists)
    hit_cats = sorted({base_category(c) for c in _as_set(trigger.get("ncis_category"))} & categories)
    if not hit_lists and not hit_cats:
        return None
    matched: dict[str, Any] = {}
    if hit_lists:
        matched["list_id"] = hit_lists
    if hit_cats:
        matched["ncis_category"] = hit_cats
    if trigger.get("condition"):
        matched["condition"] = trigger["condition"]
    return matched


def evaluate(items: list[dict], *, lists: set[str], categories: set[str]) -> list[dict]:
    """등재 목록(또는 NCIS 분류)에 걸리는 인허가·신고 항목. 충족한 trigger 를 matched_by 로 붙인다."""
    out: list[dict] = []
    for item in items or []:
        triggers = item.get("trigger")
        triggers = triggers if isinstance(triggers, list) else [triggers]
        matched = [m for m in (_match_trigger(t, lists, categories) for t in triggers) if m]
        if not matched:
            continue
        out.append({
            **{k: v for k, v in item.items() if k != "_file"},
            "file": item.get("_file", ""),
            "matched_by": matched,
            "citation": {
                "legal_basis": item.get("legal_basis", ""),
                "source_url": item.get("source_url", ""),
                "verified_text": item.get("verified_text", ""),
            },
        })
    return out
