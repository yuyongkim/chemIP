"""국가별 규제 목록(intl_regulatory) 한 CAS 의 등재 줄을 목록마다 하나로 합친다(순수 함수, DB 없음).

EPA "List of Lists" 같은 원자료는 같은 물질을 이름 표기마다 한 줄씩 싣는다(Ethene / Ethylene, Propene / 1-Propene /
Propylene). 그대로 세면 한 목록이 두세 번 세어진다. 여기서는
  - 같은 목록(regulation)의 줄은 한 항목이 되고, 다른 이름은 aka(다른 이름)로 남긴다.
  - "listed under another name on this list"(EPCRA 313) 줄은 별칭 줄이다. 실제 내용 줄이 있으면 이름만 aka 로 보탠다.
  - 내용(detail)이 다른 줄(암모니아 무수 / 20 % 이상 용액처럼 형태별 기준)은 forms 로 나눠 둔다. 목록 수는 하나로 센다.
대표 이름은 그 CAS 의 모든 줄에서 가장 많이 쓰인 이름(대소문자 무시, 같으면 먼저 나온 것)이다.
화면 쪽 같은 규칙: frontend/public/chemip/intl_merge.jsx(옛 정적 파일도 화면에서 합친다).
"""
from __future__ import annotations

import re
from collections import Counter
from typing import Any, Iterable

ALIAS_DETAIL_RE = re.compile(r"listed under another name", re.I)


def _key(name: str) -> str:
    return re.sub(r"\s+", " ", (name or "").strip()).casefold()


def name_votes(rows: Iterable[tuple[str, str, str, str]]) -> Counter:
    """(regulation, detail, source, name) 줄들 → 이름(정규화) 쓰인 횟수."""
    return Counter(_key(r[3]) for r in rows if (r[3] or "").strip())


def _pick(names: list[str], votes: Counter) -> list[str]:
    """이름들(중복 없이) → 대표 이름이 맨 앞. 표가 같으면 원래 순서."""
    order = {n: i for i, n in enumerate(names)}
    return sorted(names, key=lambda n: (-votes.get(_key(n), 0), order[n]))


def _unique(names: Iterable[str]) -> list[str]:
    seen, out = set(), []
    for n in names:
        n = (n or "").strip()
        if n and _key(n) not in seen:
            seen.add(_key(n))
            out.append(n)
    return out


def merge_regulation(rows: list[tuple[str, str, str, str]], votes: Counter) -> dict[str, Any]:
    """한 목록의 줄들(같은 regulation) → 항목 하나 {regulation, detail, source, name, aka?, forms?}."""
    real = [r for r in rows if not ALIAS_DETAIL_RE.search(r[1] or "")]
    alias = [r for r in rows if ALIAS_DETAIL_RE.search(r[1] or "")]
    body = real or alias  # 별칭 줄뿐이면 그 줄이 내용이다
    by_detail: dict[str, list[str]] = {}
    for r in body:
        by_detail.setdefault((r[1] or "").strip(), []).append(r[3] or "")
    forms = []
    for detail, names in by_detail.items():
        ordered = _pick(_unique(names), votes)
        forms.append({"detail": detail, "names": ordered})
    extra = _unique(r[3] for r in alias) if real else []
    first = forms[0]
    names = _pick(_unique([*first["names"], *(extra if len(forms) == 1 else [])]), votes)
    item: dict[str, Any] = {"regulation": rows[0][0], "detail": first["detail"], "source": rows[0][2] or "",
                            "name": names[0] if names else ""}
    if len(forms) == 1:
        if len(names) > 1:
            item["aka"] = names[1:]
        return item
    item["forms"] = [{"name": f["names"][0] if f["names"] else "", "detail": f["detail"],
                      **({"aka": f["names"][1:]} if len(f["names"]) > 1 else {})} for f in forms]
    if extra:
        known = {_key(n) for f in forms for n in f["names"]}
        more = [n for n in extra if _key(n) not in known]
        if more:
            item["aka"] = more
    return item


def merge_rows(rows: list[tuple[str, str, str, str]]) -> list[dict[str, Any]]:
    """한 CAS 의 (regulation, detail, source, name) 줄 → 목록마다 한 항목(원래 regulation 순서)."""
    votes = name_votes(rows)
    by_reg: dict[str, list[tuple[str, str, str, str]]] = {}
    for r in rows:
        by_reg.setdefault(r[0], []).append(r)
    return [merge_regulation(group, votes) for group in by_reg.values()]


def item_details(item: dict[str, Any]) -> list[str]:
    """항목의 기준 글 모두(형태별이면 형태마다) — 수량 읽기용."""
    return [f["detail"] for f in item["forms"]] if item.get("forms") else [item.get("detail", "")]
