"""portal_facts.db tables of the law corpus, their writes, and the reg_changes rows of an article-level diff.

  law_docs     one row per fetched version (doc_key "<kind>:<serial>"); is_current = 1 for the 현행 one per law_id
  law_articles 조문 of each version (kind article | heading | body = whole text of a 행정규칙 without 제N조; paras_json = 항/호/목 for 법령; text = whole article)
  law_annexes  별표·서식 titles and links of each version (the text stays in the raw answer)
  law_history  every version the history search lists (연혁·현행·시행예정), keyed (kind, law_id, serial, effective_on)
All rows carry source_id law_config.SOURCE_ID. Tables are created IF NOT EXISTS (portal_db convention); old versions
are kept, so a later diff can always read the previous text.
"""
from __future__ import annotations

import json
import sqlite3

import law_config as C

SCHEMA = """
CREATE TABLE IF NOT EXISTS law_docs (
  doc_key TEXT PRIMARY KEY, kind TEXT NOT NULL, law_id TEXT NOT NULL, serial TEXT NOT NULL,
  name TEXT NOT NULL, set_name TEXT, law_type TEXT,
  promulgated_on TEXT, promulgation_no TEXT, effective_on TEXT, amend_type TEXT, ministry TEXT,
  url TEXT, url_current TEXT, is_current INTEGER NOT NULL DEFAULT 0,
  articles INTEGER, annexes INTEGER, raw_file TEXT, sha256 TEXT, fetched_at TEXT, source_id TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS law_docs_law ON law_docs (kind, law_id, is_current);

CREATE TABLE IF NOT EXISTS law_articles (
  doc_key TEXT NOT NULL, seq INTEGER NOT NULL, article_no TEXT, article_key TEXT, kind TEXT NOT NULL,
  title TEXT, text TEXT NOT NULL, paras_json TEXT, effective_on TEXT, source_id TEXT NOT NULL,
  PRIMARY KEY (doc_key, seq));
CREATE INDEX IF NOT EXISTS law_articles_no ON law_articles (doc_key, article_no);

CREATE TABLE IF NOT EXISTS law_annexes (
  doc_key TEXT NOT NULL, seq INTEGER NOT NULL, annex_no TEXT, annex_key TEXT, annex_kind TEXT, title TEXT,
  pdf_url TEXT, file_url TEXT, source_id TEXT NOT NULL, PRIMARY KEY (doc_key, seq));

CREATE TABLE IF NOT EXISTS law_history (
  kind TEXT NOT NULL, law_id TEXT NOT NULL, serial TEXT NOT NULL, effective_on TEXT NOT NULL,
  name TEXT, law_type TEXT, promulgated_on TEXT, promulgation_no TEXT, amend_type TEXT, status TEXT, ministry TEXT,
  source_id TEXT NOT NULL, PRIMARY KEY (kind, law_id, serial, effective_on));
"""
CHANGE_WORD = {"added": "신설", "removed": "삭제", "modified": "개정"}


def ensure(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA)
    conn.commit()


def doc_key(kind: str, serial: str) -> str:
    return f"{kind}:{serial}"


def has_doc(conn, key: str) -> bool:
    return conn.execute("SELECT 1 FROM law_docs WHERE doc_key = ?", (key,)).fetchone() is not None


def current_doc(conn, kind: str, law_id: str) -> dict | None:
    cur = conn.execute("SELECT * FROM law_docs WHERE kind = ? AND law_id = ? AND is_current = 1", (kind, law_id))
    row = cur.fetchone()
    return dict(zip([c[0] for c in cur.description], row)) if row else None


def load_articles(conn, key: str) -> list[dict]:
    cur = conn.execute("SELECT seq, article_no, article_key, kind, title, text, effective_on FROM law_articles "
                       "WHERE doc_key = ? ORDER BY seq", (key,))
    return [dict(zip([c[0] for c in cur.description], r)) for r in cur.fetchall()]


def put_doc(conn, key: str, kind: str, serial: str, parsed: dict, extra: dict) -> None:
    """Replace one version's rows (doc + articles + annexes) in one transaction. extra: set_name, url, url_current,
    raw_file, sha256, fetched_at."""
    m = parsed["meta"]
    arts = parsed["articles"]
    with conn:
        conn.execute("DELETE FROM law_articles WHERE doc_key = ?", (key,))
        conn.execute("DELETE FROM law_annexes WHERE doc_key = ?", (key,))
        is_cur = conn.execute("SELECT is_current FROM law_docs WHERE doc_key = ?", (key,)).fetchone()
        conn.execute(
            "INSERT OR REPLACE INTO law_docs (doc_key, kind, law_id, serial, name, set_name, law_type, promulgated_on, "
            "promulgation_no, effective_on, amend_type, ministry, url, url_current, is_current, articles, annexes, "
            "raw_file, sha256, fetched_at, source_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (key, kind, m["law_id"], serial, m["name"], extra.get("set_name"), m["law_type"], m["promulgated_on"],
             m["promulgation_no"], m["effective_on"], m["amend_type"], m["ministry"], extra.get("url"),
             extra.get("url_current"), is_cur[0] if is_cur else 0, sum(a["kind"] in ("article", "body") for a in arts),
             len(parsed["annexes"]), extra.get("raw_file"), extra.get("sha256"), extra.get("fetched_at"), C.SOURCE_ID))
        conn.executemany(
            "INSERT INTO law_articles (doc_key, seq, article_no, article_key, kind, title, text, paras_json, "
            "effective_on, source_id) VALUES (?,?,?,?,?,?,?,?,?,?)",
            [(key, a["seq"], a["article_no"], a["article_key"], a["kind"], a["title"], a["text"],
              json.dumps(a["paras"], ensure_ascii=False) if a["paras"] else None, a["effective_on"], C.SOURCE_ID)
             for a in arts])
        conn.executemany(
            "INSERT INTO law_annexes (doc_key, seq, annex_no, annex_key, annex_kind, title, pdf_url, file_url, source_id) "
            "VALUES (?,?,?,?,?,?,?,?,?)",
            [(key, i, x["annex_no"], x["annex_key"], x["annex_kind"], x["title"], x["pdf_url"], x["file_url"],
              C.SOURCE_ID) for i, x in enumerate(parsed["annexes"], 1)])


def set_current(conn, kind: str, law_id: str, key: str) -> None:
    with conn:
        conn.execute("UPDATE law_docs SET is_current = (doc_key = ?) WHERE kind = ? AND law_id = ?", (key, kind, law_id))


def put_history(conn, kind: str, law_id: str, hits: list[dict]) -> int:
    rows = [(kind, law_id, h["serial"], h["effective_on"], h["name"], h["law_type"], h["promulgated_on"],
             h["promulgation_no"], h["amend_type"], h["status"], h["ministry"], C.SOURCE_ID)
            for h in hits if h["law_id"] == law_id and h["serial"]]
    with conn:
        conn.executemany("INSERT OR REPLACE INTO law_history (kind, law_id, serial, effective_on, name, law_type, "
                         "promulgated_on, promulgation_no, amend_type, status, ministry, source_id) "
                         "VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", rows)
    return len(rows)


def history_count(conn, kind: str, law_id: str) -> int:
    return conn.execute("SELECT COUNT(*) FROM law_history WHERE kind = ? AND law_id = ?", (kind, law_id)).fetchone()[0]


def change_rows(diff: list[tuple[str, str, str]], meta: dict, url: str, list_ids: list[str] | None) -> list[tuple]:
    """reg_changes tuples (changed_on, jurisdiction, list_id, cas, change, detail, source_url, source_id) of a diff.
    One row per changed article and per linked KR list (list_id None when the law backs no ChemIP list)."""
    when = meta["promulgated_on"] or meta["effective_on"]
    issued = f"{meta['amend_type']} {meta['law_type']} 제{meta['promulgation_no']}호".strip()
    out = []
    for change, no, title in diff:
        art = no if no.startswith("본문") else f"제{no.replace('의', '조의', 1)}" if "의" in no else f"제{no}조"
        detail = (f"{meta['name']} {art}{f'({title})' if title else ''} {CHANGE_WORD[change]} — {issued}, "
                  f"공포 {meta['promulgated_on']}, 시행 {meta['effective_on']}")
        for lid in list_ids or [None]:
            out.append((when, "KR", lid, None, change, detail[:300], url, C.DIFF_SOURCE_ID))
    return out


def table_sizes(conn) -> dict:
    """{table: {rows, bytes}} for the law tables (bytes from dbstat when the SQLite build has it)."""
    out = {}
    for t in ("law_docs", "law_articles", "law_annexes", "law_history"):
        out[t] = {"rows": conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]}
        try:
            got = conn.execute("SELECT SUM(pgsize) FROM dbstat WHERE name = ? OR name IN "
                               "(SELECT name FROM sqlite_master WHERE tbl_name = ? AND type = 'index')", (t, t)).fetchone()
            out[t]["bytes"] = got[0] or 0
        except sqlite3.Error:  # no dbstat: the stored data size (sum of column lengths, no index/page overhead)
            cols = [r[1] for r in conn.execute(f"PRAGMA table_info({t})")]
            expr = " + ".join(f"COALESCE(LENGTH(CAST({c} AS BLOB)), 0)" for c in cols)
            out[t]["bytes"] = conn.execute(f"SELECT COALESCE(SUM({expr}), 0) FROM {t}").fetchone()[0]
            out[t]["bytes_note"] = "column data only"
    return out
