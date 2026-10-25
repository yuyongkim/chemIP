"""Name -> CAS matching against the project terminology DB (opened read-only).

Rules (accuracy first):
  * exact match of the whole normalised name only (no substring / fuzzy match);
  * only CAS numbers with a valid check digit are considered;
  * "primary" names (NCIS 국문/영문명, KOSHA 대표명) win over synonyms; if the
    primary hits still give more than one CAS the name is reported ambiguous;
  * spelling variants come only from data/name_variants.json (old/new IUPAC
    Korean spellings), never from guesses.
"""
from __future__ import annotations

import json
import re
import sqlite3
import unicodedata
from collections import defaultdict
from functools import lru_cache
from pathlib import Path

from . import cas as casmod
from . import config

DATA = Path(__file__).with_name("data")


def norm(name: str) -> str:
    s = unicodedata.normalize("NFKC", name or "").lower()
    s = s.replace("’", "'").replace("‘", "'").replace("′", "'").replace("ㆍ", "").replace("·", "")
    s = re.sub(r"[\s ]+", "", s)
    return s


def _split_syn(text: str) -> list[str]:
    return [p.strip() for p in re.split(r"[;|]", text or "") if p.strip()]


def _kosha_names(name: str) -> tuple[list[str], list[str]]:
    """KOSHA names look like '스티렌 ( 관용명 : Vinyl benzene ) (스티렌 ( 관용명 : 비닐 벤젠 ))'.
    Returns (primary, synonyms)."""
    primary = [re.split(r"\s\(", name, 1)[0].strip()]
    syn = [m.strip() for m in re.findall(r"관용명\s*:\s*([^()]+)", name)]
    tail = re.findall(r"\(([^()]*)\)\s*$", name)
    syn.extend(t.strip() for t in tail if "관용명" not in t)
    return [p for p in primary if p], [s for s in syn if s]


class TermIndex:
    def __init__(self, db_path: Path = config.TERMINOLOGY_DB) -> None:
        uri = f"file:{db_path.as_posix()}?mode=ro"
        self.con = sqlite3.connect(uri, uri=True)
        self.primary: dict[str, set[str]] = defaultdict(set)
        self.synonym: dict[str, set[str]] = defaultdict(set)
        self.name_en: dict[str, str] = {}
        self.name_ko: dict[str, str] = {}
        self._build()

    def _add(self, table: dict, name: str, cas_no: str) -> None:
        c = casmod.normalize(cas_no or "")
        if not casmod.is_valid(c):
            return
        n = norm(name)
        if len(n) >= 2 or (n and "가" <= n[0] <= "힣"):
            table[n].add(c)

    def _build(self) -> None:
        cur = self.con.cursor()
        for cas_no, nk, n2k, ne, n2e in cur.execute(
                "select cas_no,name_kor,name2_kor,name_eng,name2_eng from ncis_substance"):
            for p in _split_syn(nk):
                self._add(self.primary, p, cas_no)
            for p in _split_syn(ne):
                self._add(self.primary, p, cas_no)
            for p in _split_syn(n2k) + _split_syn(n2e):
                self._add(self.synonym, p, cas_no)
            c = casmod.normalize(cas_no or "")
            if ne and ne.strip():
                self.name_en.setdefault(c, ne.strip())
            if nk and nk.strip():
                self.name_ko.setdefault(c, _split_syn(nk)[0])
        for name, cas_no, name_en, source in cur.execute(
                "select name,cas_no,name_en,source from chemical_terms where cas_no is not null"):
            c = casmod.normalize(cas_no)
            if source in ("KOSHA", "KISCHEM"):
                prim, syn = _kosha_names(name or "")
                for p in prim:
                    self._add(self.primary, p, c)
                for s in syn:
                    self._add(self.synonym, s, c)
                if name_en:
                    self._add(self.primary, name_en, c)
                if prim:
                    self.name_ko.setdefault(c, prim[0])
            else:
                if name_en:
                    self._add(self.synonym, name_en, c)
                if name:
                    self._add(self.synonym, name, c)
            if name_en:
                self.name_en.setdefault(c, name_en.strip())
        for alias, cas_no, atype in cur.execute(
                "select alias,cas_no,alias_type from chemical_aliases where cas_no is not null "
                "and alias_type in ('ncis_synonym','derived','derived_en')"):
            if alias.count("(") != alias.count(")"):
                continue  # truncated fragments produced by the alias builder
            self._add(self.synonym, alias, cas_no)

    def lookup(self, name: str) -> dict:
        """{status: matched|ambiguous|none, cas, via, candidates}"""
        n = norm(name)
        prim = self.primary.get(n, set())
        syn = self.synonym.get(n, set())
        if len(prim) == 1:
            c = next(iter(prim))
            return {"status": "matched", "cas": c, "via": "primary", "candidates": sorted(prim | syn)}
        if len(prim) > 1:
            return {"status": "ambiguous", "cas": None, "via": "primary", "candidates": sorted(prim)}
        if len(syn) == 1:
            return {"status": "matched", "cas": next(iter(syn)), "via": "synonym", "candidates": sorted(syn)}
        if len(syn) > 1:
            return {"status": "ambiguous", "cas": None, "via": "synonym", "candidates": sorted(syn)}
        return {"status": "none", "cas": None, "via": None, "candidates": []}

    def cas_known(self, c: str) -> bool:
        return c in self.name_en or c in self.name_ko


@lru_cache(maxsize=1)
def index() -> TermIndex:
    return TermIndex()


@lru_cache(maxsize=1)
def variants() -> dict[str, list[str]]:
    raw = json.loads((DATA / "name_variants.json").read_text(encoding="utf-8"))
    return {norm(k): v for k, v in raw["variants"].items()}


@lru_cache(maxsize=1)
def elements() -> dict[str, dict]:
    raw = json.loads((DATA / "elements.json").read_text(encoding="utf-8"))
    return {norm(k): v for k, v in raw["elements"].items()}


def _paren_forms(name: str) -> list[str]:
    """'디에틸헥실프탈레이트(DEHP)' -> ['디에틸헥실프탈레이트(DEHP)', '디에틸헥실프탈레이트', 'DEHP']"""
    forms = [name]
    m = re.match(r"^(.*?)\s*\(([^()]+)\)\s*$", name)
    if m and m.group(1).strip():
        forms += [m.group(1).strip(), m.group(2).strip()]
    return forms


_CODE = re.compile(r"(?:[A-Z0-9]{2,}[a-z]?|Halon)(?:-[0-9A-Za-z]+)*")


def _has_hangul(s: str) -> bool:
    return any("가" <= ch <= "힣" for ch in s)


def match_name(name: str, extra: list[str] | None = None) -> dict:
    """Match a law name to one CAS.

    Korean forms (law name, its parenthesis split, Korean variants) and English
    forms (English variants, the English name printed in the law) are looked up
    separately. When both sides give hits they must agree on exactly one CAS
    ("ko+en"). One-sided unique hits are accepted and labelled ("ko_only" /
    "en_only"). A Korean-vs-English disagreement is resolved in favour of the
    English element/substance name only when the English side is unique, and the
    conflicting Korean hit is recorded.
    """
    idx = index()
    el = elements().get(norm(name))
    if el:
        c = el["cas"]
        db_en = idx.name_en.get(c) or ""
        if casmod.is_valid(c) and el.get("match", el["en"]).lower() in db_en.lower():
            return {"status": "matched", "cas": c, "via": "element_table+db_en", "candidates": [c],
                    "matched_name": f"{name} = {db_en}", "name_en": el["en"]}
        return {"status": "none", "cas": None, "via": None, "candidates": [c], "matched_name": None}
    forms: list[str] = []
    for f in _paren_forms(name) + list(extra or []):
        forms.append(f)
        forms.extend(variants().get(norm(f), []))
    seen, ko, en, codes = set(), [], [], []
    for f in forms:
        if not f or norm(f) in seen:
            continue
        seen.add(norm(f))
        side = ko if _has_hangul(f) else codes if _CODE.fullmatch(f.strip()) else en
        side.append((f, idx.lookup(f)))
    if not ko and not en:
        en = codes            # acronyms/codes (PFOS, DEHP, CFC-11) only as a last resort
    elif not any(r["status"] == "matched" for _, r in ko + en):
        en = en + codes

    def sets(side):
        matched, allc = {}, set()
        for f, r in side:
            if r["status"] == "matched":
                matched.setdefault(r["cas"], f)
            allc.update(r["candidates"])
        return matched, allc

    km, ka = sets(ko)
    em, ea = sets(en)
    res = {"status": "none", "cas": None, "via": None, "candidates": sorted(ka | ea)[:10], "matched_name": None}
    if km and em:
        inter = set(km) & set(em)
        if len(inter) == 1:
            c = inter.pop()
            return dict(res, status="matched", cas=c, via="ko+en", matched_name=f"{km[c]} / {em[c]}")
        if not inter and len(em) == 1:
            c = next(iter(em))
            if c in ka or len(km) >= 1:
                return dict(res, status="matched", cas=c, via="en_over_ko_conflict", matched_name=em[c],
                            conflict={"ko_hits": sorted(km)})
        return dict(res, status="ambiguous", candidates=sorted(set(km) | set(em)))
    if km:
        if len(km) == 1:
            c = next(iter(km))
            return dict(res, status="matched", cas=c, via="ko_only", matched_name=km[c])
        narrowed = set(km) & ea if ea else set()
        if len(narrowed) == 1:
            c = narrowed.pop()
            return dict(res, status="matched", cas=c, via="ko+en_candidates", matched_name=km[c])
        return dict(res, status="ambiguous", candidates=sorted(km))
    if em:
        if len(em) == 1:
            c = next(iter(em))
            if ka and c not in ka:
                return dict(res, status="ambiguous", candidates=sorted(ka | {c}))
            return dict(res, status="matched", cas=c, via="en_only", matched_name=em[c])
        narrowed = set(em) & ka if ka else set()
        if len(narrowed) == 1:
            c = narrowed.pop()
            return dict(res, status="matched", cas=c, via="en+ko_candidates", matched_name=em[c])
        return dict(res, status="ambiguous", candidates=sorted(em))
    if ka or ea:
        res["status"] = "ambiguous"
    return res
