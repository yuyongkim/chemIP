"""CAS 로 Chem_Eng 사고 사례 DB(incidents.db)를 읽어, 사고 난 설비를 EPC 설계 검증 분야에 잇는다.

원천: CSB·EPA RMP(공공저작물), eMARS(CC BY 4.0, 출처 표기 필수), KOSHA·NICS(data.go.kr 제한 없음).
라이선스는 사례마다 그대로 돌려준다. 읽기 전용.
"""
from __future__ import annotations

import re
import sqlite3
from collections import Counter
from typing import Any

from backend.integrations.equipment_disciplines import DISCIPLINES, discipline_of, experience_key_of, split_equipment
from backend.integrations.sources import CHEMENG_INCIDENTS_DB, EPC_PUBLIC_URL

NARRATIVE_SOURCES = ("csb", "emars", "kosha", "nics")  # RMP 는 정형 칸만 있고 서술이 없다
ATTRIBUTION = {"emars": "Source: eMARS, European Commission JRC / EEA"}
SUMMARY_CHARS = 420
_LOST_MIDDOT = re.compile(r"(?<=[가-힣])\?(?=[가-힣])")  # NICS 원본에서 가운뎃점(·)이 '?' 로 깨져 있다


def _clean(text: str | None) -> str:
    return _LOST_MIDDOT.sub("·", " ".join((text or "").split()))


def _connect() -> sqlite3.Connection | None:
    if not CHEMENG_INCIDENTS_DB.exists():
        return None
    return sqlite3.connect(f"file:{CHEMENG_INCIDENTS_DB.as_posix()}?mode=ro", uri=True)


def _incident_rows(conn: sqlite3.Connection, cas: str) -> list[sqlite3.Row]:
    conn.row_factory = sqlite3.Row
    return conn.execute(
        "SELECT DISTINCT i.* FROM incident i "
        "JOIN incident_chemical ic ON ic.incident_id = i.id JOIN chemical ch ON ch.id = ic.chemical_id "
        "WHERE ch.cas = ?",
        (cas,),
    ).fetchall()


def _discipline_summary(rows: list[sqlite3.Row]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    tokens = Counter(t for r in rows for t in split_equipment(r["equipment"]))
    equipment = [{"name": t, "count": n, "discipline": discipline_of(t)} for t, n in tokens.most_common(15)]
    per_disc: dict[str, dict[str, Any]] = {}
    for r in rows:  # 한 사고가 같은 분야 설비를 여러 개 적어도 사고 수는 한 번만 센다
        for d in {discipline_of(t) for t in split_equipment(r["equipment"])} - {None}:
            per_disc.setdefault(d, {"incidents": 0, "tokens": Counter(), "experience": set()})["incidents"] += 1
        for t in split_equipment(r["equipment"]):
            d = discipline_of(t)
            if d:
                per_disc[d]["tokens"][t] += 1
                if experience_key_of(t):
                    per_disc[d]["experience"].add(experience_key_of(t))
    disciplines = [
        {"key": d, "label": DISCIPLINES[d][0], "standards": DISCIPLINES[d][1], "incidents": v["incidents"],
         "equipment": [t for t, _ in v["tokens"].most_common(4)], "experience_keys": sorted(v["experience"]),
         "epc_url": f"{EPC_PUBLIC_URL}/{d}"}
        for d, v in sorted(per_disc.items(), key=lambda kv: -kv[1]["incidents"])
    ]
    return equipment, disciplines


def _cases(conn: sqlite3.Connection, rows: list[sqlite3.Row], limit: int) -> list[dict[str, Any]]:
    # 출처마다 최신순으로 줄 세운 뒤 번갈아 뽑는다. 한 출처(대개 NICS)가 목록을 독차지하지 않게 한다.
    queues = {s: sorted((r for r in rows if r["source"] == s and (r["summary"] or "").strip()),
                        key=lambda r: r["date"] or "", reverse=True) for s in NARRATIVE_SOURCES}
    picked: list[sqlite3.Row] = []
    while len(picked) < limit and any(queues.values()):
        for s in NARRATIVE_SOURCES:
            if queues[s] and len(picked) < limit:
                picked.append(queues[s].pop(0))
    out = []
    for r in picked:
        causes = [c for (c,) in conn.execute(
            "SELECT text FROM cause WHERE incident_id = ? AND text <> '' "
            "ORDER BY (category = 'cause statement') DESC, id LIMIT 2", (r["id"],))]
        n_rec = conn.execute("SELECT COUNT(*) FROM recommendation WHERE incident_id = ?", (r["id"],)).fetchone()[0]
        summary = _clean(r["summary"])
        out.append({
            "id": r["id"], "source": r["source"], "title": _clean(r["title"]), "date": r["date"] or "",
            "country": r["country"] or "", "accident_type": r["accident_type"] or "",
            "equipment": [{"name": t, "discipline": discipline_of(t)} for t in split_equipment(r["equipment"])],
            "summary": summary[:SUMMARY_CHARS] + ("…" if len(summary) > SUMMARY_CHARS else ""),
            "fatalities": r["fatalities"], "injuries": r["injuries"],
            "causes": [_clean(c)[:240] for c in causes], "recommendations": n_rec,
            "url": r["url"] or r["report_url"] or "", "license": r["license"] or "",
            "attribution": ATTRIBUTION.get(r["source"], ""),
        })
    return out


def get_incidents_by_cas(cas: str, limit: int = 8) -> dict[str, Any]:
    conn = _connect()
    if conn is None:
        return {"cas_no": cas, "available": False, "total": 0}
    try:
        rows = _incident_rows(conn, cas)
        equipment, disciplines = _discipline_summary(rows)
        return {
            "cas_no": cas, "available": True, "total": len(rows),
            "by_source": dict(Counter(r["source"] for r in rows).most_common()),
            "fatalities": sum(r["fatalities"] or 0 for r in rows),
            "injuries": sum(r["injuries"] or 0 for r in rows),
            "equipment": equipment, "disciplines": disciplines,
            "cases": _cases(conn, rows, limit),
        }
    finally:
        conn.close()
