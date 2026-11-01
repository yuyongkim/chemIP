"""Build-time checks of the curated lists against terminology.db (read-only). Each returns a list of problems."""
from __future__ import annotations

import sqlite3

from backend.core.chemical_aliases import normalize_alias


def curated_problems(items: list[dict], sources: dict, known_cas: set[str]) -> list[str]:
    out = []
    for it in items:
        if it["cas"] not in known_cas:
            out.append(f"{it['_file']}: {it['cas']} not in chemical_terms ({it['name']})")
        if it["source"] not in sources:
            out.append(f"{it['_file']}: unknown source {it['source']} ({it['name']})")
    return out


def english_names(conn: sqlite3.Connection, cas: str) -> list[str]:
    rows = conn.execute(
        "SELECT name, name_en FROM chemical_terms WHERE cas_no = ? UNION ALL "
        "SELECT name_eng, name2_eng FROM ncis_substance WHERE cas_no = ? UNION ALL "
        "SELECT name_en, '' FROM kreach_chemicals WHERE cas_no = ?", (cas, cas, cas))
    return [normalize_alias(v) for row in rows for v in row if v]


def expect_en_problems(conn: sqlite3.Connection, items: list[dict]) -> list[str]:
    """An item with expect_en must find that English word in one of its CAS's DB English names (catches a wrong CAS)."""
    out = []
    for it in items:
        want = normalize_alias(it.get("expect_en"))
        if want and not any(want in n for n in english_names(conn, it["cas"])):
            out.append(f"{it['_file']}: {it['cas']} has no English name containing '{it['expect_en']}' ({it['name']})")
    return out


def blocklist_problems(blocklist: list[dict], sources: dict) -> list[str]:
    return [f"blocklist: unknown source {c} for {b['cas']} {b['name']}"
            for b in blocklist for c in b["sources"] if c not in sources]
