"""Cross-check fixture for the browser evaluators (tp_forms.jsx): the same records evaluated by an independent implementation.

    E:/dev-cache/tp-venv/Scripts/python -B G:\\MSDS\\scripts\\portal_build\\tp_crosscheck.py

Reads data/portal_raw/tp/build/tp_records.json and, for up to PER_FORM records of every ChemSep form, evaluates them at
Tmin, the middle and Tmax with Caleb Bell's `chemicals` (MIT code; chemicals.dippr EQ100–EQ116, Chemsep_16; only its
functions are used, none of its data). Forms that chemicals has no function for are written out here from the ChemSep Book
expressions. NASA-9: H(298.15 K) must equal the file's ΔHf(298.15 K) (b1 is fitted to that), a self-consistency check.
Output: frontend/scripts/tests/fixtures/tp_crosscheck.json (read by test_tp.cjs, tagged [calc]).
"""
from __future__ import annotations

import json
import math
import os
import sys

sys.dont_write_bytecode = True
HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT = os.path.dirname(os.path.dirname(HERE))
RECORDS = os.path.join(PROJECT, "data", "portal_raw", "tp", "build", "tp_records.json")
OUT = os.path.join(PROJECT, "frontend", "scripts", "tests", "fixtures", "tp_crosscheck.json")
PER_FORM = 40


def reference(rec: dict, T: float) -> float | None:
    from chemicals import dippr  # noqa: PLC0415
    from chemicals.thermal_conductivity import Chemsep_16  # noqa: PLC0415
    c = list(rec["c"]) + [0.0] * (5 - len(rec["c"]))
    A, B, C, D, E = c
    form = rec["form"]
    if form == "eq100":
        y = dippr.EQ100(T, A, B, C, D, E)
    elif form == "eq101":
        y = dippr.EQ101(T, A, B, C, D, E)
    elif form == "eq102":
        y = dippr.EQ102(T, A, B, C, D)
    elif form == "eq104":
        y = dippr.EQ104(T, A, B, C, D, E)
    elif form == "eq105":
        y = dippr.EQ105(T, A, B, C, D)
    elif form == "eq106":
        y = dippr.EQ106(T, rec["Tc"], A, B, C, D, E)
    elif form == "eq107":
        y = dippr.EQ107(T, A, B, C, D, E)
    elif form == "eq114":
        y = dippr.EQ114(T, rec["Tc"], A, B, C, D)
    elif form == "eq115":
        y = dippr.EQ115(T, A, B, C, D, E)
    elif form == "eq116":
        y = dippr.EQ116(T, rec["Tc"], A, B, C, D, E)
    elif form == "eq16":
        y = Chemsep_16(T, A, B, C, D, E)
    elif form == "eq10":
        y = math.exp(A - B / (T + C))
    elif form == "eq120":
        y = A - B / (T + C)
    elif form == "eq121":
        y = A + B / T + C * math.log(T) + D * T ** E
    else:
        return None
    return y * rec.get("f", 1.0)


def main() -> int:
    with open(RECORDS, encoding="utf-8") as fh:
        files = json.load(fh)["files"]
    cases, per_form, nasa = [], {}, []
    for cas, f in files.items():
        for i, rec in enumerate(f["curves"]):
            if rec["form"] == "nasa9":
                hf = next((r["v"] for r in f["const"] if r["src"] == "nasa_cea" and r.get("ref") == rec["species"]), None)
                if hf is not None and rec["Tmin"] <= 298.15 <= rec["Tmax"] and len(nasa) < 400:
                    nasa.append({"cas": cas, "i": i, "species": rec["species"], "hf298": hf})
                continue
            if per_form.get(rec["form"], 0) >= PER_FORM:
                continue
            temps = [rec["Tmin"], (rec["Tmin"] + rec["Tmax"]) / 2, rec["Tmax"]]
            vals = [reference(rec, T) for T in temps]
            if any(v is None or not math.isfinite(v) for v in vals):
                continue
            per_form[rec["form"]] = per_form.get(rec["form"], 0) + 1
            cases += [{"cas": cas, "i": i, "p": rec["p"], "form": rec["form"], "T": T, "y": v} for T, v in zip(temps, vals)]
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    import chemicals  # noqa: PLC0415
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump({"_comment": __doc__.strip().splitlines()[0], "chemicals_version": chemicals.__version__,
                   "per_form": per_form, "cases": cases, "nasa_h298": nasa}, fh, indent=0)
    print(per_form, len(cases), len(nasa))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
