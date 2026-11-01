"""Assemble per-CAS temperature-dependent property records (correlation form + coefficients + valid T range + source).

    python -I -B G:\\MSDS\\scripts\\portal_build\\tp_fetch.py         # raw files → data/portal_raw/tp/<source>/ (once)
    python -I -B G:\\MSDS\\scripts\\portal_build\\thermo_props.py     # → data/portal_raw/tp/build/tp_records.json + build_report.json
    python -I -B G:\\MSDS\\scripts\\static_export\\run_all.py --steps tp   # → v1/tp/<CAS>.json (CONTRACT.md "tp/")

Sources (tp_sources.json, allow list only — R2 §1/§3): ChemSep LITE databank (Artistic-2.0, DIPPR-form correlations and
constants), NASA CEA thermo.inp (Apache-2.0, NASA-9 ideal-gas and liquid Cp/H/S; species → CAS from the reviewed
tp_nasa_cas.json), Wikidata (CC0, critical points), CoolProp constants (MIT). Every row carries `src`; the licence gate
(tp_licence.py) refuses anything else. No CRC, Perry, Yaws, DIPPR-801, VDI, Landolt, JANAF or NIST SRD tables are read.
"""
from __future__ import annotations

import json
import os
import sys
import time

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import tp_chemsep  # noqa: E402
import tp_constants  # noqa: E402
import tp_licence  # noqa: E402
import tp_nasa  # noqa: E402
import tp_raw  # noqa: E402

FORMAT = 1
HERE = os.path.dirname(os.path.abspath(__file__))
NASA_CAS = os.path.join(HERE, "tp_nasa_cas.json")
SOURCE_FIELDS = ("name", "url", "home", "license", "license_url", "citation")


def _read(source_id: str, name: str, mode: str = "rb", encoding: str | None = None):
    with open(tp_raw.raw_path(source_id, name), mode, encoding=encoding) as fh:
        return fh.read()


def load_chemsep(report: dict) -> dict[str, dict]:
    stats: dict = {}
    out: dict[str, dict] = {}
    for f in ("chemsep1.xml", "chemsep2.xml"):
        blob = _read("chemsep_lite", f)
        report.setdefault("chemsep_headers", {})[f] = tp_chemsep.library_header(blob)
        for c in tp_chemsep.parse(blob, stats):
            if c["cas"] in out:
                stats["duplicate_cas"] = stats.get("duplicate_cas", 0) + 1
                continue
            out[c["cas"]] = c
    report["chemsep"] = {"compounds": len(out), **stats}
    return out


def load_nasa(report: dict) -> dict[str, list[dict]]:
    """CAS → NASA records (gas cp_ig, liquid cp_l) plus their ΔHf(298.15 K) and molar mass as constants."""
    species = {s["name"]: s for s in tp_nasa.parse(_read("nasa_cea", "thermo.inp", "r", "latin-1"))}
    with open(NASA_CAS, encoding="utf-8") as fh:
        pairs = json.load(fh)["pairs"]
    out: dict[str, list[dict]] = {}
    missing = []
    for p in pairs:
        sp = species.get(p["species"])
        rec = tp_nasa.record(sp) if sp else None
        if rec is None:
            missing.append(p["species"])
            continue
        out.setdefault(p["cas"], []).append({**rec, "_mw": sp["mw"], "_name": p.get("name", "")})
    report["nasa"] = {"species_in_file": len(species), "pairs": len(pairs), "records": sum(len(v) for v in out.values()),
                      "cas": len(out), "pairs_without_fit": missing}
    return out


def nasa_constants(recs: list[dict]) -> list[dict]:
    rows = []
    for r in recs:
        key = "Hf_ig" if r["p"] == "cp_ig" else "Hf_l"
        rows.append({"k": key, "v": r["hf298"], "unit": "J/mol", "src": tp_nasa.SOURCE_ID, "ref": r["species"]})
        if not any(x["k"] == "MW" for x in rows):
            rows.append({"k": "MW", "v": r["_mw"], "unit": "g/mol", "src": tp_nasa.SOURCE_ID, "ref": r["species"]})
    return rows


def source_block(registry: dict, used: list[str]) -> dict[str, dict]:
    out = {}
    for sid in used:
        s = tp_raw.source(sid)
        block = {k: s[k] for k in SOURCE_FIELDS if s.get(k)}
        block["retrieved_at"] = tp_raw.retrieved_at(sid)
        if s.get("modified_version_note"):
            block["note"] = s["modified_version_note"]
        if s.get("notice"):
            block["notice"] = s["notice"]
        out[sid] = block
    return out


CURVE_ORDER = ["psat", "psat_antoine", "rho_l", "cp_ig", "cp_l", "hvap", "mu_l", "mu_g", "k_l", "k_g", "sigma"]
SOURCE_ORDER = ["chemsep_lite", "nasa_cea", "coolprop_heos", "wikidata"]


def _curve_key(c: dict) -> tuple:
    return (CURVE_ORDER.index(c["p"]) if c["p"] in CURVE_ORDER else 99, SOURCE_ORDER.index(c["src"]))


def assemble(chemsep: dict, nasa: dict, wikidata: dict, coolprop: dict, registry: dict, today: str) -> dict[str, dict]:
    """Pure: parsed sources → {CAS: tp file object}. A CAS gets a file when it has a curve or a constant."""
    files = {}
    for cas in sorted(set(chemsep) | set(nasa) | set(wikidata) | set(coolprop)):
        cs = chemsep.get(cas)
        curves = list(cs["curves"]) if cs else []
        curves += [{k: v for k, v in r.items() if not k.startswith("_") and k != "hf298"} for r in nasa.get(cas, [])]
        const = (cs["const"] if cs else []) + coolprop.get(cas, []) + wikidata.get(cas, []) + nasa_constants(nasa.get(cas, []))
        if not curves and not const:
            continue
        curves.sort(key=_curve_key)
        name = (cs or {}).get("name") or next((r["_name"] for r in nasa.get(cas, []) if r.get("_name")), "")
        used = [s for s in SOURCE_ORDER if any(x["src"] == s for x in curves + const)]
        obj = {"v": FORMAT, "cas": cas, "name": name, "exported_at": today,
               "smiles": (cs or {}).get("smiles", ""), "const": const, "curves": curves,
               "sources": source_block(registry, used)}
        tp_licence.check_file(obj, registry)
        files[cas] = obj
    return files


def build(out_dir: str | None = None) -> dict:
    registry = tp_raw.registry()
    report: dict = {"built_at": time.strftime("%Y-%m-%d %H:%M")}
    chemsep = load_chemsep(report)
    nasa = load_nasa(report)
    wikidata = tp_constants.wikidata_rows(_read("wikidata", "critical_points.json", "r", "utf-8"))
    coolprop = tp_constants.coolprop_rows(_read("coolprop_heos", "heos_constants.tsv", "r", "utf-8"))
    report["wikidata"] = {"cas": len(wikidata)}
    report["coolprop_heos"] = {"cas": len(coolprop)}
    files = assemble(chemsep, nasa, wikidata, coolprop, registry, time.strftime("%Y-%m-%d"))
    report["files"] = len(files)
    report["files_with_curves"] = sum(1 for f in files.values() if f["curves"])
    report["curves_by_prop"] = {}
    for f in files.values():
        for c in f["curves"]:
            k = f"{c['p']}:{c['src']}"
            report["curves_by_prop"][k] = report["curves_by_prop"].get(k, 0) + 1
    out_dir = out_dir or os.path.join(registry["raw_dir"], "build")
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, "tp_records.json"), "w", encoding="utf-8") as fh:
        json.dump({"v": FORMAT, "built_at": report["built_at"], "files": files}, fh, ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(out_dir, "build_report.json"), "w", encoding="utf-8") as fh:
        json.dump(report, fh, ensure_ascii=False, indent=1)
    return report


def main() -> int:
    report = build()
    print(json.dumps({k: report[k] for k in ("files", "files_with_curves", "chemsep", "nasa", "wikidata", "coolprop_heos")},
                     ensure_ascii=False, default=str)[:2000])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
