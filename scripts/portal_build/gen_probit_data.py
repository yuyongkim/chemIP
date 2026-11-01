"""Writes frontend/public/chemip/calc_toxic_probit_data.jsx — the RIVM lethal probit constants the toxic_probit calculator offers.

    python -I -B G:\\MSDS\\scripts\\portal_build\\gen_probit_data.py

Input: data/portal_raw/el/rivm_probit (el_fetch.py), molar mass from DOE PAC Rev. 29 (el_pac.py, for ppm input), names from
data/portal_facts.db identifiers (read-only; Korean name, else the English one). One row per RIVM page; a page with
several CAS numbers (TDI isomers, SO3/H2SO4/oleum) keeps its first CAS. Generated file — do not edit by hand.
"""
from __future__ import annotations

import json
import os
import re
import sqlite3
import sys

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import el_config as C  # noqa: E402
import el_pac  # noqa: E402
import el_rivm  # noqa: E402

PORTAL_DB = os.path.join(C.PROJECT, "data", "portal_facts.db")
NAME_SOURCES = ["chemip_aliases", "chemip_terms", "ncis", "wikidata"]
NAME_OVERRIDES = os.path.join(os.path.dirname(os.path.abspath(__file__)), "probit_names.json")


def names(cas_list: list[str]) -> dict[str, dict[str, str]]:
    out: dict[str, dict[str, str]] = {c: {} for c in cas_list}
    if not os.path.exists(PORTAL_DB):
        return out
    conn = sqlite3.connect(f"file:{PORTAL_DB.replace(os.sep, '/')}?mode=ro", uri=True)
    try:
        q = f"SELECT cas, id_type, value, source_id FROM identifiers WHERE id_type IN ('name_ko','name_en') AND cas IN ({','.join('?' * len(cas_list))})"
        best: dict[tuple[str, str], tuple] = {}
        for cas, typ, val, sid in conn.execute(q, cas_list):
            val = clean_name(val)
            if not val or (typ == "name_ko" and not re.search(r"[가-힣]", val)):
                continue
            rank = (len(val) > 24, NAME_SOURCES.index(sid) if sid in NAME_SOURCES else 9, len(val))
            if (cas, typ) not in best or rank < best[(cas, typ)][0]:
                best[(cas, typ)] = (rank, val)
        for (cas, typ), (_, val) in best.items():
            out[cas]["ko" if typ == "name_ko" else "en"] = val
    finally:
        conn.close()
    return out


def clean_name(s: str) -> str:
    """'아크로레인 (Acrolein)' → '아크로레인'; '염화 알릴 ( 관용명 : 알릴 클로라이드 )' → '염화 알릴'."""
    t = re.sub(r"\s*\([^()]*\)\s*", " ", s or "")
    return re.sub(r"\s+", " ", t).strip()


def english_name(s: str) -> str:
    """DOE PAC name → short display name: 'Hydrogen cyanide; (Hydrocyanic acid)' → 'Hydrogen cyanide'."""
    t = (s or "").split(";")[0].strip()
    m = re.match(r"^(.*?),\s*(\d[\d,-]*-?)$", t)   # 'Propanamine, 1-' → '1-Propanamine'
    return f"{m.group(2)}{m.group(1)}" if m else t


def js(s) -> str:
    return json.dumps(s, ensure_ascii=False)


def rows() -> list[dict]:
    rivm, _ = el_rivm.parse()
    pac, _ = el_pac.parse()
    pages: dict[str, dict] = {}
    for cas, rec in rivm.items():
        if rec["cas"] and rec["cas"][0] == cas:
            pages[cas] = rec
    nm = names(list(pages))
    with open(NAME_OVERRIDES, encoding="utf-8") as fh:
        over = json.load(fh)
    out = []
    for cas, rec in pages.items():
        en = english_name((pac.get(cas) or {}).get("name") or nm[cas].get("en") or rec["name_nl"])
        en = over.get(cas, {}).get("en") or en
        ko = over.get(cas, {}).get("ko") or nm[cas].get("ko") or en
        out.append({"cas": cas, "ko": ko, "en": en, "nl": rec["name_nl"], "mw": (pac.get(cas) or {}).get("mw"),
                    "a": rec["a"], "b": rec["b"], "n": rec["n"], "status": rec["status"], "date": rec["established"],
                    "page": rec["page"], "doc": rec["doc"], "retrieved": rec["retrieved_at"]})
    return sorted(out, key=lambda r: r["en"].lower())


def render(items: list[dict]) -> str:
    lines = [
        "// 독성 probit 상수 — RIVM Probitrelaties(네덜란드 국립공중보건환경연구소, 공개 웹 페이지) 치사 probit: Pr = a + b·ln(Cⁿ·t),",
        "// C mg/m³, t min. 물질마다 출처 페이지·기술 근거 문서 주소·확정일. scripts/portal_build/gen_probit_data.py 가 만든 파일 — 손으로 고치지 않는다.",
        "// 분자량(ppm 입력용)은 DOE PAC Rev. 29 자료. 상태 \"inhoudelijk vastgesteld\" = 내용 확정, \"voorgesteld\" = 제안(의견 수렴 중).",
        "",
        "const TOXIC_PROBIT_RIVM = [",
    ]
    for r in items:
        name = f'tr({js(r["ko"])}, {js(r["en"])})' if r["ko"] != r["en"] else js(r["en"])
        lines.append(
            f'  {{ cas: {js(r["cas"])}, name: {name}, nl: {js(r["nl"])}, mw: {js(r["mw"])}, a: {r["a"]}, b: {r["b"]}, n: {r["n"]}, '
            f'status: {js(r["status"])}, date: {js(r["date"])}, page: {js(r["page"])}, doc: {js(r["doc"])} }},')
    lines += ["];", "", f'const TOXIC_PROBIT_RIVM_RETRIEVED = {js(max((r["retrieved"] for r in items), default=""))};', "",
              "Object.assign(window, { TOXIC_PROBIT_RIVM, TOXIC_PROBIT_RIVM_RETRIEVED });", ""]
    return "\n".join(lines)


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    items = rows()
    with open(C.PROBIT_JSX, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(render(items))
    print(f"{len(items)} probit rows → {C.PROBIT_JSX}")


if __name__ == "__main__":
    main()
