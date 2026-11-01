"""United States, NIOSH Pocket Guide to Chemical Hazards (CDC pages npgdNNNN.html) → oel rows: REL (TWA/STEL/C) and IDLH.

Each page has cards "CAS No.", "Exposure Limits" (<h6>NIOSH REL</h6> … <h6>OSHA PEL</h6> …) and "IDLH". Only the
NIOSH REL and IDLH are taken (OSHA PELs come from the eCFR, oel_us_osha.py).
REL text shapes: "TWA 10 ppm (25 mg/m3) ST 15 ppm (37 mg/m3)", "C 5 ppm (20 mg/m3) [15-minute]", "Ca TWA 0.1 ppm ST 1 ppm",
"TWA 10 mg/m3 (total) TWA 5 mg/m3 (resp)", "Dust: TWA 1 mg/m3 … Vapor: TWA 0.22 ppm …", "TWA 0.001 mg Cr(VI)/m3".
The bracketed equivalent "(25 mg/m3)" becomes its own row. "Ca" (potential occupational carcinogen) and "[skin]" go
into every row's notation; "(total)", "(resp)", "Dust:" and the "mg X/m3" basis go into that value's notation.
IDLH: "Ca [500 ppm]", "2500 ppm [10%LEL]", "50 mg/m3 (as Sb)"; "N.D." (not determined) gives no row.
"""
from __future__ import annotations

import os
import re

import oel_raw
from oel_values import cas_list, clean_text, norm_unit, parse_number, qualify_shared_cas, row, scaled

SOURCE_ID = "us_niosh_npg"
JURISDICTION = "US"
_CARD_RE = re.compile(r'<div class="card-title h6">(.*?)</div>\s*<div class="card-body">\s*<div class="card-text">(.*?)</div>', re.S)
_UNIT = r"ppm|ppb|mg/m3|µg/m3|μg/m3|f/cc|fibers/cm3|mppcf|mg (?P<basis>[^/\s]{1,20})/m3"
_VALUE_RE = re.compile(
    rf"(?:(?P<label>Dust|Vapor|Fume|Mist|Total|Respirable)\s*:\s*)?(?P<kind>TWA|ST|C)\s+(?P<num>\d[\d,]*(?:\.\d+)?)\s*(?P<unit>{_UNIT})"
    rf"(?:\s*\(\s*(?P<num2>\d[\d,]*(?:\.\d+)?)\s*(?P<unit2>ppm|mg/m3)\s*\))?(?:\s*\(\s*(?P<qual>total|resp|inhalable|as [^)]+)\s*\))?(?P<min>\s*\[15-minute\])?")
_IDLH_RE = re.compile(r"(?P<num>\d[\d,]*(?:\.\d+)?)\s*(?P<unit>ppm|mg/m3|µg/m3|mg (?P<basis>[^/\s]{1,20})/m3)")
_KIND = {"TWA": "TWA", "ST": "STEL", "C": "C"}
_QUAL = {"total": "total", "resp": "respirable", "inhalable": "inhalable"}


def norm_text(s: str) -> str:
    t = clean_text(s).replace("m 3", "m3").replace("m³", "m3").replace("{", "(").replace("}", ")")
    t = re.sub(r"See Appendix [A-G](?:\s*,\s*Appendix [A-G])*(?:\s*\([^)]*\))?", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def cards(page_html: str) -> dict[str, str]:
    return {clean_text(m.group(1)): m.group(2) for m in _CARD_RE.finditer(page_html)}


def _unit(m_unit: str, basis: str | None) -> tuple[str, float, str | None]:
    if basis:
        return "mg/m3", 1.0, f"as {basis}"
    nu = norm_unit(m_unit)
    if not nu:
        raise ValueError(m_unit)
    return nu[0], nu[1], None


def parse_rel(text: str) -> list[dict]:
    """REL text → [{kind, value, unit, notes}] (notes: list of value-specific qualifiers)."""
    t = re.sub(r"\[\*Note:[^\]]*\]", " ", norm_text(text))
    out, label = [], None
    for m in _VALUE_RE.finditer(t):
        label = m.group("label") or label
        kind = _KIND[m.group("kind")]
        unit, factor, basis = _unit(m.group("unit"), m.group("basis"))
        notes = [x for x in (label and label.lower(), basis, _QUAL.get(m.group("qual") or "", m.group("qual")),
                             "15 min" if m.group("min") else None) if x]
        num = parse_number(m.group("num"))
        out.append({"kind": kind, "value": scaled(num, factor), "unit": unit, "notes": notes})
        if m.group("num2"):
            u2 = norm_unit(m.group("unit2"))
            out.append({"kind": kind, "value": scaled(parse_number(m.group("num2")), u2[1]), "unit": u2[0], "notes": notes})
    return out


def parse_idlh(text: str) -> dict | None:
    t = norm_text(text).split("See:")[0].strip()
    if not t or "N.D." in t and not _IDLH_RE.search(t.replace("N.D.", "")):
        return None
    m = _IDLH_RE.search(t)
    if not m:
        return None
    unit, factor, basis = _unit(m.group("unit"), m.group("basis"))
    notes = [x for x in (basis, *("10% LEL" for _ in re.findall(r"\[10\s*%\s*LEL\]", t)), *re.findall(r"\(\s*(as [^()]*(?:\([^)]*\))?[^()]*?)\s*\)", t)) if x]
    return {"kind": "IDLH", "value": scaled(parse_number(m.group("num")), factor), "unit": unit, "notes": notes}


def page_rows(page_html: str) -> tuple[str, list[dict]]:
    """One NPG page → (agent name, rows)."""
    c = cards(page_html)
    title = re.search(r"<title>(.*?)</title>", page_html, re.S)
    name = clean_text(title.group(1)).split(" - ")[-1] if title else ""
    cas = cas_list(clean_text(c.get("CAS No.", "")))
    limits = c.get("Exposure Limits", "")
    rel_m = re.search(r"<h6>NIOSH REL</h6>(.*?)(?:<h6>|$)", limits, re.S)
    rel_text = norm_text(rel_m.group(1)) if rel_m else ""
    flags = [f for f, ok in (("Ca", bool(re.match(r"^Ca\b", rel_text))), ("skin", "[skin]" in rel_text)) if ok]
    values = parse_rel(rel_text)
    idlh = parse_idlh(c.get("IDLH", ""))
    if idlh:
        values.append({**idlh, "notes": (["Ca"] if norm_text(c.get("IDLH", "")).startswith("Ca") else []) + idlh["notes"]})
    rows = []
    for v in values:
        base = flags if v["kind"] != "IDLH" else []
        note = ", ".join(dict.fromkeys(base + v["notes"])) or None
        rows += [row(x, JURISDICTION, v["kind"], v["value"], v["unit"], note) for x in cas]
    return name, rows


def parse() -> tuple[list[dict], dict]:
    manifest = oel_raw.read_manifest(SOURCE_ID)
    pages = sorted(n for n in manifest["files"] if n.startswith("npgd") and n.endswith(".html.gz"))
    agents, no_cas, no_value = [], 0, 0
    for name in pages:
        if not os.path.exists(oel_raw.raw_path(SOURCE_ID, name)):
            continue
        agent, rows = page_rows(oel_raw.read_file(SOURCE_ID, name).decode("utf-8"))
        if not rows:
            no_value += 1
            continue
        agents.append((agent or name, rows))
    rows = qualify_shared_cas(agents)
    return rows, {"pages": len(pages), "no_value": no_value, "rows": len(rows), "cas": len({r["cas"] for r in rows}),
                  "idlh": sum(1 for r in rows if r["kind"] == "IDLH")}
