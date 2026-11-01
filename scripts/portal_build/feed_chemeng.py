"""Incident feed: Chem_Eng incidents DB (read-only) → feed items and source rows.

Path: backend/integrations/sources.py CHEMENG_INCIDENTS_DB. Every Chem_Eng source keeps its own name and license
(the DB's `source` table), so the feed shows the same license labels as the substance incidents panel.
"""
from __future__ import annotations

import datetime as dt
import os
import sqlite3
import sys

import feed_config as C
from feed_parse import clean_text, emars_country, iso_date, kosha_date, truncate, valid_cas_list

PROJECT = r"G:\MSDS"
if PROJECT not in sys.path:
    sys.path.append(PROJECT)

from backend.integrations.equipment_disciplines import discipline_of, split_equipment  # noqa: E402
from backend.integrations.sources import CHEMENG_INCIDENTS_DB  # noqa: E402


def connect_ro(path=CHEMENG_INCIDENTS_DB) -> sqlite3.Connection:
    p = str(path).replace(os.sep, "/")
    conn = sqlite3.connect(f"file:{p}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    return conn


def source_rows(conn: sqlite3.Connection) -> dict[str, dict]:
    """{feed source_id: {name, url, license, retrieved_at}} for the Chem_Eng sources present in the DB."""
    out = {}
    for r in conn.execute("SELECT name, title, homepage, license, built_at FROM source"):
        sid = C.CHEMENG_SOURCES.get(r["name"])
        if sid:
            lic = r["license"] or ""
            credit = C.CHEMENG_ATTRIBUTION.get(r["name"])
            out[sid] = {"name": r["title"], "url": r["homepage"], "license": f"{lic}. {credit}" if credit else lic,
                        "retrieved_at": (r["built_at"] or "")[:10]}
    return out


def chemicals_by_incident(conn: sqlite3.Connection) -> dict[str, list[tuple[str, str]]]:
    out: dict[str, list[tuple[str, str]]] = {}
    for iid, cas, name in conn.execute(
            "SELECT ic.incident_id, ch.cas, ch.name FROM incident_chemical ic JOIN chemical ch ON ch.id = ic.chemical_id "
            "ORDER BY ic.incident_id, ch.id"):
        out.setdefault(iid, []).append((cas, name))
    return out


def name_pairs(conn: sqlite3.Connection) -> list[tuple[str, str]]:
    """(cas, name) of every Chem_Eng chemical with a CAS: the press-headline tagger's dictionary."""
    return [(c, n) for c, n in conn.execute("SELECT cas, name FROM chemical WHERE cas <> '' AND name <> ''")]


def item_date(r: sqlite3.Row, today: dt.date) -> str:
    if r["source"] == "kosha":
        return kosha_date(r["summary"], today)
    return iso_date(r["date"], today) or iso_date(r["report_date"], today)


def item_country(r: sqlite3.Row) -> str:
    if r["source"] == "emars":
        return emars_country(r["location"])
    return (r["country"] or "").strip().upper()


def to_item(r: sqlite3.Row, chems: list[tuple[str, str]], today: dt.date) -> dict:
    equipment = split_equipment(r["equipment"])
    disciplines = []
    for t in equipment:
        d = discipline_of(t)
        if d and d not in disciplines:
            disciplines.append(d)
    cas, names = valid_cas_list(chems)
    summary = "" if r["source"] == "rmp" else truncate(clean_text(r["summary"]), C.SUMMARY_CHARS)  # RMP text is generated
    return {
        "id": f"{C.CHEMENG_SOURCES[r['source']]}:{r['source_id'] or r['id']}",
        "date": item_date(r, today),
        "title": clean_text(r["title"]) or r["id"],
        "url": r["url"] or r["report_url"] or "",
        "source_id": C.CHEMENG_SOURCES[r["source"]],
        "cas": cas, "chem_names": names,
        "equipment": equipment, "discipline": disciplines,
        "country": item_country(r),
        "summary": summary,
        "lang": r["language"] or "",
    }


def collect(today: dt.date, path=CHEMENG_INCIDENTS_DB) -> dict:
    """{items, sources, names}: every Chem_Eng incident as a feed item."""
    conn = connect_ro(path)
    try:
        chems = chemicals_by_incident(conn)
        rows = conn.execute("SELECT * FROM incident WHERE source IN (%s)" % ",".join("?" * len(C.CHEMENG_SOURCES)),
                            list(C.CHEMENG_SOURCES)).fetchall()
        items = [to_item(r, chems.get(r["id"], []), today) for r in rows]
        return {"items": items, "sources": source_rows(conn), "names": name_pairs(conn)}
    finally:
        conn.close()

