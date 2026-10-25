"""물질 목록 JSON 을 읽고 CAS 로 등재 여부를 찾는다. 두 종류를 같은 방식으로 다룬다.

1) 통제 목록(paths.LIST_FILES: CWC 표·호주그룹·마약류 원료물질)
  {"list_id","title","jurisdiction","directions":[...],"authority","kr_obligation","legal_basis",
   "source_url","source_version","retrieved","entries":[{"cas","name","category","detail"}],"family_entries":[...]}
2) 국내 법령별 목록(kr_lists/*.json 전부, 파일별 코드 없음)
  {"list_id","law","title","jurisdiction":"KR","legal_basis","source_url","amended_on","retrieved",
   "obligations":[...],"entries":[{"cas","name_ko","name_en","detail","match_method","match_note"?}],"family_entries":[...]}
   (match_note = 수집기의 CAS 연결 메모; 화면에 보이지 않는다)
3) 상대국 법령별 목록(intl_lists/*.json 전부, 파일별 코드 없음)
  {"list_id","jurisdiction":"EU|US|CN|JP..","law","title","directions":["import"|"export"],"obligation_for_kr_exporter",
   "legal_basis","source_url","source_version","retrieved","license","absence_note"?,"entries":[{"cas","name","detail"}],
   "family_entries":[...]}
  directions 는 그 나라 기준이다: import = 물품이 그 나라로 들어갈 때, export = 그 나라에서 나갈 때 적용.
  absence_note 가 있는 목록(예: 미국 TSCA Inventory)은 "등재되지 않음"도 의미가 있어 따로 알린다.
파일을 고치면 mtime 이 바뀌어 캐시가 저절로 새로 읽힌다. 서버 재시작은 필요 없다.
"""
from __future__ import annotations

import json
import logging
import re
from functools import lru_cache
from pathlib import Path
from typing import Any, Iterable

from backend.core.trade_controls import paths

logger = logging.getLogger(__name__)

CAS_RE = re.compile(r"^\d{2,7}-\d{2}-\d$")

# 목록 머리에서 화면에 그대로 넘길 필드
CONTROLLED_META_FIELDS = (
    "list_id", "title", "jurisdiction", "directions", "authority", "kr_obligation",
    "legal_basis", "source_url", "source_version", "retrieved",
)
INTL_META_FIELDS = (
    "list_id", "jurisdiction", "law", "title", "directions", "obligation_for_kr_exporter", "legal_basis",
    "source_url", "source_version", "retrieved", "license",
)
KR_LAW_META_FIELDS = (
    "list_id", "law", "title", "jurisdiction", "legal_basis", "source_url", "amended_on", "retrieved", "obligations",
)


def normalize_cas(value: Any) -> str:
    return re.sub(r"\s+", "", str(value or "")).strip()


@lru_cache(maxsize=128)
def _read_json(path_str: str, mtime_ns: int) -> Any:
    # mtime_ns 는 캐시 키로만 쓴다. 파일이 바뀌면 키가 달라져 다시 읽힌다.
    with open(path_str, encoding="utf-8") as fh:
        return json.load(fh)


def load_json_any(path: Path) -> Any:
    """JSON 파일을 읽는다(dict·list 모두). 없거나 깨졌으면 None."""
    try:
        mtime_ns = path.stat().st_mtime_ns
    except OSError:
        return None
    try:
        return _read_json(str(path), mtime_ns)
    except (OSError, ValueError) as exc:
        logger.warning("trade_controls: %s 를 읽지 못했습니다: %s", path.name, exc)
        return None


def load_json(path: Path) -> dict | None:
    """dict 형식 JSON 만 받는다."""
    data = load_json_any(path)
    return data if isinstance(data, dict) else None


def _load_files(files: Iterable[Path], prefix: str = "") -> list[dict]:
    loaded: list[dict] = []
    for path in files:
        data = load_json(path)
        if data:
            loaded.append({**data, "_file": f"{prefix}{path.name}"})
    return loaded


def load_controlled_lists() -> list[dict]:
    """있는 통제 목록 파일만 읽어 돌려준다(파일명 순서 유지)."""
    return _load_files(paths.file_path(name) for name in paths.LIST_FILES)


def load_kr_law_lists() -> list[dict]:
    """kr_lists/ 의 모든 json. 새 법령 파일은 폴더에 넣기만 하면 된다."""
    return _load_files(paths.kr_list_files(), prefix=f"{paths.KR_LISTS_DIR}/")


def load_intl_lists() -> list[dict]:
    """intl_lists/ 의 모든 json. 새 목록은 폴더에 넣기만 하면 된다. 큰 목록(수만 건)을 위해 CAS 색인을 붙인다."""
    loaded: list[dict] = []
    for path in paths.intl_list_files():
        data = load_json(path)
        if data:
            _attach_index(data)  # 캐시된 원본에 한 번만 만든다. 파일이 바뀌면 새 원본이 읽혀 다시 만든다.
            loaded.append({**data, "_file": f"{paths.INTL_LISTS_DIR}/{path.name}"})
    return loaded


def _attach_index(data: dict) -> None:
    if "_by_cas" in data:
        return
    index: dict[str, list[dict]] = {}
    for e in data.get("entries") or []:
        if isinstance(e, dict):
            index.setdefault(normalize_cas(e.get("cas")), []).append(e)
    data["_by_cas"] = index


def _family_matches(entry: dict, cas: str) -> bool:
    # 계열 항목은 CAS 가 없을 수 있다. CAS 나 구성 CAS 목록이 있을 때만 맞춘다.
    if normalize_cas(entry.get("cas")) == cas:
        return True
    members = entry.get("cas_list") or entry.get("members") or []
    return isinstance(members, list) and cas in {normalize_cas(m.get("cas") if isinstance(m, dict) else m) for m in members}


def list_memberships(cas: str, lists: list[dict] | None = None, meta_fields: tuple[str, ...] = CONTROLLED_META_FIELDS) -> list[dict]:
    """CAS 가 등재된 목록과 해당 항목들. lists 를 안 주면 통제 목록을 읽는다."""
    cas = normalize_cas(cas)
    found: list[dict] = []
    for data in lists if lists is not None else load_controlled_lists():
        index = data.get("_by_cas")
        if index is not None:
            entries = list(index.get(cas, []))
        else:
            entries = [e for e in data.get("entries") or [] if isinstance(e, dict) and normalize_cas(e.get("cas")) == cas]
        families = [e for e in data.get("family_entries") or [] if isinstance(e, dict) and _family_matches(e, cas)]
        if not entries and not families:
            continue
        item = {field: data.get(field) for field in meta_fields}
        for list_field in ("directions", "obligations"):
            if list_field in item:
                item[list_field] = item[list_field] or []
        item["entries"] = entries
        item["family_entries"] = families
        item["file"] = data.get("_file", "")
        found.append(item)
    return found


def kr_law_memberships(cas: str, lists: list[dict] | None = None) -> list[dict]:
    return list_memberships(cas, lists if lists is not None else load_kr_law_lists(), KR_LAW_META_FIELDS)


def intl_memberships(cas: str, lists: list[dict] | None = None) -> list[dict]:
    return list_memberships(cas, lists if lists is not None else load_intl_lists(), INTL_META_FIELDS)


def intl_absences(lists: list[dict], found_ids: set[str]) -> list[dict]:
    """absence_note 가 있는 목록 가운데 이 CAS 가 없는 것(예: TSCA Inventory 미등재 → 신규화학물질 가능)."""
    out = []
    for data in lists:
        if data.get("absence_note") and data.get("list_id") not in found_ids:
            item = {field: data.get(field) for field in INTL_META_FIELDS}
            item.update({"directions": item.get("directions") or [], "absent": True, "absence_note": data["absence_note"],
                         "entries": [], "family_entries": [], "file": data.get("_file", "")})
            out.append(item)
    return out


def group_by_law(memberships: list[dict]) -> list[dict]:
    """법령 이름으로 묶는다(등장 순서 유지). law 가 없으면 title 로."""
    groups: list[dict] = []
    at: dict[str, int] = {}
    for m in memberships:
        law = str(m.get("law") or m.get("title") or m.get("list_id") or "").strip()
        if law not in at:
            at[law] = len(groups)
            groups.append({"law": law, "lists": []})
        groups[at[law]]["lists"].append(m)
    return groups
