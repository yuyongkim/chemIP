"""Name handling shared by the transport lists (ship DGL, marine NLS).

Transport entries name a substance together with its state/concentration
("포름알데히드수용액(인화성인 것)", "AMMONIA, ANHYDROUS", "Benzene and mixtures having
10% benzene or more"). When the full printed name has no exact DB match, the base
substance is derived by fixed, documented rules only (drop parenthetical qualifiers,
drop a trailing 수용액/용액, cut the English name at the first comma or qualifier word)
and then matched exactly in terminology.db. The entry is labelled with the role
(solution_of / mixtures_of / qualified_entry) so it is never mistaken for the pure substance.
"""
from __future__ import annotations

import re

from kr_env import termdb

_PAREN = re.compile(r"\s*\([^()]*\)")
_KO_SOLUTION = re.compile(r"\s*(?:수용액|용액)$")
_KO_MIXTURE = re.compile(r"^(?P<x>.+?)\s*및\s*(?P=x)(?:이|가)?\s.*혼합물$")
_EN_MIXTURE = re.compile(r"^(?P<x>.+?)\s+and\s+mixtures\b", re.I)
_EN_CUT = re.compile(r",|\s(?:solution|aqueous|with|dry|wetted|stabilized|stabilised|containing|"
                     r"not\s|more\s|less\s|having|in\s|or\s)", re.I)
_NO_DERIVE = re.compile(r"이성질체|isomers|별도의 품명|N\.O\.S|n\.o\.s", re.I)

# Names that denote groups / articles / mixtures rather than one substance.
FAMILY_PATTERN = re.compile(
    r"이성질체|isomers|혼합물|mixture|\(C\d|C\d+\s*-\s*C\d+|C\d+\+|중합체|polymer|N\.O\.S|n\.o\.s|"
    r"별도의 품명|화합물|compound|류$|오일|\boil\b|distillate|추출물|extract|용제|solvent|석유|petroleum|"
    r"알킬|alkyl|알케닐|alkenyl|aryl|탄화수소|hydrocarbon|에스테르류|esters\b|염류|salts\b", re.I)


def strip_markers(name: str) -> str:
    """Drop footnote markers like '(*)', '(i)', '(ii)', '(†)' printed after names."""
    return re.sub(r"\s*\((?:\*+|i{1,3}|iv|v|vi{0,3}|†|‡)\)\s*$", "", name or "").strip()


def base_names(ko: str, en: str | None) -> tuple[str | None, str | None, str | None]:
    """(base_ko, base_en, role) or (None, None, None) when no rule applies."""
    if _NO_DERIVE.search(ko or "") or _NO_DERIVE.search(en or ""):
        return None, None, None
    role = "qualified_entry"
    k = (ko or "").strip()
    m = _KO_MIXTURE.match(_PAREN.sub("", k).strip())
    if m:
        k, role = m.group("x").strip(), "mixtures_of"
    else:
        k = _PAREN.sub("", k).strip()
        if _KO_SOLUTION.search(k):
            k, role = _KO_SOLUTION.sub("", k).strip(), "solution_of"
    e = (en or "").strip()
    me = _EN_MIXTURE.match(e)
    if me:
        e = me.group("x").strip()
        role = "mixtures_of"
    else:
        e = _PAREN.sub("", e).strip()
        if re.search(r"\b(?:solution|aqueous)\b", e, re.I) and role == "qualified_entry":
            role = "solution_of"
        e = _EN_CUT.split(e, 1)[0].strip()
    if (k == (ko or "").strip()) and (e == (en or "").strip()):
        return None, None, None
    return (k or None), (e or None), role


def match_base(ko: str, en: str | None) -> dict | None:
    """Exact DB match of the derived base name; None when no rule applies or no unique match."""
    bk, be, role = base_names(ko, en)
    if not bk and not be:
        return None
    r = termdb.match_name(bk or be, [be] if (bk and be) else None)
    if r["status"] != "matched":
        return None
    return {"cas": r["cas"], "matched_name": r["matched_name"], "via": r["via"], "role": role,
            "base_name_ko": bk, "base_name_en": be}
