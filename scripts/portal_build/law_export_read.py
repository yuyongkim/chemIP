"""Reads for the static law area (read-only): the current corpus docs of data/portal_facts.db, the Korean lists with
their substance rows (reg_lists.py), and each list's legal-basis text (kr_lists/*.json legal_basis, else law_basis.json).

load_corpus(db)   -> [{doc, articles, annexes, history}]   current versions only, in index order (법령 then 행정규칙, by name)
kr_lists(term_db) -> [{id, group, title, law, rows}]       kr_law lists, NCIS classifications, the KR intl_regulatory list
basis_texts(ids)  -> {list_id: {"basis": str, "term": str}}
"""
from __future__ import annotations

import glob
import json
import os
import sqlite3

import law_export_config as C
import reg_config as RC
import reg_lists


def _ro(path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(f"file:{path.replace(os.sep, '/')}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    return conn


def _rows(conn, sql: str, args=()) -> list[dict]:
    return [dict(r) for r in conn.execute(sql, args)]


def load_corpus(db: str = C.DB) -> list[dict]:
    conn = _ro(db)
    try:
        docs = _rows(conn, "SELECT * FROM law_docs WHERE is_current = 1 ORDER BY CASE kind WHEN 'law' THEN 0 ELSE 1 END, name")
        out = []
        for d in docs:
            key = d["doc_key"]
            out.append({
                "doc": d,
                "articles": _rows(conn, "SELECT seq, article_no, article_key, kind, title, text, paras_json, effective_on "
                                        "FROM law_articles WHERE doc_key = ? ORDER BY seq", (key,)),
                "annexes": _rows(conn, "SELECT seq, annex_no, annex_key, annex_kind, title, pdf_url, file_url "
                                       "FROM law_annexes WHERE doc_key = ? ORDER BY seq", (key,)),
                "history": _rows(conn, "SELECT serial, effective_on, name, law_type, promulgated_on, promulgation_no, "
                                       "amend_type, status FROM law_history WHERE kind = ? AND law_id = ?",
                                 (d["kind"], d["law_id"])),
            })
        return out
    finally:
        conn.close()


def kr_lists(term_db: str = RC.TERM_DB) -> list[dict]:
    lists = reg_lists.kr_law_lists()
    conn = sqlite3.connect(f"file:{term_db.replace(os.sep, '/')}?mode=ro", uri=True)
    try:
        lists += reg_lists.ncis_lists(conn)
        lists += [x for x in reg_lists.intl_reg_lists(conn) if x["id"] in C.INTL_REG_KR]
    finally:
        conn.close()
    return [{"id": x["id"], "group": x["group"], "title": x["title"], "law": x["law"], "rows": x["rows"]} for x in lists]


def _file_basis() -> dict[str, str]:
    out = {}
    for path in sorted(glob.glob(os.path.join(RC.TRADE_DATA, "kr_lists", "*.json"))):
        with open(path, encoding="utf-8") as fh:
            d = json.load(fh)
        if isinstance(d, dict) and d.get("list_id") and d.get("legal_basis"):
            out[d["list_id"]] = d["legal_basis"]
    return out


def basis_texts(ids) -> dict[str, dict]:
    with open(C.BASIS_FILE, encoding="utf-8") as fh:
        curated = json.load(fh)["lists"]
    files = _file_basis()
    out = {}
    for i in ids:
        if i in files:
            out[i] = {"basis": files[i], "term": ""}
        elif i in curated:
            out[i] = {"basis": curated[i]["basis"], "term": curated[i].get("term") or ""}
    return out
