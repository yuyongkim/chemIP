"""Build the identifiers table of portal_facts.db: CAS ↔ names, KOSHA MSDS id, NCIS KE, PubChem CID, Wikidata (EC, UN,
InChIKey, Q id, ko/en labels) and the UN numbers of the MSDS transport rows.

    python -B G:\\MSDS\\scripts\\portal_build\\identifiers.py [--report path.json]

Inputs (all read-only / local files; the network is used only by wikidata_dump.py, which writes the dump read here):
  terminology.db chemical_terms (names, KOSHA ids), chemical_aliases (ko_common, ncis_synonym), ncis_substance (KE,
  names), msds_details section 3 (CAS of MSDS-only records), data/pubchem_cache/cas_cid_map.json, the Wikidata dump,
  portal_facts.db transport (UN). Replaces only its own rows (source ids in SOURCES).
"""
from __future__ import annotations

import argparse
import collections
import json
import os
import re
import sys
import time

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import portal_db  # noqa: E402
import wikidata_dump  # noqa: E402
from cas_utils import is_cas  # noqa: E402
from msds_facts import SRC_S14, msds_cas_map  # noqa: E402

PUBCHEM_MAP = os.path.join(portal_db.PROJECT, "data", "pubchem_cache", "cas_cid_map.json")
SRC_TERMS, SRC_ALIASES, SRC_NCIS, SRC_PUBCHEM, SRC_WIKIDATA, SRC_MSDS = (
    "chemip_terms", "chemip_aliases", "ncis", "pubchem", "wikidata", "kosha_msds")
SOURCES = {
    SRC_TERMS: {"name": "ChemIP 물질 목록 (KOSHA·NCIS 이름)", "url": "https://chemip.yule.pics/chemip", "license": "KOSHA·NCIS 공공데이터"},
    SRC_ALIASES: {"name": "ChemIP 별칭 (NCIS 동의어·관용명)", "url": "https://ncis.nier.go.kr", "license": "NCIS 공공데이터"},
    SRC_NCIS: {"name": "NCIS 화학물질정보시스템 (KE 번호)", "url": "https://ncis.nier.go.kr", "license": "공공데이터포털 국립환경과학원 화학물질정보 — 공공누리"},
    SRC_PUBCHEM: {"name": "PubChem (NCBI)", "url": "https://pubchem.ncbi.nlm.nih.gov", "license": "NCBI 정책상 이용 제한 없음"},
    SRC_WIKIDATA: {"name": "Wikidata", "url": "https://www.wikidata.org", "license": "CC0 1.0"},
    SRC_MSDS: {"name": "KOSHA MSDS (물질 번호)", "url": "https://msds.kosha.or.kr", "license": "공공데이터포털 KOSHA MSDS — 이용허락범위 제한 없음"},
}
OWN_SOURCES = [SRC_TERMS, SRC_ALIASES, SRC_NCIS, SRC_PUBCHEM, SRC_WIKIDATA, SRC_MSDS, SRC_S14]

EC_RE = re.compile(r"^\d{3}-\d{3}-\d$")
# NCIS numbers: KE-12345 (existing substance) and the other NCIS series as written (KE-05-0549, 2002-3-2041, 97-3-16)
KE_RE = re.compile(r"^(KE-\d{5}|KE-\d{2}-\d{4}|\d{2,4}-\d-\d{1,4})$")
INCHIKEY_RE = re.compile(r"^[A-Z]{14}-[A-Z]{10}-[A-Z]$")
UN_RE = re.compile(r"^\d{4}$")
_VALIDATORS = {"ec": EC_RE, "ke": KE_RE, "inchikey": INCHIKEY_RE, "un": UN_RE}


def clean_name(s: str | None) -> str:
    return re.sub(r"\s+", " ", (s or "").strip())


def name_type(name: str) -> str:
    """name_ko when the name has Hangul, else name_en (chemical_terms.name holds English names for non-KOSHA rows)."""
    return "name_ko" if re.search(r"[가-힣]", name or "") else "name_en"


def norm_value(id_type: str, value: str | None) -> str | None:
    """Stored spelling of an identifier, or None when it does not look like one of its kind."""
    v = clean_name(value)
    if not v:
        return None
    if id_type == "ke":
        v = v.upper().replace(" ", "")
        m = re.fullmatch(r"KE-?(\d{5})", v)
        v = f"KE-{m.group(1)}" if m else v
    elif id_type == "un":
        v = re.sub(r"^UN\s*", "", v, flags=re.I)
    elif id_type == "inchikey":
        v = v.upper()
    rx = _VALIDATORS.get(id_type)
    return v if not rx or rx.match(v) else None


def cas_universe(term_db: str = portal_db.TERM_DB) -> set[str]:
    """Every CAS ChemIP shows: chemical_terms CAS + CAS of MSDS-only records."""
    conn = portal_db.ro_connect(term_db)
    try:
        out = {c for (c,) in conn.execute("SELECT DISTINCT cas_no FROM chemical_terms") if is_cas((c or "").strip())}
        out.update(msds_cas_map(conn).values())
        return out
    finally:
        conn.close()


def _terms_rows(conn):
    for name, cas, desc, name_en in conn.execute("SELECT name, cas_no, description, name_en FROM chemical_terms"):
        cas = (cas or "").strip()
        if not is_cas(cas):
            continue
        if clean_name(name):
            yield cas, name_type(name), clean_name(name), SRC_TERMS
        if clean_name(name_en):
            yield cas, "name_en", clean_name(name_en), SRC_TERMS
        if (desc or "").startswith("KOSHA_ID:"):
            yield cas, "kosha_id", desc[9:].strip(), SRC_TERMS


def _alias_rows(conn):
    q = "SELECT cas_no, alias, alias_type FROM chemical_aliases WHERE alias_type IN ('ko_common', 'ncis_synonym')"
    for cas, alias, _ in conn.execute(q):
        cas, alias = (cas or "").strip(), clean_name(alias)
        if is_cas(cas) and alias:
            yield cas, name_type(alias), alias, SRC_ALIASES


def _ncis_rows(conn):
    for cas, ke, nk, ne, nk2, ne2 in conn.execute("SELECT cas_no, ke_no, name_kor, name_eng, name2_kor, name2_eng FROM ncis_substance"):
        cas = (cas or "").strip()
        if not is_cas(cas):
            continue
        ke = norm_value("ke", ke)
        if ke:
            yield cas, "ke", ke, SRC_NCIS
        for n in (nk, nk2):
            if clean_name(n):
                yield cas, "name_ko", clean_name(n), SRC_NCIS
        for n in (ne, ne2):
            if clean_name(n):
                yield cas, "name_en", clean_name(n), SRC_NCIS


def _pubchem_rows(path: str = PUBCHEM_MAP):
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8") as fh:
        for cas, cid in json.load(fh).items():
            if is_cas(cas) and cid:
                yield cas, "pubchem_cid", str(cid), SRC_PUBCHEM


def wikidata_rows(rows: list[dict]):
    """Dump rows → identifier rows. Only CAS-shaped `cas` values; EC/UN/InChIKey checked by norm_value."""
    for r in rows:
        cas = (r.get("cas") or "").strip()
        if not is_cas(cas):
            continue
        if r.get("item"):
            yield cas, "wikidata", r["item"], SRC_WIKIDATA
        for key, id_type in (("ec", "ec"), ("un", "un"), ("ik", "inchikey")):
            v = norm_value(id_type, r.get(key))
            if v:
                yield cas, id_type, v, SRC_WIKIDATA
        if clean_name(r.get("ko")):
            yield cas, "name_ko", clean_name(r["ko"]), SRC_WIKIDATA
        if clean_name(r.get("en")):
            yield cas, "name_en", clean_name(r["en"]), SRC_WIKIDATA


def _msds_rows(term_conn, portal_conn):
    for chem_id, cas in msds_cas_map(term_conn).items():
        yield cas, "kosha_id", chem_id, SRC_MSDS
    for cas, un in portal_conn.execute("SELECT DISTINCT cas, un_number FROM transport WHERE un_number IS NOT NULL"):
        yield cas, "un", un, SRC_S14


def build(term_db: str = portal_db.TERM_DB, portal_path: str = portal_db.PORTAL_DB, dump_file: str = wikidata_dump.DUMP_FILE,
          log=print) -> dict:
    t0 = time.time()
    term = portal_db.ro_connect(term_db)
    dst = portal_db.connect(portal_path)
    rows = []
    for gen in (_terms_rows(term), _alias_rows(term), _ncis_rows(term), _pubchem_rows(), _msds_rows(term, dst),
                wikidata_rows(wikidata_dump.read_dump(dump_file))):
        rows.extend(gen)
    term.close()
    rows = list(dict.fromkeys(rows))
    retrieved = time.strftime("%Y-%m-%d")
    portal_db.put_sources(dst, {k: {**v, "retrieved_at": retrieved} for k, v in SOURCES.items()})
    dst.commit()
    n = portal_db.replace_rows(dst, "identifiers", OWN_SOURCES, ["cas", "id_type", "value", "source_id"], rows)
    counts = collections.Counter((r[1], r[3]) for r in rows)
    cas_by_type = collections.defaultdict(set)
    for cas, id_type, _, _ in rows:
        cas_by_type[id_type].add(cas)
    total = {t: c for (t, c) in dst.execute("SELECT id_type, COUNT(*) FROM identifiers GROUP BY id_type")}
    dst.close()
    report = {
        "inserted": n,
        "rows_by_type": total,
        "cas_by_type": {t: len(s) for t, s in sorted(cas_by_type.items())},
        "rows_by_type_source": {f"{t}/{s}": c for (t, s), c in sorted(counts.items())},
        "wikidata_dump": dump_file if os.path.exists(dump_file) else None,
        "secs": round(time.time() - t0, 1),
    }
    log(json.dumps(report, ensure_ascii=False, indent=1))
    return report


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--report", default="")
    a = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    report = build()
    if a.report:
        with open(a.report, "w", encoding="utf-8") as fh:
            json.dump(report, fh, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
