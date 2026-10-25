"""Write the parsed sources into hs_codes.sqlite (atomic replace) and the meta JSON."""
from __future__ import annotations

import json
import os
import sqlite3
from pathlib import Path

from . import config

SCHEMA = """
CREATE TABLE cas_hs (
    cas TEXT NOT NULL,          -- validated CAS RN
    hs6 TEXT,                   -- first 6 digits of the published code (NULL if code coarser than HS6)
    cn8 TEXT,                   -- EU CN 8-digit code (NULL if ECICS gives a coarser code)
    hsk10 TEXT,                 -- Korean HSK 10-digit; NULL: no official CAS->HSK source
    description TEXT,           -- ECICS IUPAC name, else its first-nomenclature description
    source TEXT,
    cn_code TEXT,               -- code exactly as published by the source
    cn_level TEXT,              -- cn8 | hs6 | hs4 | chapter
    cus TEXT,                   -- ECICS CUS number (entry id)
    name_type TEXT,             -- IUPAC | INN | COMMON | ISO ...
    cas_group TEXT,             -- full CAS list when the entry names several CAS RNs
    is_multi_cas INTEGER,       -- 1 = entry covers several CAS (mixture / set): code not specific to one substance
    code_in_cn INTEGER,           -- 1/0: code present in the EU CN text of the CN year (NULL for hs4/chapter)
    hs6_in_hsk INTEGER          -- 1/0: hs6 present in the KCS HSK list
);
CREATE INDEX ix_cas_hs_cas ON cas_hs(cas);
CREATE INDEX ix_cas_hs_hs6 ON cas_hs(hs6);
CREATE TABLE hs6_heading (
    hs6 TEXT PRIMARY KEY, title_en TEXT, title_ko TEXT,
    hs4 TEXT, hs4_title_en TEXT, hs4_title_ko TEXT,
    title_ko_basis TEXT, in_eu_cn INTEGER, in_kr_hsk INTEGER
);
CREATE TABLE hsk10_code (
    hsk10 TEXT PRIMARY KEY, hs6 TEXT, name_ko TEXT, name_en TEXT,
    valid_from TEXT, valid_to TEXT
);
CREATE INDEX ix_hsk10_hs6 ON hsk10_code(hs6);
CREATE TABLE rejected (raw_cas TEXT, cus TEXT, cn_code TEXT, reason TEXT, source TEXT);
CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);
CREATE VIEW v_cas_hsk10_candidates AS
    SELECT c.cas, c.hs6, k.hsk10, k.name_ko, k.name_en
    FROM (SELECT DISTINCT cas, hs6 FROM cas_hs WHERE hs6 IS NOT NULL) c
    JOIN hsk10_code k ON k.hs6 = c.hs6;
"""

_CAS_COLS = ["cas", "hs6", "cn8", "hsk10", "description", "source", "cn_code", "cn_level",
             "cus", "name_type", "cas_group", "is_multi_cas", "code_in_cn", "hs6_in_hsk"]


def annotate(rows: list[dict], cn: dict, hsk_hs6: set[str]) -> None:
    for r in rows:
        if r["cn_level"] == "cn8":
            r["code_in_cn"] = int(r["cn8"] in cn["cn8"])
        elif r["cn_level"] == "hs6":
            r["code_in_cn"] = int(r["hs6"] in cn["hs6"])
        else:
            r["code_in_cn"] = None
        r["hs6_in_hsk"] = int(r["hs6"] in hsk_hs6) if r["hs6"] else None


def heading_rows(cn: dict, kr_class: dict, hsk_hs6: set[str]) -> list[tuple]:
    out = []
    for hs6 in sorted(set(cn["hs6"]) | hsk_hs6):
        hs4 = hs6[:4]
        out.append((hs6, cn["hs6"].get(hs6), kr_class["hs6"].get(hs6), hs4,
                    cn["hs4"].get(hs4), kr_class["hs4"].get(hs4),
                    kr_class["hs6_basis"].get(hs6), int(hs6 in cn["hs6"]), int(hs6 in hsk_hs6)))
    return out


def write(cas_rows: list[dict], rejected: list[dict], headings: list[tuple],
          hsk_rows: list[dict], meta: dict) -> Path:
    config.OUT_DIR.mkdir(parents=True, exist_ok=True)
    tmp = config.OUT_DB.with_suffix(".sqlite.tmp")
    if tmp.exists():
        tmp.unlink()
    con = sqlite3.connect(tmp)
    try:
        con.executescript(SCHEMA)
        con.executemany(f"INSERT INTO cas_hs VALUES ({','.join('?' * len(_CAS_COLS))})",
                        [tuple(r[c] for c in _CAS_COLS) for r in cas_rows])
        con.executemany("INSERT INTO rejected VALUES (?,?,?,?,?)",
                        [(r["raw_cas"], r["cus"], r["cn_code"], r["reason"], r["source"])
                         for r in rejected])
        con.executemany("INSERT INTO hs6_heading VALUES (?,?,?,?,?,?,?,?,?)", headings)
        con.executemany("INSERT INTO hsk10_code VALUES (?,?,?,?,?,?)",
                        [(r["hsk10"], r["hs6"], r["name_ko"], r["name_en"], r["valid_from"],
                          r["valid_to"]) for r in hsk_rows])
        con.executemany("INSERT INTO meta VALUES (?,?)",
                        [(k, v if isinstance(v, str) else json.dumps(v, ensure_ascii=False))
                         for k, v in meta.items()])
        con.commit()
    finally:
        con.close()
    os.replace(tmp, config.OUT_DB)
    config.OUT_META_JSON.write_text(json.dumps(meta, ensure_ascii=False, indent=2),
                                    encoding="utf-8")
    return config.OUT_DB
