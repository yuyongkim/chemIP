"""CAS 로 텍사스 TCEQ 대기 배출사고 보고(Air Emission Event Reports, 공개 자료)를 찾는다.

색인은 scripts/build_tceq_event_index.py 가 Environment 프로젝트 가공본에서 만든 data/tceq_event_cas_index.db 이다. 읽기 전용.
배출점 종류(플레어·탱크·안전밸브·누출)는 오염물질이 나간 자리의 분포일 뿐 원인이 아니다(tceq_point_kinds.py).
신고서의 허가 칸(authorization)으로 허가 여부를 판단하지 않고, 시설별 확률도 내지 않는다.
"""
from __future__ import annotations

import sqlite3
from collections import Counter, defaultdict
from typing import Any

from backend.integrations import sources
from backend.integrations.equipment_disciplines import DISCIPLINES
from backend.integrations.tceq_point_kinds import POINT_KINDS, kind_discipline

CAUSE_CHARS = 220
POUNDS = "POUNDS"
TOP_N = 5
SOURCE = "TCEQ Air Emission Event Reports (public) · Environment project processing"
NOTES = [
    "운영자가 TCEQ 에 낸 배출사고 보고에 적힌 물질 이름을 CAS 로 확정한 줄만 셌습니다(물질군·이름이 애매한 줄은 뺐습니다).",
    "배출량 합계는 단위가 파운드(POUNDS)인 줄만 더한 신고값입니다. 다른 단위(% 불투명도·LBS/HR 등) 줄은 합계에 넣지 않았습니다.",
    "배출점 종류는 오염물질이 대기로 나간 자리의 분포이며, 사고 원인을 뜻하지 않습니다.",
    "신고서의 허가 관련 칸은 판단에 쓰지 않았습니다. 플레어 기준값 0 은 운영자가 신고서에 적는 관행이며 기준이 없다는 뜻이 아닙니다.",
    "보고 건수는 시설별 사고 가능성을 나타내지 않습니다.",
]


def _empty(cas: str, available: bool) -> dict[str, Any]:
    return {
        "cas_no": cas, "available": available, "total": 0, "years": [], "qty_total_lbs": 0.0, "units": {},
        "point_kinds": {}, "point_kind_labels": dict(POINT_KINDS), "disciplines": [], "counties": {},
        "top_facilities": [], "recent": [], "source": SOURCE, "info_url": sources.TCEQ_EVENTS_INFO_URL, "notes": NOTES,
    }


def _connect() -> sqlite3.Connection | None:
    db = sources.TCEQ_EVENT_CAS_INDEX_DB
    if not db.exists():
        return None
    conn = sqlite3.connect(f"file:{db.as_posix()}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    return conn


def _rows(conn: sqlite3.Connection, cas: str) -> tuple[list[sqlite3.Row], dict[str, sqlite3.Row]]:
    rows = conn.execute(
        "SELECT x.incident_number, x.point_idx, x.qty, x.unit, p.kind FROM event_cas x "
        "LEFT JOIN points p ON p.incident_number = x.incident_number AND p.point_idx = x.point_idx WHERE x.cas = ?",
        (cas,),
    ).fetchall()
    ids = sorted({r["incident_number"] for r in rows})
    events = {}
    for i in range(0, len(ids), 500):  # sqlite 변수 개수 한도 안에서 나눠 읽는다
        chunk = ids[i:i + 500]
        q = f"SELECT * FROM events WHERE incident_number IN ({','.join('?' * len(chunk))})"
        events.update({e["incident_number"]: e for e in conn.execute(q, chunk)})
    return rows, events


def _disciplines(points_by_kind: Counter) -> list[dict[str, Any]]:
    per: dict[str, dict[str, Any]] = {}
    for kind, n in points_by_kind.items():
        d = kind_discipline(kind)
        if d:
            per.setdefault(d, {"points": 0, "kinds": []})
            per[d]["points"] += n
            per[d]["kinds"].append(kind)
    return [
        {"key": d, "label": DISCIPLINES[d][0], "standards": DISCIPLINES[d][1], "points": v["points"],
         "kinds": v["kinds"], "epc_url": f"{sources.EPC_PUBLIC_URL}/{d}"}
        for d, v in sorted(per.items(), key=lambda kv: -kv[1]["points"])
    ]


def _short(text: str) -> str:
    text = " ".join((text or "").split())
    return text[:CAUSE_CHARS] + ("…" if len(text) > CAUSE_CHARS else "")


def _recent(events: dict[str, sqlite3.Row], by_event: dict[str, list[sqlite3.Row]], limit: int) -> list[dict[str, Any]]:
    order = sorted(events.values(), key=lambda e: (e["event_date"] or "", e["incident_number"]), reverse=True)
    out = []
    for e in order[:limit]:
        rs = by_event[e["incident_number"]]
        lbs = [r["qty"] for r in rs if r["unit"] == POUNDS and r["qty"] is not None]
        out.append({
            "incident_number": e["incident_number"], "date": e["event_date"] or "", "facility": e["facility"] or "",
            "county": e["county"] or "", "event_type": e["event_type"] or "", "duration": e["duration"] or "",
            "qty": round(sum(lbs), 4) if lbs else None, "unit": POUNDS if lbs else (rs[0]["unit"] or ""),
            "point_kinds": sorted({r["kind"] or "other" for r in rs}), "cause": _short(e["cause"]),
            "url": sources.TCEQ_EVENT_URL.format(incident_number=e["incident_number"]),
        })
    return out


def get_tceq_events_by_cas(cas: str, limit: int = 6) -> dict[str, Any]:
    conn = _connect()
    if conn is None:
        return _empty(cas, available=False)
    try:
        rows, events = _rows(conn, cas)
    finally:
        conn.close()
    if not events:
        return _empty(cas, available=True)

    by_event: dict[str, list[sqlite3.Row]] = defaultdict(list)
    for r in rows:
        by_event[r["incident_number"]].append(r)
    points = {(r["incident_number"], r["point_idx"]): r["kind"] or "other" for r in rows}  # 배출점 하나는 한 번만 센다
    points_by_kind = Counter(points.values())
    years = sorted(e["year"] for e in events.values() if e["year"])
    facilities = Counter((e["facility"], e["county"]) for e in events.values())
    return {
        **_empty(cas, available=True),
        "total": len(events),
        "years": [years[0], years[-1]] if years else [],
        "qty_total_lbs": round(sum(r["qty"] for r in rows if r["unit"] == POUNDS and r["qty"] is not None), 2),
        "units": dict(Counter(r["unit"] or "" for r in rows).most_common()),
        "point_kinds": dict(points_by_kind.most_common()),
        "disciplines": _disciplines(points_by_kind),
        "counties": dict(Counter(e["county"] for e in events.values() if e["county"]).most_common(TOP_N)),
        "top_facilities": [{"facility": f, "county": c, "events": n} for (f, c), n in facilities.most_common(TOP_N)],
        "recent": _recent(events, by_event, limit),
    }
