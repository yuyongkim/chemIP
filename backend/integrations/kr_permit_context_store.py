"""CAS 로 한국 통합환경허가 실제 사례(배출기준 분포·업종·처리기간·CleanSYS 배출량)를 찾는다.

DB 는 scripts/build_kr_permit_context.py 가 Environment 프로젝트 가공본에서 만든 data/kr_permit_context.db 이다. 읽기 전용.
물질군(황산화물·크롬 및 그 화합물 등)은 CAS 가 없으므로 cas_links 의 관계(family_parent·related)로 함께 돌려준다.
"""
from __future__ import annotations

import json
import sqlite3
from typing import Any

from backend.integrations.sources import IEPS_POST_URL, KR_PERMIT_CONTEXT_DB

RELATION_ORDER = {"direct": 0, "family_parent": 1, "related": 2}
DURATION_MIN_N = 8          # 업종별 처리기간은 n 이 이보다 작으면 reliable=False 로 표시
IEPS_BOARD_URL = "https://ieps.nier.go.kr/web/board/7/?pMENUMST_ID=176"
META_KEYS = ("retrieved", "source_ieps", "source_cleansys", "duration_note", "limits_note", "built_at")


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(f"file:{KR_PERMIT_CONTEXT_DB.as_posix()}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    return conn


def _stat(r: sqlite3.Row) -> dict[str, Any]:
    return {k: r[k] for k in ("unit", "o2_ref", "n_rows", "n_sites", "n_outlets", "min", "p25", "median", "p75", "max")}


def _entry(conn: sqlite3.Connection, entity: str, relation: str, group: sqlite3.Row | None) -> dict[str, Any] | None:
    s = conn.execute("SELECT * FROM entity_summary WHERE entity = ?", (entity,)).fetchone()
    if not s:
        return None
    dists = [_stat(r) for r in conn.execute("SELECT * FROM limit_stats WHERE entity = ? ORDER BY n_rows DESC", (entity,))]
    primary = next((d for d in dists if d["unit"] == s["primary_unit"] and d["o2_ref"] == s["primary_o2"]), dists[0] if dists else None)
    return {
        "entity": entity, "kind": s["kind"], "relation": relation, "label": s["label"],
        "expressed_as": group["expressed_as"] if group else "", "basis": group["basis"] if group else "",
        "n_sites": s["n_sites"], "n_posts": s["n_posts"], "n_outlets": s["n_outlets"], "n_rows": s["n_rows"],
        "first_year": s["first_year"], "latest_year": s["latest_year"], "names_seen": json.loads(s["names_seen"] or "[]"),
        "primary": primary, "distributions": dists,
        "industries": [dict(r) for r in conn.execute(
            "SELECT industry, n_sites, n_rows, median FROM entity_industry WHERE entity = ? ORDER BY n_sites DESC, industry", (entity,))],
        "samples": [dict(r) for r in conn.execute(
            "SELECT rank, post_id, decision_no, site_name, industry, post_type, permit_date, post_date, url, limits FROM entity_samples "
            "WHERE entity = ? ORDER BY rank", (entity,))],
    }


def _emissions(conn: sqlite3.Connection, entity: str, relation: str) -> dict[str, Any] | None:
    rows = conn.execute("SELECT year, label, n_sites, total_kg FROM emissions WHERE entity = ? ORDER BY year", (entity,)).fetchall()
    if not rows:
        return None
    return {"entity": entity, "relation": relation, "label": rows[0]["label"], "unit": "kg/yr",
            "years": [{"year": r["year"], "n_sites": r["n_sites"], "total_kg": r["total_kg"]} for r in rows]}


def _durations(conn: sqlite3.Connection) -> dict[str, list[dict[str, Any]]]:
    rows = [dict(r) for r in conn.execute("SELECT * FROM durations ORDER BY post_type DESC, n DESC")]

    def pick(grouping: str) -> list[dict[str, Any]]:
        return [{k: v for k, v in r.items() if k != "grouping" and v != ""} for r in rows if r["grouping"] == grouping]

    by_industry = pick("post_type+industry")
    for r in by_industry:
        r["reliable"] = r["n"] >= DURATION_MIN_N
    return {"overall": pick("post_type"), "by_industry": by_industry, "by_pre_consult": pick("post_type+pre_consult"),
            "by_year": pick("post_type+permit_year")}


def _attribution(conn: sqlite3.Connection) -> dict[str, Any]:
    meta = {r["key"]: r["value"] for r in conn.execute("SELECT key, value FROM meta")}
    out = {k: meta.get(k, "") for k in META_KEYS}
    out.update({"ieps_board_url": IEPS_BOARD_URL, "ieps_post_url": IEPS_POST_URL, "cleansys_url": "https://www.cleansys.or.kr"})
    return out


def get_permit_context_by_cas(cas: str) -> dict[str, Any]:
    if not KR_PERMIT_CONTEXT_DB.exists():
        return {"cas_no": cas, "available": False, "entries": [], "emissions": []}
    conn = _connect()
    try:
        links = sorted(conn.execute("SELECT entity, relation FROM cas_links WHERE cas = ?", (cas,)).fetchall(),
                       key=lambda r: (RELATION_ORDER.get(r["relation"], 9), r["entity"]))
        entries, emissions = [], []
        for link in links:
            group = conn.execute("SELECT * FROM groups WHERE group_key = ?", (link["entity"].split(":", 1)[1],)).fetchone() \
                if link["entity"].startswith("group:") else None
            e = _entry(conn, link["entity"], link["relation"], group)
            if e:
                entries.append(e)
            em = _emissions(conn, link["entity"], link["relation"])
            if em:
                emissions.append(em)
        return {
            "cas_no": cas, "available": True, "entries": entries, "emissions": emissions,
            "durations": _durations(conn), "attribution": _attribution(conn),
        }
    finally:
        conn.close()
