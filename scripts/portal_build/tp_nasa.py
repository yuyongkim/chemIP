"""NASA CEA thermo.inp (NASA-9 polynomials, McBride, Zehe & Gordon 2002, NASA/TP-2002-211556) → species records.

Pure parser: text in, dicts out. Fixed format of each species (TP-2002-211556, App. A):
  line 1  name (first token of cols 1-24), comments
  line 2  n intervals (I2), date code, formula (5 × A2,F6.2), phase (I2: 0 = gas), molar mass (F13.5), ΔHf(298.15 K) J/mol (F15.3)
  per interval: Tlow, Thigh (2F11.3), n coeffs, T exponents (−2 … 4), H(298.15)−H(0)
                then a1…a5 (5D16.8) and a6, a7, (blank), b1, b2 (D16.8)
  Cp/R = a1 T⁻² + a2 T⁻¹ + a3 + a4 T + a5 T² + a6 T³ + a7 T⁴; H/RT and S/R add b1, b2 (evaluator: tp_forms.jsx "nasa9").
Species → CAS is not in the file; it comes from tp_nasa_cas.json (reviewed list, tp_nasa_map.py makes the candidates).
"""
from __future__ import annotations

import re

SOURCE_ID = "nasa_cea"
_NUM = re.compile(r"[DdEe]")


def _f(s: str) -> float:
    s = s.strip()
    return float(_NUM.sub("E", s)) if s else 0.0


def _formula(field: str) -> dict[str, float]:
    out: dict[str, float] = {}
    for i in range(0, 40, 8):
        el = field[i:i + 2].strip()
        n = field[i + 2:i + 8].strip()
        if el and n and float(n) != 0.0:
            key = el.capitalize() if el != "E" else "e"
            out[key] = out.get(key, 0.0) + float(n)
    return out


def parse(text: str) -> list[dict]:
    """thermo.inp text → [{name, comment, formula, phase, mw, hf298, intervals: [{Tmin, Tmax, a: [7], b: [2]}]}]."""
    lines = [ln.rstrip("\n").rstrip("\r") for ln in text.splitlines() if not ln.startswith("!")]
    try:
        i = next(k for k, ln in enumerate(lines) if ln.strip().lower() == "thermo") + 2
    except StopIteration:
        return []
    out = []
    while i + 1 < len(lines):
        head = lines[i]
        if head.startswith("END"):
            i += 1
            continue
        line2 = lines[i + 1].ljust(80)
        try:
            n_int = int(line2[0:2])
            phase = int(line2[50:52])
            mw = _f(line2[52:65])
            hf = _f(line2[65:80])
        except ValueError:
            i += 1
            continue
        sp = {"name": head[:24].split()[0] if head.strip() else "", "comment": head[18:].strip(),
              "formula": _formula(line2[10:50]), "phase": phase, "mw": mw, "hf298": hf, "intervals": []}
        j = i + 2
        if n_int == 0:
            j += 1   # a single "T, H" line for species with no Cp fit
        for _ in range(n_int):
            t = lines[j].ljust(80)
            c1, c2 = lines[j + 1].ljust(80), lines[j + 2].ljust(80)
            a = [_f(c1[k:k + 16]) for k in range(0, 80, 16)] + [_f(c2[0:16]), _f(c2[16:32])]
            b = [_f(c2[48:64]), _f(c2[64:80])]
            sp["intervals"].append({"Tmin": _f(t[0:11]), "Tmax": _f(t[11:22]), "a": a, "b": b})
            j += 3
        out.append(sp)
        i = j
    return out


def hill(formula: dict[str, float]) -> str:
    """Hill-order formula string (C, H first, then alphabetical); "" for ions / electrons."""
    if "e" in formula or any(abs(n - round(n)) > 1e-6 for n in formula.values()):
        return ""
    keys = sorted(formula, key=lambda e: (0, "") if e == "C" else (1, "") if e == "H" and "C" in formula else (2, e))
    return "".join(f"{e}{int(round(formula[e])) if round(formula[e]) != 1 else ''}" for e in keys)


def record(sp: dict) -> dict | None:
    """Species with ≥1 interval → one curve record (gas → cp_ig, "(L)" liquid → cp_l)."""
    if not sp["intervals"]:
        return None
    if sp["phase"] == 0:
        prop = "cp_ig"
    elif sp["name"].endswith("(L)"):
        prop = "cp_l"
    else:
        return None
    ivs = sorted(sp["intervals"], key=lambda iv: iv["Tmin"])
    return {"p": prop, "form": "nasa9", "intervals": ivs, "Tmin": ivs[0]["Tmin"], "Tmax": ivs[-1]["Tmax"],
            "unit": "J/mol/K", "f": 1.0, "hf298": sp["hf298"], "species": sp["name"], "src": SOURCE_ID}
