"""Read-only name lookups in terminology.db for the benchmark list: CAS existence, name -> CAS, Korean/English names.

Name -> CAS uses an index of every NCIS / chemical_terms name (split into its parts the way the backend splits
aliases), with a priority per origin so an official registry name wins over a trade/ECHA label.
"""
from __future__ import annotations

import collections
import json
import re
import sqlite3
import sys

import config

if config.PROJECT not in sys.path:
    sys.path.insert(0, config.PROJECT)
from backend.core.chemical_aliases import clean_alias_value, normalize_alias  # noqa: E402

# lower = stronger evidence that the name denotes that CAS
PRIO_NCIS_FIRST, PRIO_NCIS_PRIMARY, PRIO_KOSHA, PRIO_NCIS_SYNONYM, PRIO_OTHER = 0, 1, 2, 3, 4
# a trailing "(...)" annotates the whole name when preceded by a space ("벤젠 (Benzene)") or by Hangul
# ("공중합체(ETHYLENE-VINYL ACETATE COPOLYMER)"); "trichloro(ethylene)" is a fragment, not a synonym
_TRAILING_NOTE = re.compile(r"^(.*\S)(\s*)\((.+)\)$")


def segments(text: str | None) -> list[str]:
    return [s.strip() for s in (text or "").split(";") if s.strip()]


def _has_hangul(text: str) -> bool:
    return any("가" <= ch <= "힣" for ch in text)


class DbNames:
    def __init__(self, path: str = config.TERM_DB):
        self.conn = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
        self._index: dict[str, dict[str, int]] | None = None

    def cas_exists(self, cas: str) -> bool:
        return self.conn.execute("SELECT 1 FROM chemical_terms WHERE cas_no = ? LIMIT 1", (cas,)).fetchone() is not None

    @staticmethod
    def _parts(name: str) -> list[str]:
        out = [name]
        m = _TRAILING_NOTE.match(name.strip())
        if m and (m.group(2) or _has_hangul(m.group(1)[-1])):
            out.append(m.group(1))
            out += [clean_alias_value(x) for x in m.group(3).split(";")]
        return out

    def _add(self, idx, name: str, cas: str, prio: int) -> None:
        for part in self._parts(name):
            key = normalize_alias(part)
            if key and prio < idx[key].get(cas, 99):
                idx[key][cas] = prio

    def index(self) -> dict[str, dict[str, int]]:
        if self._index is None:
            idx: dict[str, dict[str, int]] = collections.defaultdict(dict)
            for cas, en, en2 in self.conn.execute("SELECT cas_no, name_eng, name2_eng FROM ncis_substance"):
                for i, seg in enumerate(segments(en)):
                    self._add(idx, seg, cas, PRIO_NCIS_FIRST if i == 0 else PRIO_NCIS_PRIMARY)
                for seg in segments(en2):
                    self._add(idx, seg, cas, PRIO_NCIS_SYNONYM)
            for cas, name, name_en, src in self.conn.execute(
                    "SELECT cas_no, name, name_en, source FROM chemical_terms WHERE cas_no IS NOT NULL AND cas_no <> ''"):
                prio = PRIO_KOSHA if src == "KOSHA" else PRIO_OTHER
                for v in (name, name_en):
                    if v:
                        self._add(idx, v, cas, prio)
            self._index = idx
        return self._index

    def resolve(self, names: list[str]) -> tuple[str | None, str]:
        """First name with a single best-priority CAS wins. Returns (cas, evidence) or (None, why)."""
        notes = []
        for n in names:
            hits = self.index().get(normalize_alias(n), {})
            if not hits:
                notes.append(f"{n}: no DB name")
                continue
            best = min(hits.values())
            top = sorted(c for c, p in hits.items() if p == best)
            if len(top) == 1:
                return top[0], f"terminology.db name '{n}' (priority {best})"
            notes.append(f"{n}: ambiguous {top}")
        return None, "; ".join(notes)

    def korean_name(self, cas: str) -> str:
        row = self.conn.execute("SELECT name_kor FROM ncis_substance WHERE cas_no = ?", (cas,)).fetchone()
        if row and segments(row[0]):
            return segments(row[0])[0]
        for (name,) in self.conn.execute("SELECT name FROM chemical_terms WHERE cas_no = ? AND source IN ('KOSHA', 'KISCHEM')", (cas,)):
            base = (name or "").split("(")[0].strip(" ·")
            if _has_hangul(base):
                return base
        return ""

    def english_name(self, cas: str) -> str:
        for sql in ("SELECT name_eng FROM ncis_substance WHERE cas_no = ?",
                    "SELECT name_en FROM kreach_chemicals WHERE cas_no = ?"):
            row = self.conn.execute(sql, (cas,)).fetchone()
            if row and segments(row[0]):
                return segments(row[0])[0]
        return ""

    def accident_prep(self) -> list[tuple[str, str, str, str, str]]:
        """(cas, name_kor, name_eng, item_no, fetched_at) for NCIS classification 사고대비물질."""
        out = []
        for cas, ko, en, cl, fetched in self.conn.execute(
                "SELECT cas_no, name_kor, name_eng, classifications, fetched_at FROM ncis_substance "
                "WHERE classifications LIKE ?", ("%사고대비물질%",)):
            for c in json.loads(cl or "[]"):
                if c.get("sbstnClsfTypeNm") == "사고대비물질":
                    out.append((cas, ko or "", en or "", str(c.get("unqNo", "")).strip(), (fetched or "")[:10]))
        return out
