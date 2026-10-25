"""KOSHA MSDS OpenAPI route profiles (data only).

Each profile names a base URL and the operation names for the substance list
and the 16 MSDS sections. ``settings.KOSHA_MSDS_ROUTES`` picks the order.

* ``datagokr``        — 공공데이터포털 15157612 「한국산업안전보건공단_물질안전보건자료
                        조회 서비스」 (이용허락범위: 제한 없음). Licensed default.
* ``datagokr_legacy`` — the older data.go.kr service (msdschem). Section calls still
                        answer, but the list call is retired (NO_OPENAPI_SERVICE_ERROR).
* ``kosha_direct``    — msds.kosha.or.kr direct OpenAPI (HTTP 400 as of 2026-10-25).

Both legacy profiles are kept only as configurable fallbacks.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class KoshaRoute:
    name: str
    base_url: str
    list_op: str
    detail_op_template: str  # formatted with seq=<1..16>

    def list_url(self) -> str:
        return f"{self.base_url}/{self.list_op}"

    def detail_url(self, section_seq: int) -> str:
        return f"{self.base_url}/{self.detail_op_template.format(seq=section_seq)}"


KOSHA_ROUTES: dict[str, KoshaRoute] = {
    "datagokr": KoshaRoute(
        name="datagokr",
        base_url="https://apis.data.go.kr/B552468/msdschem1",
        list_op="getChemList001",
        detail_op_template="getChemDetail{seq:02d}1",
    ),
    "datagokr_legacy": KoshaRoute(
        name="datagokr_legacy",
        base_url="https://apis.data.go.kr/B552468/msdschem",
        list_op="chemlist",
        detail_op_template="getChemDetail{seq:02d}",
    ),
    "kosha_direct": KoshaRoute(
        name="kosha_direct",
        base_url="https://msds.kosha.or.kr/openapi/service/msdschem",
        list_op="chemlist",
        detail_op_template="getChemDetail{seq:02d}",
    ),
}

DEFAULT_ROUTE_ORDER = ("datagokr",)


def resolve_routes(names: list[str] | tuple[str, ...]) -> list[KoshaRoute]:
    """Map configured names to profiles, dropping unknown names and duplicates."""
    seen: set[str] = set()
    routes: list[KoshaRoute] = []
    for raw in names or ():
        key = str(raw).strip().lower()
        if key in KOSHA_ROUTES and key not in seen:
            seen.add(key)
            routes.append(KOSHA_ROUTES[key])
    if not routes:
        routes = [KOSHA_ROUTES[k] for k in DEFAULT_ROUTE_ORDER]
    return routes
