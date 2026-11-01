"""Environment 프로젝트의 텍사스 TCEQ 대기 배출사고 보고 가공본에서 CAS 로 찾을 수 있는 사고 색인을 만든다.

원본(읽기만 한다):
  track_11_events/incidents.csv            사고 4,730건(2016–2024): 사고번호·시설·카운티·시작/종료·지속시간·원인 서술
  p1p/cache/eer_points.csv                 사고별 배출점(point_idx, point_name, epn)
  p1p/cache/eer_point_contaminants.csv     배출점별 오염물질 이름·양·단위 (이름만 있고 CAS 는 없다)
이름 → CAS 는 scripts/tceq_event_mapping.py 의 resolve() 가 정한다. status == "cas" 인 줄만 색인에 넣고,
물질군(group)·애매(ambiguous)·미연결(unmapped) 은 개수만 보고한다(추측해서 잇지 않는다).
배출점 이름 → 종류는 backend/integrations/tceq_point_kinds.py 의 표.

결과: data/tceq_event_cas_index.db (events, points, event_cas, name_status, meta). 매번 새로 만든다.

    python -B scripts/build_tceq_event_index.py
"""
from __future__ import annotations

import csv
import sqlite3
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Callable

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parent))
from backend.integrations.sources import ENV_TCEQ_EVENTS_DIR, ENV_TCEQ_POINTS_DIR, TCEQ_EVENT_CAS_INDEX_DB  # noqa: E402
from backend.integrations.tceq_point_kinds import point_kind  # noqa: E402

csv.field_size_limit(10_000_000)
DATE_FORMATS = ("%m/%d/%Y %I:%M %p", "%m/%d/%Y %H:%M", "%m/%d/%Y")
STATUSES = ("cas", "group", "ambiguous", "unmapped")

SCHEMA = """
CREATE TABLE events (incident_number TEXT PRIMARY KEY, event_date TEXT, year INTEGER, event_start TEXT, event_end TEXT,
    duration TEXT, report_date TEXT, facility TEXT, owner TEXT, county TEXT, event_type TEXT, tceq_rn TEXT, cause TEXT);
CREATE TABLE points (incident_number TEXT NOT NULL, point_idx INTEGER NOT NULL, point_name TEXT, epn TEXT, kind TEXT,
    PRIMARY KEY (incident_number, point_idx));
CREATE TABLE event_cas (incident_number TEXT NOT NULL, point_idx INTEGER, cas TEXT NOT NULL, name_raw TEXT,
    qty REAL, unit TEXT, method TEXT, map_key TEXT);
CREATE TABLE name_status (name_raw TEXT PRIMARY KEY, map_key TEXT, status TEXT, cas TEXT, grp TEXT, method TEXT, n_rows INTEGER);
CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);
"""


def read_csv(path: Path) -> list[dict[str, str]]:
    with open(path, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def iso_date(raw: str) -> str:
    raw = (raw or "").strip()
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(raw, fmt).date().isoformat()
        except ValueError:
            continue
    return ""


def num(v: str) -> float | None:
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def clean(text: str) -> str:
    return " ".join((text or "").split())


def default_resolver() -> Callable:
    from tceq_event_mapping import resolve

    return resolve


def event_rows(incidents: list[dict]) -> list[tuple]:
    out = []
    for r in incidents:
        date = iso_date(r.get("event_start", "")) or iso_date(r.get("report_date", ""))
        out.append((
            r["incident_number"].strip(), date, int(date[:4]) if date else None, clean(r.get("event_start", "")),
            clean(r.get("event_end", "")), clean(r.get("duration", "")), iso_date(r.get("report_date", "")),
            clean(r.get("regulated_entity_name", "")), clean(r.get("owner_name", "")), clean(r.get("county", "")),
            clean(r.get("event_type", "")), clean(r.get("tceq_rn", "")), clean(r.get("cause", "")),
        ))
    return out


def point_rows(points: list[dict]) -> list[tuple]:
    seen, out = set(), []
    for r in points:
        key = (r["incident_number"].strip(), int(r["point_idx"]))
        if key in seen:
            continue
        seen.add(key)
        out.append((*key, clean(r.get("point_name", "")), clean(r.get("epn", "")), point_kind(r.get("point_name"))))
    return out


def resolve_names(contaminants: list[dict], resolve: Callable) -> tuple[dict[str, object], Counter]:
    names = Counter(clean(r.get("contaminant", "")) for r in contaminants)
    names.pop("", None)
    return {n: resolve(n) for n in names}, names


def cas_rows(contaminants: list[dict], resolved: dict) -> list[tuple]:
    out = []
    for r in contaminants:
        name = clean(r.get("contaminant", ""))
        hit = resolved.get(name)
        if not hit or hit.status != "cas" or not hit.cas:
            continue
        out.append((r["incident_number"].strip(), int(r["point_idx"]) if r.get("point_idx") else None, hit.cas, name,
                    num(r.get("qty")), clean(r.get("unit", "")), hit.method, hit.key))
    return out


def coverage(names: Counter, resolved: dict) -> dict:
    rows, distinct = Counter(), Counter()
    for n, k in names.items():
        rows[resolved[n].status] += k
        distinct[resolved[n].status] += 1
    top_unmapped = [(n, k) for n, k in names.most_common() if resolved[n].status == "unmapped"][:15]
    return {"rows_by_status": {s: rows.get(s, 0) for s in STATUSES},
            "names_by_status": {s: distinct.get(s, 0) for s in STATUSES},
            "top_unmapped": top_unmapped}


def build(events_dir: Path = ENV_TCEQ_EVENTS_DIR, points_dir: Path = ENV_TCEQ_POINTS_DIR,
          out: Path = TCEQ_EVENT_CAS_INDEX_DB, resolve: Callable | None = None) -> dict:
    resolve = resolve or default_resolver()
    incidents = read_csv(events_dir / "incidents.csv")
    points = read_csv(points_dir / "eer_points.csv")
    contaminants = read_csv(points_dir / "eer_point_contaminants.csv")
    resolved, names = resolve_names(contaminants, resolve)
    ev, pts, cas = event_rows(incidents), point_rows(points), cas_rows(contaminants, resolved)
    cov = coverage(names, resolved)

    out.parent.mkdir(parents=True, exist_ok=True)
    tmp = out.with_suffix(".tmp")
    tmp.unlink(missing_ok=True)
    conn = sqlite3.connect(tmp)
    with conn:
        conn.executescript(SCHEMA)
        conn.executemany("INSERT INTO events VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", ev)
        conn.executemany("INSERT INTO points VALUES (?,?,?,?,?)", pts)
        conn.executemany("INSERT INTO event_cas VALUES (?,?,?,?,?,?,?,?)", cas)
        conn.executemany("INSERT INTO name_status VALUES (?,?,?,?,?,?,?)", [
            (n, h.key, h.status, h.cas, h.group, h.method, names[n]) for n, h in resolved.items()])
        conn.executemany("INSERT INTO meta VALUES (?,?)", [
            ("built_at", datetime.now().isoformat(timespec="seconds")), ("events_dir", str(events_dir)),
            ("points_dir", str(points_dir)), ("events", str(len(ev))), ("contaminant_rows", str(len(contaminants))),
        ])
        conn.execute("CREATE INDEX ix_event_cas_cas ON event_cas(cas)")
    conn.close()
    tmp.replace(out)

    years = sorted(r[2] for r in ev if r[2])
    return {
        "out": str(out), "events": len(ev), "years": [years[0], years[-1]] if years else [],
        "points": len(pts), "point_kinds": dict(Counter(p[4] for p in pts).most_common()),
        "contaminant_rows": len(contaminants), "cas_rows": len(cas),
        "cas_distinct": len({r[2] for r in cas}), "events_with_cas": len({r[0] for r in cas}),
        "cas_rows_units": dict(Counter(r[5] or "(none)" for r in cas).most_common()),
        **cov,
    }


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    report = build()
    for k, v in report.items():
        print(f"{k}: {v}")


if __name__ == "__main__":
    main()
