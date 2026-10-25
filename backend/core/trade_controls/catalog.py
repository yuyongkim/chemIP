"""자료 규모 요약(처음 화면의 "국내 법령 N개 목록" 같은 숫자). 화면에 숫자를 박지 않고 여기서 센다."""
from __future__ import annotations

from typing import Any

from backend.core.trade_controls import lists, permits


def _is_real_list(data: dict) -> bool:
    # _index*.json(요약)과 *_unverified.json(미확정 묶음)은 법령 목록이 아니다.
    list_id = str(data.get("list_id") or "")
    return bool(list_id) and "unverified" not in list_id.lower() and isinstance(data.get("entries"), list)


def catalog() -> dict[str, Any]:
    kr = [d for d in lists.load_kr_law_lists() if _is_real_list(d)]
    intl = [d for d in lists.load_intl_lists() if _is_real_list(d)]
    items, _ = permits.load_permits()
    return {
        "kr_lists": len(kr),
        "kr_laws": len({d.get("law") for d in kr if d.get("law")}),
        "intl_lists": len(intl),
        "intl_jurisdictions": sorted({d.get("jurisdiction") for d in intl if d.get("jurisdiction")}),
        "controlled_lists": len(lists.load_controlled_lists()),
        "permits": len(items),
    }
