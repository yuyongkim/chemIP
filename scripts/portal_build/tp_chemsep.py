"""ChemSep LITE databank XML (chemsep1.xml, chemsep2.xml) → constants and temperature-dependent correlation records.

Pure parser: bytes in, plain dicts out. Coefficients are copied unchanged; `f` is the factor that takes the ChemSep unit
(kmol based) to the record unit (mol based), so value = f × form(T, coefficients). Equation numbers are ChemSep's
(Kooijman & Taylor, The ChemSep Book, 2nd ed. 2006, App. "Temperature dependent property correlations"); 1–5 are the
same polynomial as 100. Forms the browser cannot evaluate (tp_forms.jsx TP_FORMS) are dropped and counted.
"""
from __future__ import annotations

import re
import xml.etree.ElementTree as ET

SOURCE_ID = "chemsep_lite"
CAS_RE = re.compile(r"^\d{2,7}-\d{2}-\d$")

# ChemSep element → (record prop, record unit, factor from the ChemSep unit)
CURVES = {
    "VaporPressure": ("psat", "Pa", 1.0),
    "AntoineVaporPressure": ("psat_antoine", "Pa", 1.0),
    "LiquidDensity": ("rho_l", "mol/m3", 1000.0),
    "HeatOfVaporization": ("hvap", "J/mol", 1e-3),
    "LiquidHeatCapacityCp": ("cp_l", "J/mol/K", 1e-3),
    "IdealGasHeatCapacityCp": ("cp_ig", "J/mol/K", 1e-3),
    "LiquidViscosity": ("mu_l", "Pa*s", 1.0),
    "VaporViscosity": ("mu_g", "Pa*s", 1.0),
    "LiquidThermalConductivity": ("k_l", "W/m/K", 1.0),
    "VaporThermalConductivity": ("k_g", "W/m/K", 1.0),
    "SurfaceTension": ("sigma", "N/m", 1.0),
}
# ChemSep element → (constant key, unit, factor)
CONSTANTS = {
    "CriticalTemperature": ("Tc", "K", 1.0),
    "CriticalPressure": ("Pc", "Pa", 1.0),
    "CriticalVolume": ("Vc", "m3/mol", 1e-3),
    "CriticalCompressibility": ("Zc", "-", 1.0),
    "AcentricityFactor": ("omega", "-", 1.0),
    "NormalBoilingPointTemperature": ("Tb", "K", 1.0),
    "NormalMeltingPointTemperature": ("Tm", "K", 1.0),
    "TriplePointTemperature": ("Tt", "K", 1.0),
    "TriplePointPressure": ("Pt", "Pa", 1.0),
    "MolecularWeight": ("MW", "g/mol", 1.0),
    "HeatOfFormation": ("Hf_ig", "J/mol", 1e-3),
    "GibbsEnergyOfFormation": ("Gf_ig", "J/mol", 1e-3),
    "AbsEntropy": ("S_ig", "J/mol/K", 1e-3),
}
EQ_ALIAS = {1: 100, 2: 100, 3: 100, 4: 100, 5: 100, 207: 10}   # same expression
SUPPORTED_EQ = {10, 11, 12, 13, 14, 15, 16, 17, 100, 101, 102, 103, 104, 105, 106, 107, 114, 115, 116, 120, 121}
NEEDS_TC = {106, 114, 116}
LETTERS = "ABCDE"


def _num(text: str | None) -> float | None:
    try:
        v = float(text)
    except (TypeError, ValueError):
        return None
    return v if v == v and abs(v) != float("inf") else None


def _attr(el: ET.Element | None, key: str = "value") -> str | None:
    return el.get(key) if el is not None else None


def parse_curve(el: ET.Element, tc: float | None) -> tuple[dict | None, str]:
    """One correlation element → (record or None, reason)."""
    eq = _num(_attr(el.find("eqno")))
    if eq is None:
        return None, "no eqno"
    eq = EQ_ALIAS.get(int(eq), int(eq))
    if eq not in SUPPORTED_EQ:
        return None, f"eq{eq} unsupported"
    coeffs = []
    for letter in LETTERS:
        v = _num(_attr(el.find(letter)))
        coeffs.append(v if v is not None else 0.0)
    while len(coeffs) > 1 and coeffs[-1] == 0.0:
        coeffs.pop()
    tmin, tmax = _num(_attr(el.find("Tmin"))), _num(_attr(el.find("Tmax")))
    if tmin is None or tmax is None or not (0 < tmin < tmax):
        return None, "bad T range"
    rec = {"form": f"eq{eq}", "c": coeffs, "Tmin": tmin, "Tmax": tmax}
    if eq in NEEDS_TC:
        if not tc:
            return None, "needs Tc"
        rec["Tc"] = tc
    return rec, "ok"


def parse_compound(el: ET.Element, stats: dict) -> dict | None:
    cas = (_attr(el.find("CAS")) or "").strip()
    if not CAS_RE.match(cas):
        stats["bad_cas"] = stats.get("bad_cas", 0) + 1
        return None
    consts = []
    tc = None
    for tag, (key, unit, f) in CONSTANTS.items():
        v = _num(_attr(el.find(tag)))
        if v is None:
            continue
        if key == "Tc":
            tc = v
        consts.append({"k": key, "v": v * f, "unit": unit, "src": SOURCE_ID})
    curves = []
    for tag, (prop, unit, f) in CURVES.items():
        node = el.find(tag)
        if node is None:
            continue
        rec, why = parse_curve(node, tc)
        if rec is None:
            stats.setdefault("dropped", {}).setdefault(f"{prop}: {why}", 0)
            stats["dropped"][f"{prop}: {why}"] += 1
            continue
        curves.append({"p": prop, **rec, "unit": unit, "f": f, "src": SOURCE_ID})
    return {
        "cas": cas,
        "name": (_attr(el.find("CompoundID")) or "").strip(),
        "formula": (_attr(el.find("StructureFormula")) or "").strip(),
        "smiles": (_attr(el.find("SMILES")) or "").strip(),
        "const": consts,
        "curves": curves,
    }


def parse(xml_bytes: bytes, stats: dict | None = None) -> list[dict]:
    """One ChemSep XML file → compound dicts (valid CAS only)."""
    stats = stats if stats is not None else {}
    text = xml_bytes.decode("utf-8", errors="replace")
    # the distributed files hold a few stray "<" inside attribute values (e.g. a SMILES ending in "<"): escape them
    text = re.sub(r'="([^"]*)"', lambda m: '="' + m.group(1).replace("<", "&lt;") + '"', text)
    root = ET.fromstring(text)
    out = []
    for el in root.iter("compound"):
        c = parse_compound(el, stats)
        if c:
            out.append(c)
    return out


def library_header(xml_bytes: bytes) -> str:
    """The `library` attribute (version + copyright + licence link) of a ChemSep XML file."""
    m = re.search(rb'library="([^"]*)"', xml_bytes[:2000])
    return m.group(1).decode("utf-8", errors="replace") if m else ""
