"""Entry point: emergency exposure guidelines per CAS → static v1/el/<CAS>.json (gzip bytes) + v1/el/index.json.

    python -I -B G:\\MSDS\\scripts\\portal_build\\emergency_limits.py [--out <dir>]

Fetch first: el_fetch.py (EPA AEGL pages, DOE PAC Rev. 29 workbook, RIVM probit pages → data/portal_raw/el/).
Each file joins three public sources for one CAS (format: scripts/static_export/CONTRACT.md "el/<CAS>.json"):
  aegl    EPA AEGL-1/2/3 at 10 min, 30 min, 60 min, 4 h, 8 h          (el_aegl.py)
  pac     DOE PAC-1/2/3 Rev. 29 (60 min) and their basis               (el_pac.py)
  erpg    the PAC tiers DOE based on an AIHA ERPG — values only, "via DOE PAC Rev. 29"
  probit  RIVM lethal probit a, b, n (mg/m3, min) when RIVM has one   (el_rivm.py)
Stale files from an earlier run are removed first. Report: data/portal_raw/el/build_report.json.
Reference values for emergency planning; the files carry no compliance judgement.
"""
from __future__ import annotations

import argparse
import gzip
import json
import os
import sys
import time

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import el_aegl  # noqa: E402
import el_config as C  # noqa: E402
import el_pac  # noqa: E402
import el_rivm  # noqa: E402


def retrieved(sid: str) -> str:
    path = os.path.join(C.raw_dir(sid), C.MANIFEST)
    if not os.path.exists(path):
        return ""
    with open(path, encoding="utf-8") as fh:
        files = json.load(fh)["files"]
    return max((f.get("retrieved_at", "") for f in files.values()), default="")


def sources_block() -> dict:
    return {sid: {**s, "retrieved_at": retrieved(sid)} for sid, s in C.SOURCES.items()}


def aegl_part(rec: dict | None) -> dict | None:
    if not rec:
        return None
    out = {"status": rec["status"], "unit": rec["unit"], "times": C.AEGL_TIMES, "v": rec["v"], "f": rec["f"],
           "page": rec["page"], "tsd": rec.get("tsd", "")}
    for k in ("mg", "lel"):
        if rec.get(k):
            out[k] = rec[k]
    return out


def pac_part(rec: dict | None) -> dict | None:
    if not rec:
        return None
    return {"rev": "29", "unit": rec["unit"], "v": rec["pac"], "f": rec["flag"], "mg": rec["mg"], "basis": rec["basis"],
            "tiers": rec["tiers"]}


def erpg_part(rec: dict | None) -> dict | None:
    """The ERPG tiers DOE reproduces (values only, unit of the PAC row). None when no tier is ERPG-based."""
    if not rec or "ERPG" not in rec["tiers"]:
        return None
    return {"unit": rec["unit"], "v": [v if t == "ERPG" else None for v, t in zip(rec["pac"], rec["tiers"])],
            "via": "doe_pac_rev29", "surrogate": rec["basis"].lower().startswith("used ")}


def probit_part(rec: dict | None) -> dict | None:
    if not rec:
        return None
    return {k: rec[k] for k in ("a", "b", "n", "status", "established", "page", "doc")} | {"c_unit": "mg/m3", "t_unit": "min"}


def build_file(cas: str, aegl: dict | None, pac: dict | None, rivm: dict | None, today: str) -> dict:
    """One el/<CAS>.json object (pure)."""
    name = (aegl or {}).get("name") or (pac or {}).get("name") or ""
    used = [sid for sid, part in (("epa_aegl", aegl), ("doe_pac_rev29", pac), ("rivm_probit", rivm)) if part]
    return {"v": C.FORMAT, "cas": cas, "name": name, "exported_at": today, "mw": (pac or {}).get("mw"),
            "aegl": aegl_part(aegl), "pac": pac_part(pac), "erpg": erpg_part(pac), "probit": probit_part(rivm),
            "src": used}


def write_gzip(path: str, obj) -> int:
    data = gzip.compress(json.dumps(obj, ensure_ascii=False, separators=(",", ":")).encode("utf-8"), 9, mtime=0)
    with open(path, "wb") as fh:
        fh.write(data)
    return len(data)


def build(out: str | None = None, log=print) -> dict:
    out = out or C.out_dir()
    aegl, s_aegl = el_aegl.parse()
    pac, s_pac = el_pac.parse()
    rivm, s_rivm = el_rivm.parse()
    today = time.strftime("%Y-%m-%d")
    os.makedirs(out, exist_ok=True)
    for f in os.listdir(out):
        if f.endswith(".json"):
            os.remove(os.path.join(out, f))
    cas_all = sorted(set(aegl) | set(pac) | set(rivm))
    total = 0
    for cas in cas_all:
        total += write_gzip(os.path.join(out, f"{cas}.json"), build_file(cas, aegl.get(cas), pac.get(cas), rivm.get(cas), today))
    counts = {"aegl": len(aegl), "pac": len(pac), "erpg": sum("ERPG" in r["tiers"] for r in pac.values()), "probit": len(rivm)}
    index = {"v": C.FORMAT, "exported_at": today, "count": len(cas_all), "counts": counts, "sources": sources_block(),
             "cas": cas_all}
    write_gzip(os.path.join(out, C.INDEX_FILE), index)
    report = {"built_at": time.strftime("%Y-%m-%d %H:%M"), "out": out, "files": len(cas_all), "gzip_bytes": total,
              "counts": counts, "aegl": s_aegl, "pac": s_pac, "rivm": s_rivm}
    os.makedirs(C.RAW_DIR, exist_ok=True)
    with open(os.path.join(C.RAW_DIR, "build_report.json"), "w", encoding="utf-8") as fh:
        json.dump(report, fh, ensure_ascii=False, indent=1)
    log(f"el: {len(cas_all)} files ({total:,} gzip bytes) → {out}; {counts}")
    return report


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="")
    args = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    build(args.out or None)


if __name__ == "__main__":
    main()
