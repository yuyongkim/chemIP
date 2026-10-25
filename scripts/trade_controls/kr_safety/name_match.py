"""Match a substance name to a CAS RN.

Primary source: data/terminology.db (opened read-only), exact match after
normalisation (lower-case, whitespace and middle-dots removed) against
  * chemical_aliases.alias_norm   (KOSHA/ECHA/KREACH/KISCHEM names, NCIS synonyms)
  * ncis_substance.name_kor / name_eng / name2_kor
Cross-check source: name -> CAS pairs printed side by side in Korean law tables
(노출기준 고시 별표 1, 산안법 별표 12/21/22), registered with add_law_pairs().

English equivalents for Korean-only law names (name_hints.json) are used as a
second key. A name is matched only when the hits agree on ONE valid CAS and the
two sources do not contradict each other. Otherwise: unmatched - never guessed.
"""
from __future__ import annotations

import json
import re
import sqlite3
from dataclasses import dataclass
from pathlib import Path

from . import cas as casmod
from . import config

HINTS_FILE = Path(__file__).with_name("name_hints.json")


def norm(name: str) -> str:
    return re.sub(r"[\s·ㆍ·]+", "", (name or "").lower())


@dataclass
class Match:
    query: str
    cas: str | None
    candidates: list[str]
    source: str

    @property
    def ok(self) -> bool:
        return self.cas is not None


def _decide(k: set[str], e: set[str]) -> tuple[str | None, str]:
    """Korean hits k, English hits e -> (cas or None, how)."""
    if len(k) == 1 and (not e or k & e):
        return next(iter(k)), "name_ko"
    if len(k) > 1 and len(k & e) == 1:
        return next(iter(k & e)), "name_ko+name_en"
    if not k and len(e) == 1:
        return next(iter(e)), "name_en"
    return None, ""


class NameIndex:
    def __init__(self) -> None:
        self._db: dict[str, set[str]] = {}
        self._law: dict[str, set[str]] = {}
        self.hints: dict[str, str] = json.loads(HINTS_FILE.read_text("utf-8")) if HINTS_FILE.exists() else {}
        uri = f"file:{config.TERMINOLOGY_DB.as_posix()}?mode=ro"
        con = sqlite3.connect(uri, uri=True)
        try:
            self._load_db(con)
        finally:
            con.close()

    def _load_db(self, con: sqlite3.Connection) -> None:
        """Exact name columns only. chemical_aliases 'derived' rows are NOT used: they include
        fragments cut out of longer names (e.g. 'methane' -> an alloy), which would give false hits."""
        db = self._db
        for cas_no, nk, ne, n2 in con.execute("SELECT cas_no, name_kor, name_eng, name2_kor FROM ncis_substance"):
            for n in [nk, ne] + (n2 or "").split(";"):
                self._add(db, n, cas_no)
        for alias, cas_no in con.execute(
                "SELECT alias, cas_no FROM chemical_aliases WHERE alias_type = 'ncis_synonym'"):
            for n in (alias or "").split(";"):
                self._add(db, n, cas_no)
        for name, name_en, cas_no, src in con.execute(
                "SELECT name, name_en, cas_no, source FROM chemical_terms"):
            name = (name or "").lstrip("·").strip()
            if src in ("KOSHA", "KISCHEM"):
                ko = name.split(" (")[0].split("(")[0].strip()       # '벤젠 (Benzene)' -> '벤젠'
                self._add(db, ko, cas_no)
                m = re.match(r"^[^()]*\(([^()]+)\)", name)          # first parenthetical = English name
                en_par = m.group(1).strip() if m and re.search(r"[A-Za-z]", m.group(1)) else ""
                if en_par:
                    self._add(db, en_par, cas_no)
                en_col = (name_en or "").lstrip("·").strip()
                if src == "KISCHEM" or (en_col and en_col.lower() == en_par.lower()):
                    self._add(db, en_col, cas_no)
            else:                                                  # ECHA / KREACH: EC / inventory name
                self._add(db, (name_en or "").strip(), cas_no)
        for ko, en, cas_no in con.execute("SELECT chem_ko, chem_en, cas_no FROM kischem_safety"):
            self._add(db, (ko or "").lstrip("·"), cas_no)
            self._add(db, (en or "").lstrip("·"), cas_no)

    @staticmethod
    def _add(idx: dict, name: str | None, cas_no: str | None) -> None:
        k = norm(name or "")
        c = casmod.normalize(cas_no or "")
        if k and casmod.is_valid(c):
            idx.setdefault(k, set()).add(c)

    def add_law_pairs(self, pairs) -> None:
        """pairs: iterable of (name, cas) printed together in a law table."""
        for name, cas_no in pairs:
            self._add(self._law, name, cas_no)
            stripped = re.sub(r"\([^()]*\)|\[[^\[\]]*\]", "", name or "").strip()
            if stripped and stripped != name:
                self._add(self._law, stripped, cas_no)

    def hits(self, name: str, law: bool = False) -> set[str]:
        idx = self._law if law else self._db
        return set(idx.get(norm(name), set())) if name else set()

    def _en_hits(self, names: list[str], law: bool = False) -> set[str]:
        out: set[str] = set()
        for n in names:
            out |= self.hits(n, law)
        return out

    def lookup(self, name_ko: str, name_en: str = "") -> Match:
        hint_val = self.hints.get(name_ko, [])
        ens = [name_en] if name_en else ([hint_val] if isinstance(hint_val, str) else list(hint_val))
        q = f"{name_ko} / {', '.join(ens)}" if ens else name_ko
        e_db, e_law = self._en_hits(ens), self._en_hits(ens, True)
        db_cas, db_how = _decide(self.hits(name_ko), e_db)
        law_cas, _ = _decide(self.hits(name_ko, True), e_law)
        cands = sorted(self.hits(name_ko) | e_db | self.hits(name_ko, True) | e_law)
        hint = " (영문 대조명: name_hints.json)" if ens and not name_en else ""
        if db_cas and law_cas and db_cas != law_cas:
            return Match(q, None, cands, "conflict: terminology.db vs 법령표")
        if db_cas:
            src = f"terminology.db {db_how}{hint}" + (" + 법령표 동일명칭 일치" if law_cas else "")
            return Match(q, db_cas, cands, src)
        if law_cas:
            return Match(q, law_cas, cands, f"법령표 동일명칭(노출기준 고시·산안법 별표){hint}")
        return Match(q, None, cands, "unmatched")
