"""Reactive classes of one substance for the storage compatibility matrix (pure functions; rules in
safety_rules/compat_rules.json). Each class is (system, class_code, basis):

  kr   위험물안전관리법 유별 1-6, from KOSHA MSDS §15 O06 ("6류 질산 (300kg)")             basis "s15:<text>"
  un   UN transport hazard class, from KOSHA MSDS §14 N06 ("8", "5.1")                    basis "s14:<text>"
  ghs  reactive group, from GHS hazard entries (ghs_parse) of §2 or CLP Annex VI          basis "<entry>" ("ox_liq:1")
       acid/base split of a corrosive: §9 pH (I08) first, then the substance name         basis "ph:<v>" / "name"
       AG / WT from Annex VI supplemental statements EUH031·EUH032 / EUH029               basis "<EUH code>"

The browser derives the same classes for a substance that is not in g/reactive_class.json
(frontend/public/chemip/compat_core.jsx); tests/fixtures/safety_parse_cases.json keeps both in step.
"""
from __future__ import annotations

import re

import safety_rules

_KR_RE = re.compile(r"(?:제\s*)?([1-6])\s*류")
_UN_RE = re.compile(r"^\s*(\d(?:\.\d)?)")
_PH_RE = re.compile(r"(?<![\d.])(\d{1,2}(?:\.\d+)?)")


def kr_classes(s15_o06: str | None, rules: dict | None = None) -> list[tuple[str, str]]:
    """§15 위험물안전관리법 text -> [(class, basis)]. "해당없음" -> []. "N류" first; a text that names only the
    품명 ("제1석유류 비수용성액체") gets its class from the 품명 keywords of compat_rules.json (kr.item_keywords)."""
    rules = rules or safety_rules.compat()
    text = (s15_o06 or "").strip()
    if not text or text.startswith(("해당없음", "비위험물")):
        return []
    out = []
    for m in _KR_RE.finditer(text):
        code = m.group(1)
        if code not in [c for c, _ in out]:
            out.append((code, f"s15:{text[:60]}"))
    if not out:
        for code, words in rules["systems"]["kr"]["item_keywords"].items():
            if any(w in text for w in words):
                out.append((code, f"s15:{text[:60]}"))
                break
    return out


_UN_TOKEN_RE = re.compile(r"(?<![\d.])(\d(?:\.\d)?)")


def un_class(s14_n06: str | None, rules: dict | None = None) -> list[tuple[str, str]]:
    """§14 transport hazard class text -> [(class, basis)]: the primary class, then subsidiary classes
    ("8(부위험성 6.1)", "3/6.1"). Division letters ("1.1D") fold to class 1; "9(M7)" is 9."""
    rules = rules or safety_rules.compat()
    text = (s14_n06 or "").strip()
    if not _UN_RE.match(text):
        return []
    known = rules["systems"]["un"]["classes"]
    out: list[tuple[str, str]] = []
    for m in _UN_TOKEN_RE.finditer(text):
        code = m.group(1)
        if code.startswith("1."):
            code = "1"
        if code not in known:
            continue
        if code not in [c for c, _ in out]:
            out.append((code, f"s14:{text[:30]}" + ("" if not out else " (sub)")))
    return out


def ph_value(s9_i08: str | None) -> float | None:
    """§9 pH text ("14 (20℃ 농도 50g/L)", "1-2") -> the first number when it is a plausible pH (0-14)."""
    m = _PH_RE.search(s9_i08 or "")
    if not m:
        return None
    v = float(m.group(1))
    return v if 0 <= v <= 14 else None


def _matches(entry: str, wanted: list[str]) -> bool:
    key, cat = entry.rstrip("*").split(":")
    return key in wanted or f"{key}:{cat}" in wanted


def ghs_groups(hazards: list[str], names: list[str], ph: float | None, euh: list[str] | None = None,
               rules: dict | None = None) -> list[tuple[str, str]]:
    """GHS hazard entries (+ names, pH, EUH codes) -> [(group, basis)] in rule order."""
    rules = rules or safety_rules.compat()
    sysr = rules["systems"]["ghs"]
    out: list[tuple[str, str]] = []
    for group, wanted in sysr["from_hazards"].items():
        hit = next((h for h in hazards if _matches(h, wanted)), None)
        if hit:
            out.append((group, hit.rstrip("*")))
    for group, codes in sysr["from_supplemental"].items():
        hit = next((c for c in (euh or []) if c in codes), None)
        if hit:
            out.append((group, hit))
    if any(g == "CO" for g, _ in out):
        ab = acid_or_base(names, ph, rules)
        if ab:
            out = [(ab[0], ab[1]) if g == "CO" else (g, b) for g, b in out]
    return out


def acid_or_base(names: list[str], ph: float | None, rules: dict | None = None) -> tuple[str, str] | None:
    """A corrosive substance -> ("AC", basis) / ("BA", basis) / None (stays CO)."""
    rules = rules or safety_rules.compat()
    ab = rules["systems"]["ghs"]["acid_base"]
    if ph is not None:
        if ph <= ab["ph_acid_max"]:
            return ("AC", f"ph:{ph:g}")
        if ph >= ab["ph_base_min"]:
            return ("BA", f"ph:{ph:g}")
    acid = re.compile(ab["acid_name"], re.I)
    base = re.compile(ab["base_name"], re.I)
    for n in names:
        n = (n or "").strip()
        if not n:
            continue
        if base.search(n):
            return ("BA", "name")
        if acid.search(n):
            return ("AC", "name")
    return None


def substance_classes(*, hazards: list[str], names: list[str], ph: float | None, s14_n06: str | None,
                      s15_o06: str | None, euh: list[str] | None = None) -> list[tuple[str, str, str]]:
    """Every reactive class of one substance: [(system, class_code, basis)]."""
    out = [("kr", c, b) for c, b in kr_classes(s15_o06)]
    out += [("un", c, b) for c, b in un_class(s14_n06)]
    out += [("ghs", g, b) for g, b in ghs_groups(hazards, names, ph, euh)]
    return out
