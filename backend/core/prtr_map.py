"""PRTR facility map bodies: ``prtr/index.json`` (substances that have facility rows) and ``prtr/<CAS>.json``
(per-region and per-시군구 facility counts and reported amounts, plus the facility list).

Input: the local PRTR cache ``data/prtr/prtr_facilities.sqlite`` (tables ``materials``, ``facility_releases``), opened
read-only. Written to static files by scripts/static_export/prtr.py and served on the PC site by
backend/api/routes/prtr_map.py, so both give the same bytes. Format: scripts/static_export/CONTRACT.md "prtr/".

Amounts are the reported values in kg/year as they are in the source. Nothing here ranks facilities by risk.
"""
from __future__ import annotations

import re
import sqlite3
from pathlib import Path

from backend.core.prtr_regions import SIDO, parse_address, region_table

FORMAT = 1
CAS_RE = re.compile(r"^\d{2,7}-\d{2}-\d$")

# Attribution shown with every map (one place; the browser reads it from the file).
SOURCE = {
    "name_ko": "화학물질 배출·이동량 정보(PRTR)",
    "name_en": "Pollutant Release and Transfer Register (PRTR), Korea",
    "provider_ko": "기후에너지환경부 화학물질안전원",
    "provider_en": "National Institute of Chemical Safety, Ministry of Climate, Energy and Environment",
    "url": "https://www.data.go.kr/data/15024756/openapi.do",
    "license_ko": "공공데이터포털 이용허락범위: 제한 없음",
    "license_en": "Public Data Portal (data.go.kr): no restriction on use",
}

FACILITY_COLS = ["name", "iso", "sigungu", "address", "release_kg", "transfer_kg", "reported_total_kg"]
INDEX_COLS = ["cas", "name_ko", "name_en", "facilities", "reported_total_kg"]
_REGION_ORDER = {iso: i for i, (iso, *_rest) in enumerate(SIDO)}


def connect_ro(path: Path | str) -> sqlite3.Connection:
    conn = sqlite3.connect(f"file:{Path(path).as_posix()}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    return conn


def dashed_cas(cas_no: str) -> str:
    """'000108-88-3' → '108-88-3'; '' when it is not a CAS number (group entries such as 'NA-(주8)')."""
    s = (cas_no or "").strip()
    head, sep, rest = s.partition("-")
    out = (head.lstrip("0") or "0") + sep + rest if sep else s
    return out if CAS_RE.match(out) else ""


def _kg(v) -> float:
    return round(float(v or 0), 1)


def latest_year(conn: sqlite3.Connection) -> int:
    row = conn.execute("SELECT MAX(year) FROM facility_releases").fetchone()
    return int(row[0] or 0)


def _materials(conn: sqlite3.Connection, year: int) -> list[sqlite3.Row]:
    return conn.execute(
        """SELECT m.*, (SELECT COUNT(*) FROM facility_releases f WHERE f.year = m.year AND f.material_id = m.material_id) AS rows_n
           FROM materials m WHERE m.year = ?""",
        (year,),
    ).fetchall()


def facility_rows(conn: sqlite3.Connection, year: int, material_id: str) -> list[list]:
    """Facility list in FACILITY_COLS order, largest reported total first (same basis as the handlers panel)."""
    out = []
    for r in conn.execute(
        "SELECT * FROM facility_releases WHERE year = ? AND material_id = ? ORDER BY row_index", (year, material_id)
    ):
        iso, sigungu = parse_address(r["address"])
        release, transfer, landfill = _kg(r["total_release_kg"]), _kg(r["total_transfer_kg"]), _kg(r["self_landfill_kg"])
        out.append([r["company_name"], iso, sigungu, r["address"], release, transfer, round(release + transfer + landfill, 1)])
    out.sort(key=lambda f: (-f[6], -f[4], -f[5], f[0]))
    return out


def _add(acc: dict, f: list) -> None:
    acc["facilities"] += 1
    acc["release_kg"] += f[4]
    acc["transfer_kg"] += f[5]
    acc["reported_total_kg"] += f[6]


def _new(**keys) -> dict:
    return {**keys, "facilities": 0, "release_kg": 0.0, "transfer_kg": 0.0, "reported_total_kg": 0.0}


def _rounded(acc: dict) -> dict:
    return {k: (round(v, 1) if isinstance(v, float) else v) for k, v in acc.items()}


def aggregate(facilities: list[list]) -> dict:
    """Facility rows → {totals, regions, sigungu, unparsed}. Pure function."""
    totals = _new()
    regions: dict[str, dict] = {}
    sigungu: dict[tuple[str, str], dict] = {}
    unparsed = 0
    for f in facilities:
        _add(totals, f)
        iso, sgg = f[1], f[2]
        if not iso:
            unparsed += 1
            continue
        _add(regions.setdefault(iso, _new(iso=iso)), f)
        if sgg:
            _add(sigungu.setdefault((iso, sgg), _new(iso=iso, name=sgg)), f)
    region_list = sorted(regions.values(), key=lambda r: _REGION_ORDER.get(r["iso"], 99))
    sgg_list = sorted(sigungu.values(), key=lambda r: (-r["facilities"], -r["reported_total_kg"], r["iso"], r["name"]))
    return {
        "totals": _rounded(totals),
        "regions": [_rounded(r) for r in region_list],
        "sigungu": [_rounded(r) for r in sgg_list],
        "unparsed": unparsed,
    }


def substance_body(material: sqlite3.Row, facilities: list[list], year: int, exported_at: str) -> dict:
    return {
        "v": FORMAT,
        "cas": dashed_cas(material["cas_no"]),
        "name_ko": material["name_ko"],
        "name_en": material["name_en"] or "",
        "year": year,
        "exported_at": exported_at,
        "source": SOURCE,
        "reported_facilities": int(material["company_count"] or 0),
        **aggregate(facilities),
        "facility_cols": FACILITY_COLS,
        "facilities": facilities,
    }


def build_all(conn: sqlite3.Connection, exported_at: str, year: int | None = None) -> tuple[dict, dict[str, dict]]:
    """→ (index body, {CAS: substance body}) for every material with a CAS and at least one facility row."""
    year = year or latest_year(conn)
    bodies: dict[str, dict] = {}
    for m in _materials(conn, year):
        cas = dashed_cas(m["cas_no"])
        if not cas or not m["rows_n"]:
            continue
        body = substance_body(m, facility_rows(conn, year, m["material_id"]), year, exported_at)
        if cas in bodies:  # never seen in the 2024 data; keep the larger list if it ever happens
            if body["totals"]["facilities"] <= bodies[cas]["totals"]["facilities"]:
                continue
        bodies[cas] = body
    return index_body(bodies, year, exported_at), bodies


def index_body(bodies: dict[str, dict], year: int, exported_at: str) -> dict:
    rows = [[b["cas"], b["name_ko"], b["name_en"], b["totals"]["facilities"], b["totals"]["reported_total_kg"]] for b in bodies.values()]
    rows.sort(key=lambda r: (-r[3], -r[4], r[0]))
    return {
        "v": FORMAT,
        "year": year,
        "exported_at": exported_at,
        "source": SOURCE,
        "regions": region_table(),
        "cols": INDEX_COLS,
        "substances": rows,
    }


def build_one(conn: sqlite3.Connection, cas: str, exported_at: str, year: int | None = None) -> dict | None:
    """One substance body by dashed CAS (PC route), None when the CAS has no facility rows."""
    year = year or latest_year(conn)
    key = re.sub(r"\D", "", cas or "").lstrip("0")
    if not key:
        return None
    m = conn.execute(
        """SELECT m.*, 1 AS rows_n FROM materials m WHERE m.year = ? AND m.cas_key = ?
           AND EXISTS (SELECT 1 FROM facility_releases f WHERE f.year = m.year AND f.material_id = m.material_id)""",
        (year, key),
    ).fetchone()
    if m is None or not dashed_cas(m["cas_no"]):
        return None
    return substance_body(m, facility_rows(conn, year, m["material_id"]), year, exported_at)
