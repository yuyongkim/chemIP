"""국가별 규제 화면에 함께 보일 상대국 법령 목록(trade_controls intl_lists/) 등재 — 이 CAS 이름으로 오른 줄만.

수출입 탭은 같은 자료를 방향(수입/수출)별로 거르지만, 국가별 규제 화면은 방향 없이 모든 목록을 보인다.
화면 쪽은 정적 파일(p/<cas>.json 의 intl_lists + g/rulebook.json 머리)로 같은 모양을 만든다
(frontend/public/chemip/intl_merge.jsx intlNamedItems). 물질군(family) 등재는 넣지 않는다.
"""
from __future__ import annotations

from typing import Any

from backend.core.trade_controls.lists import intl_memberships

FIELDS = ("list_id", "jurisdiction", "title", "law")
# Structured entry fields some lists carry (EU_REACH_REGISTERED: ECHA CHEM values), passed through so the screen can lay
# them out (frontend reach_format.jsx). Same tuple in frontend/public/chemip/intl_merge.jsx INTL_ENTRY_FACT_FIELDS.
ENTRY_FACT_FIELDS = ("ec", "echa_id", "tonnage_band", "active_registrations", "registration_types", "nons",
                     "first_registered", "last_updated", "url")


def named_lists(cas: str) -> list[dict[str, Any]]:
    """CAS → [{list_id, jurisdiction, title, law, entries:[{name, detail, +ENTRY_FACT_FIELDS 있으면}]}] (등재 항목이 있는 목록만)."""
    out = []
    for m in intl_memberships(cas):
        entries = [{"name": e.get("name") or "", "detail": e.get("detail") or "",
                    **{f: e[f] for f in ENTRY_FACT_FIELDS if f in e}} for e in m.get("entries") or []]
        if entries:
            out.append({**{f: m.get(f) or "" for f in FIELDS}, "entries": entries})
    return out
