"""Write frontend/public/chemip/calc_rmp_data.jsx (the off-site screening tool's tables) from the keyed JSON files.

    python -I -B G:\\MSDS\\scripts\\portal_build\\gen_frontend_rmp.py [--check]

Inputs: rmp_oca/rmp_oca_tables.json (rmp_oca_extract.py) and, for the Korean endpoint ladder of the RMP-listed toxics,
the emergency-limit files v1/el/<CAS>.json written by emergency_limits.py (EPA AEGL, DOE PAC Rev. 29, ERPG via DOE PAC).
--check exits 1 when the generated file is out of date.
"""
from __future__ import annotations

import argparse
import gzip
import json
import os
import sys

sys.dont_write_bytecode = True
HERE = os.path.dirname(os.path.abspath(__file__))
TARGET = os.path.join(r"G:\MSDS", "frontend", "public", "chemip", "calc_rmp_data.jsx")
RMP_JSON = os.path.join(HERE, "rmp_oca", "rmp_oca_tables.json")
EL_DIR = os.path.join(r"E:\dev-cache\chemip-static\out", "v1", "el")   # emergency_limits.py output (gzip bytes, .json names)
HEADER = """// 생성된 파일 — 고치지 않는다. 원본: scripts/portal_build/rmp_oca/rmp_oca_tables.json(EPA RMP OCA 지침 부록 B·C 표와 참조표 1–30),
// v1/el/<CAS>.json(emergency_limits.py — EPA AEGL·DOE PAC Rev. 29·ERPG via DOE PAC). 만드는 스크립트: scripts/portal_build/gen_frontend_rmp.py
// 장외 영향 스크리닝 계산기(calc_offsite.jsx, 순수 함수 calc_rmp_core.jsx)가 읽는 자료 한 벌. 미국 정부 저작물(공공 영역).
// toxic[]: Exhibit B-1(기체)·B-2(액체) — ep = 40 CFR 68 부록 A 독성 끝점(mg/L), tcf = Exhibit B-4(30·35·40·45·50 °C),
//   kr = 한국 끝점 사다리 자료 { erpg2: ERPG-2(DOE PAC 경유), aegl2: AEGL-2 10분·30분·1시간, pac2: DOE PAC-2 } (단위 ppm 또는 mg/m3)
// flammable[]: Exhibit C-1(연소열)·C-2(기체)·C-3(액체). tables: 참조표 번호 → 거리 표(마일). 13번(증기운 폭발)은 식 C-2 로 계산해 없다.
"""

TOXIC_KEYS = ["mw", "k", "lfa", "lfb", "df", "gf", "llf", "vp"]
FLAM_KEYS = ["mw", "k", "lfa", "lfb", "df", "gf", "llf", "pff", "fff", "lfl", "ufl", "lfl_mgL", "hc_kJkg"]


def _clean(rec: dict, keys: list[str]) -> dict:
    return {k: rec[k] for k in keys if isinstance(rec.get(k), (int, float))}


def _el(cas: str) -> dict | None:
    path = os.path.join(EL_DIR, f"{cas}.json")
    if not os.path.exists(path):
        return None
    raw = open(path, "rb").read()
    return json.loads(gzip.decompress(raw) if raw[:2] == bytes([0x1F, 0x8B]) else raw)


def kr_ladder(el: dict | None) -> dict:
    """el/<CAS>.json → the Korean endpoint ladder inputs (only tier 2 values)."""
    out = {}
    if not el:
        return out
    e, a, p = el.get("erpg"), el.get("aegl"), el.get("pac")
    if e and e.get("v") and e["v"][1] is not None:
        out["erpg2"] = {"v": e["v"][1], "unit": e["unit"]}
    if a and a.get("v", {}).get("2"):
        v = a["v"]["2"][:3]
        if any(x is not None for x in v):
            out["aegl2"] = {"v": v, "unit": a["unit"], "status": (a.get("status") or "").lower()}
    if p and p.get("v") and p["v"][1] is not None:
        out["pac2"] = {"v": p["v"][1], "unit": p["unit"], "tier": (p.get("tiers") or ["", "", ""])[1]}
    if el.get("mw"):
        out["mw"] = el["mw"]
    return out


def render() -> str:
    rmp = json.load(open(RMP_JSON, encoding="utf-8"))
    ex = rmp["exhibits"]
    tcf = ex["B-4"]["rows"]
    toxic = []
    for key, state in (("B-1", "gas"), ("B-2", "liquid")):
        for r in ex[key]["rows"]:
            row = {"cas": r["cas"], "name": r["name"], "state": state, "exhibit": key, **_clean(r, TOXIC_KEYS),
                   "vpUnit": "psia" if state == "gas" else "mmHg",
                   "ep": r.get("ep_mgL"), "epPpm": r.get("ep_ppm"), "basis": r.get("basis"),
                   "ref": {"worst": r.get("ref_worst"), "alt": r.get("ref_alt") or r.get("ref_worst")}}
            if r["cas"] in tcf:
                row["tcf"] = tcf[r["cas"]]["tcf"]
            row["kr"] = kr_ladder(_el(r["cas"]))
            toxic.append(row)
    bleve = set(rmp["tables"]["30"]["dist"])
    flammable = []
    for key, state in (("C-2", "gas"), ("C-3", "liquid")):
        for r in ex[key]["rows"]:
            flammable.append({"cas": r["cas"], "name": r["name"], "state": state, "exhibit": key, **_clean(r, FLAM_KEYS),
                              "hcEstimated": bool(r.get("hc_estimated")),
                              "ref": {"alt": r.get("ref_worst") or ("buoyant" if (r.get("mw") or 99) < 28.97 else "dense")},
                              "bleve": r["cas"] in bleve})
    tables = {}
    for n, t in rmp["tables"].items():
        t = {k: v for k, v in t.items() if k not in ("pdf_page",)}
        if t["kind"] == "grid":
            t["keys"] = [[k["v"], 1 if k.get("above") else 0] for k in t["keys"]]
            t["rates"] = [[r["v"], 1 if r.get("below") else 0] for r in t["rates"]]
        tables[n] = t
    body = {"source": {"citation": rmp["source"]["citation"], "license": rmp["source"]["license"], "built": rmp["source"]["built"]},
            "toxic": toxic, "flammable": flammable, "tables": tables}
    data = json.dumps(body, ensure_ascii=False, separators=(",", ":"))
    return f"{HEADER}\nconst CALC_RMP_DATA = {data};\n\nObject.assign(window, {{ CALC_RMP_DATA }});\n"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()
    text = render()
    current = open(TARGET, encoding="utf-8").read() if os.path.exists(TARGET) else ""
    if args.check:
        sys.exit(0 if current == text else 1)
    if current != text:
        with open(TARGET, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(text)
        print(f"wrote {TARGET} ({len(text.encode('utf-8')):,} B)")
    else:
        print("up to date")


if __name__ == "__main__":
    main()
