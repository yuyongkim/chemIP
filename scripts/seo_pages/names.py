"""Display names, alternate names and index initials for a substance. Pure functions."""
from __future__ import annotations

import re

import config

_HANGUL = re.compile(r"[가-힣]")
_LATIN = re.compile(r"[A-Za-z]")
# KOSHA names look like "벤젠 (Benzene)", "m-크레졸 ( 관용명 : 메타-크레졸 )", "A; B" or plain "비스 (2-클로로에틸) 에테르".
# Cut at the first parenthesis that opens an English name (3+ Latin letters) or a 관용명 note, or at ';'.
# A Roman-numeral oxidation state such as "(III)" is part of the Korean name ("크롬(III)", "코발트 (III) 산화물").
_KOSHA_CUT = re.compile(r"\s*\(\s*(?:관용명|(?![IVX]+\s*\))[^()]*[A-Za-z]{3})|;")
CHOSEONG = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ"
CHOSEONG_MERGE = {"ㄲ": "ㄱ", "ㄸ": "ㄷ", "ㅃ": "ㅂ", "ㅆ": "ㅅ", "ㅉ": "ㅈ"}
OTHER_INITIAL = "#"
LONG_NAME = 40  # chars; longer first variants yield to a shorter Korean variant


def _balance(name: str) -> str:
    """Drop a dangling '(...' left by truncated KOSHA names."""
    while name.count("(") > name.count(")"):
        name = name[: name.rfind("(")].rstrip(" -,")
    while name.count(")") > name.count("(") and name.endswith(")"):
        name = name[:-1].rstrip()
    return name


def _clean(variant: str) -> str:
    return _balance(_KOSHA_CUT.split(variant, maxsplit=1)[0].strip())


def korean_name(kosha_name: str, ncis_name: str) -> str:
    """KOSHA name without its English parenthetical / 관용명 note; among ';'-variants the first, unless it is very long
    and a shorter Korean variant exists (e.g. '…-D-키로이노시톨; 발리다마이신 A'). NCIS Korean name as fallback."""
    name = re.sub(r"\s+", " ", (kosha_name or "").strip())
    variants = [_clean(v) for v in name.split(";") if v.strip()]
    korean = [v for v in variants if _HANGUL.search(v)]
    if korean:
        first = korean[0]
        if len(first) > LONG_NAME:
            first = min(korean, key=len)
        return first
    # no Korean variant: the NCIS Korean name, else the whole KOSHA name minus 관용명 notes
    whole = _balance(re.split(r"\s*\(\s*관용명|;", name, maxsplit=1)[0].strip())
    return (ncis_name or "").strip() or whole or name


def english_name(kosha_en: str, ncis_en: str, kosha_name: str) -> str:
    for cand in (kosha_en, ncis_en):
        cand = (cand or "").strip()
        if cand and _LATIN.search(cand):
            return cand
    m = re.search(r"\(([^()]*[A-Za-z][^()]*)\)", kosha_name or "")
    return m.group(1).strip() if m else ""


def alternate_names(primary_ko: str, primary_en: str, ncis: dict, extra: tuple[str, ...] = ()) -> list[str]:
    seen = {primary_ko.casefold(), primary_en.casefold()}
    out: list[str] = []
    for cand in [*extra, ncis.get("name_kor", ""), ncis.get("name_eng", ""), *ncis.get("synonyms_kor", []),
                 *ncis.get("synonyms_eng", [])]:
        cand = (cand or "").strip()
        if cand and cand.casefold() not in seen and len(cand) <= 80:
            seen.add(cand.casefold())
            out.append(cand)
        if len(out) >= config.ALT_NAMES_MAX:
            break
    return out


def display_names(kosha: dict, ncis: dict, cas_list: list[str]) -> dict[str, tuple[str, str]]:
    """CAS -> (name_ko, name_en) for a page set. An NCIS fallback name shared by several CAS (a group name such as
    '무기 비소 화합물질') is replaced by the substance's own KOSHA/English name so H1s and titles stay specific."""
    raw = {}
    for cas in cas_list:
        k, n = kosha[cas], ncis.get(cas, {})
        raw[cas] = (korean_name(k.get("name", ""), n.get("name_kor", "")),
                    english_name(k.get("name_en", ""), n.get("name_eng", ""), k.get("name", "")),
                    bool(_HANGUL.search(_KOSHA_CUT.split(k.get("name", ""), maxsplit=1)[0])))
        if not raw[cas][0]:
            raw[cas] = (raw[cas][1], *raw[cas][1:])
    uses: dict[str, int] = {}
    for ko, _, _ in raw.values():
        uses[ko] = uses.get(ko, 0) + 1
    out = {}
    for cas, (ko, en, from_kosha) in raw.items():
        if uses[ko] > 1 and not from_kosha:
            ko = (kosha[cas].get("name") or en or ko).strip()
        out[cas] = (ko, en)
    return out


def with_seed_names(display: dict[str, tuple[str, str]], seed: dict[str, str],
                    keep_generated: frozenset[str]) -> dict[str, tuple[str, str, tuple[str, ...]]]:
    """CAS -> (name_ko, name_en, extra alternate names). A live seed page keeps its seed-list Korean name (the name
    the live page and its title already use, chosen by search demand); the generated name becomes an alternate.
    CAS in keep_generated keep the generated name (their seed name is wrong or ambiguous)."""
    out = {}
    for cas, (ko, en) in display.items():
        name = seed.get(cas, "")
        if name and cas not in keep_generated and name != ko:
            out[cas] = (name, en, (ko,))
        else:
            out[cas] = (ko, en, ())
    return out


def initial_of(name_ko: str) -> str:
    """Initial consonant of the first Hangul syllable (locants like '1,2-', 'N,N-', 'p-' are skipped), else OTHER_INITIAL."""
    for ch in name_ko:
        if "가" <= ch <= "힣":
            c = CHOSEONG[(ord(ch) - 0xAC00) // 588]
            return CHOSEONG_MERGE.get(c, c)
    return OTHER_INITIAL


def initial_order() -> list[str]:
    return [c for c in CHOSEONG if c not in CHOSEONG_MERGE] + [OTHER_INITIAL]
