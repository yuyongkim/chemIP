"""Cross-check fixture for the Joback calculator (calc_joback*.jsx): an independent implementation on many molecules.

    E:/dev-cache/tp-venv/Scripts/python -B G:\\MSDS\\scripts\\portal_build\\joback_crosscheck.py

For every SMILES in the ChemSep LITE databank (data/portal_raw/tp/chemsep_lite/*.xml), thermo.group_contribution.Joback
(Caleb Bell, MIT; RDKit SMARTS fragmentation by J. Biggs) gives the group counts and its fragmentation status, and the
Joback & Reid (1987) estimates from those counts. Only thermo's code is used, no data of `chemicals` / `thermo`.
Output: frontend/scripts/tests/fixtures/joback_crosscheck.json (read by test_calculators.cjs, tagged [calc]).
"""
from __future__ import annotations

import json
import os
import sys

sys.dont_write_bytecode = True
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
PROJECT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(PROJECT, "frontend", "scripts", "tests", "fixtures", "joback_crosscheck.json")
CODES = {1: "CH3", 2: "CH2", 3: "CH", 4: "C", 5: "=CH2", 6: "=CH", 7: "=C", 8: "=C=", 9: "#CH", 10: "#C", 11: "rCH2", 12: "rCH",
         13: "rC", 14: "r=CH", 15: "r=C", 16: "F", 17: "Cl", 18: "Br", 19: "I", 20: "OH", 21: "ArOH", 22: "O", 23: "rO", 24: "C=O",
         25: "rC=O", 26: "CHO", 27: "COOH", 28: "COO", 29: "=O", 30: "NH2", 31: "NH", 32: "rNH", 33: "N", 34: "-N=", 35: "r-N=",
         36: "=NH", 37: "CN", 38: "NO2", 39: "SH", 40: "S", 41: "rS"}


def main() -> int:
    from rdkit import Chem, RDLogger  # noqa: PLC0415
    from thermo.group_contribution.joback import Joback  # noqa: PLC0415
    import tp_chemsep  # noqa: PLC0415
    import tp_raw  # noqa: PLC0415
    RDLogger.DisableLog("rdApp.*")
    out = []
    for f in ("chemsep1.xml", "chemsep2.xml"):
        with open(tp_raw.raw_path("chemsep_lite", f), "rb") as fh:
            for c in tp_chemsep.parse(fh.read()):
                smi = c["smiles"]
                if not smi or "." in smi or Chem.MolFromSmiles(smi) is None:
                    continue
                try:
                    j = Joback(smi)
                except Exception:  # noqa: BLE001
                    continue
                if j.status != "OK":
                    continue
                est = j.estimate(callables=False)
                atoms = Chem.AddHs(Chem.MolFromSmiles(smi)).GetNumAtoms()
                out.append({"cas": c["cas"], "smiles": smi, "counts": {CODES[k]: v for k, v in j.counts.items()}, "atoms": atoms,
                            "est": {k: est[k] for k in ("Tb", "Tc", "Pc", "Vc", "Hf", "Gf", "Tm", "Hvap", "Hfus")},
                            "cp_coeffs": est["Cpig_coeffs"]})
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    import thermo  # noqa: PLC0415
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump({"_comment": __doc__.strip().splitlines()[0], "thermo_version": thermo.__version__, "cases": out}, fh, indent=0)
    print(len(out))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
