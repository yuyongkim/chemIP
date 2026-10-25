"""cas + 방향(수입/수출) + 상대국으로 화면 응답 한 덩어리를 만든다. 국내 법령별 규제·인허가는 방향과 무관하게 늘 들어간다. 계산은 각 모듈이 하고 여기서는 조립만 한다.

KOTRA 수입규제 조회는 외부 API 라 라우트가 함수(kotra_fetch)로 넘긴다. core 가 api 층을 import 하지 않게 하려는 것이다.
"""
from __future__ import annotations

import logging
from typing import Any, Callable

from backend.core.trade_controls import hs_codes, paths, permits
from backend.core.trade_controls.lists import (
    CAS_RE, group_by_law, intl_absences, intl_memberships, kr_law_memberships, list_memberships, load_controlled_lists,
    load_intl_lists, load_kr_law_lists, normalize_cas,
)
from backend.core.trade_controls.rules import DIRECTIONS, evaluate, load_kr_rules
from backend.core.trade_controls.substance import intl_listings, ncis_record, regulation_codes

logger = logging.getLogger(__name__)

HOME = "KR"
INTL = "INTL"
# 상대국이 블록 회원이면 블록 목록도 함께 본다(네덜란드 -> EU).
PARENT_BLOCS: dict[str, tuple[str, ...]] = {"NL": ("EU",)}

KotraFetch = Callable[[str, str], dict]


def _direction_ok(list_directions: list, direction: str) -> bool:
    ds = {str(d).strip().lower() for d in list_directions or []}
    return not ds or direction in ds or "both" in ds


# 한국 기준 방향 -> 상대국 목록에서 볼 방향. 한국이 수출하면 상대국에는 수입, 한국이 수입하면 상대국에서 수출이다.
COUNTERPART_DIRECTION = {"export": "import", "import": "export"}


def _jurisdictions(country: str) -> tuple[str, ...]:
    return (country, *PARENT_BLOCS.get(country, ())) if country else ()


def _intl_lists(cas: str, lists: list[dict], direction: str, country: str) -> list[dict]:
    """상대국 법령 목록 등재. country 가 없으면 모든 나라. 상대국을 고르면 absence_note 목록의 미등재도 알린다."""
    wanted = _jurisdictions(country)
    side = COUNTERPART_DIRECTION[direction]
    scoped = [d for d in lists if (not wanted or d.get("jurisdiction") in wanted) and _direction_ok(d.get("directions"), side)]
    found = intl_memberships(cas, scoped)
    if not country:
        return found
    return found + intl_absences(scoped, {m.get("list_id") for m in found})


def _destination_listings(intl: dict, country: str) -> list[dict]:
    jur = intl.get("jurisdictions") or {}
    out: list[dict] = []
    for code in (country, *PARENT_BLOCS.get(country, ()), INTL):
        out.extend({**item, "country": code} for item in jur.get(code, []))
    return out


def _kotra(kotra_fetch: KotraFetch | None, country: str, terms: list[str]) -> dict:
    if kotra_fetch is None:
        return {"available": False, "items": [], "query_used": ""}
    first_error = ""
    for term in [t for t in terms if t]:
        try:
            result = kotra_fetch(country, term) or {}
        except Exception as exc:  # 외부 API 오류가 화면 전체를 막지 않게 한다
            logger.warning("trade_controls: KOTRA 조회 실패: %s", exc)
            result = {"status": "error", "message": str(exc)}
        if result.get("status") == "success" and result.get("data"):
            return {"available": True, "items": list(result["data"]), "query_used": term}
        if result.get("status") != "success" and not first_error:
            first_error = str(result.get("message") or "error")
    payload: dict[str, Any] = {"available": not first_error, "items": [], "query_used": terms[0] if terms else ""}
    if first_error:
        payload["error"] = first_error
    return payload


def _sources_status(kr_rules: dict | None, lists: list[dict], kr_law_lists: list[dict], permit_readable: dict[str, bool],
                    intl_lists: list[dict]) -> dict[str, str]:
    status = paths.sources_status()
    # 파일은 있는데 읽지 못하면 invalid 로 알린다
    if status.get(paths.KR_RULES_FILE) == "present" and kr_rules is None:
        status[paths.KR_RULES_FILE] = "invalid"
    loaded = {data.get("_file") for data in lists}
    for name in paths.LIST_FILES:
        if status.get(name) == "present" and name not in loaded:
            status[name] = "invalid"
    for name, ok in permit_readable.items():
        if not ok:
            status[name] = "invalid"
    # kr_lists/ · intl_lists/ 안에서 읽지 못한 파일만 따로 적는다
    for folder, files, loaded_lists in ((paths.KR_LISTS_DIR, paths.kr_list_files(), kr_law_lists),
                                        (paths.INTL_LISTS_DIR, paths.intl_list_files(), intl_lists)):
        loaded = {data.get("_file") for data in loaded_lists}
        for path in files:
            key = f"{folder}/{path.name}"
            if key not in loaded:
                status[key] = "invalid"
    return status


def build_trade_controls(cas: str, direction: str = "import", country: str = "", *, kotra_fetch: KotraFetch | None = None) -> dict:
    """수출입 규제 응답. 자료 파일이 없으면 해당 칸만 비고 sources_status 에 missing 으로 표시된다."""
    cas = normalize_cas(cas)
    direction = (direction or "import").strip().lower()
    country = (country or "").strip().upper()
    base: dict[str, Any] = {"cas": cas, "direction": direction, "country": country}
    if not CAS_RE.match(cas):
        return {**base, "error": "invalid_cas"}
    if direction not in DIRECTIONS:
        return {**base, "error": "invalid_direction"}

    ncis = ncis_record(cas)
    intl = intl_listings(cas)
    lists = load_controlled_lists()
    kr_rules = load_kr_rules()
    kr_law_lists = load_kr_law_lists()
    intl_lists = load_intl_lists()
    permit_items, permit_readable = permits.load_permits()

    controlled = list_memberships(cas, lists)
    kr_law = kr_law_memberships(cas, kr_law_lists)
    categories = {c["category"] for c in ncis.get("classifications", []) if c.get("category")}
    memberships = (
        regulation_codes(intl)
        | {m["list_id"] for m in controlled if m.get("list_id")}
        | {m["list_id"] for m in kr_law if m.get("list_id")}
    )

    rules = (kr_rules or {}).get("rules") or []
    unverified = (kr_rules or {}).get("unverified") or []
    hs = hs_codes.lookup(cas)

    destination: dict[str, Any] | None = None
    if country and country != HOME:
        destination = {
            "country": country,
            # 수출이면 상대국이 수입하며 보는 목록, 수입이면 원산지 등재 현황(참고)
            "role": "destination_import" if direction == "export" else "origin",
            "listings": _destination_listings(intl, country),
            "kotra": None,
            # 상대국 법령 목록(intl_lists/): 수출이면 그 나라 수입 시, 수입이면 그 나라 수출 시 적용되는 목록
            "intl_lists": _intl_lists(cas, intl_lists, direction, country),
        }
        if direction == "export":
            terms = [ncis.get("name_ko", ""), *(h.get("hs6", "") for h in hs[:1])]
            destination["kotra"] = _kotra(kotra_fetch, country, terms)

    return {
        **base,
        "substance": {
            "name_ko": ncis.get("name_ko", ""),
            "name_en": ncis.get("name_en", ""),
            "ncis_categories": sorted(categories),
            "list_codes": sorted(memberships),
        },
        # 방향과 무관한 국내 규제: 법령별 등재 목록, 인허가·신고
        "kr_law_lists": group_by_law(kr_law),
        "kr_permits": permits.evaluate(permit_items, lists=memberships, categories=categories),
        "hs": hs,
        "hs_meta": hs_codes.meta() if hs else {},
        "hsk10_candidates": hs_codes.hsk10_candidates(cas) if hs else [],
        "kr_obligations": evaluate(rules, categories=categories, lists=memberships, direction=direction),
        "kr_unverified": evaluate(unverified, categories=categories, lists=memberships, direction=direction),
        "controlled_lists": [m for m in controlled if _direction_ok(m.get("directions"), direction)],
        # 방향과 무관한 통제 목록 등재 요약(요약 카드가 "수출 통제 해당 여부"를 수입 화면에서도 보이게)
        "controlled_lists_any": [
            {"list_id": m.get("list_id"), "title": m.get("title"), "directions": m.get("directions") or []} for m in controlled
        ],
        "destination": destination,
        # 상대국을 고르지 않았을 때 보는 전체 상대국 법령 목록 등재(나라 무관, 방향만 맞춤)
        "intl_lists": [] if destination else _intl_lists(cas, intl_lists, direction, ""),
        "sources_status": _sources_status(kr_rules, lists, kr_law_lists, permit_readable, intl_lists),
    }
