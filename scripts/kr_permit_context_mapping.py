"""통합허가 배출기준 표의 물질 이름·단위를 CAS / 물질군 / 표준 단위로 잇는다(scripts/build_kr_permit_context.py 가 쓴다).

규칙:
- 이름은 NFKC → 앞 '*' 제거 → 각주('주1)', '3)') 제거 → 단서 괄호('(Cr로서)', '(SO2)', '(‘26.1.1~)', '(특정)' 등) 제거 → 공백 제거로 키를 만든다.
  PM-10·Cr6+ 처럼 뜻이 바뀌는 괄호는 지우지 않는다.
- 찾는 순서: 검토 이름표(scripts/kr_permit_context_names.json)의 fragments → groups → aliases →
  KR_CLEAN_AIR_*.json 이름 완전 일치 → data/terminology.db 이름 완전 일치. 둘 이상 CAS 가 나오면 ambiguous, 없으면 unmapped.
"""
from __future__ import annotations

import json
import re
import sqlite3
import unicodedata
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NAMES_FILE = Path(__file__).resolve().with_name("kr_permit_context_names.json")
KR_LISTS_DIR = ROOT / "backend" / "data" / "trade_controls" / "kr_lists"
TERMINOLOGY_DB = ROOT / "data" / "terminology.db"

_FOOTNOTE = re.compile(r"(?:(?<=[가-힣])|(?<=\)))주?\d\)$")   # 각주: '아세트알데히드주3)', '(COD)1)' — '(SO2)' 는 아님
_PAREN = re.compile(r"\(([^()]*)\)")
_KEEP_PAREN = re.compile(r"PM-?\d|\d\+")              # PM-10, Cr6+ 는 뜻이 달라 남긴다
_QUALIFIER_WORDS = ("로서", "로써", "특정", "자율관리", "현탁중합", "괴상중합", "적용", "~")
_ASCII_TOKEN = re.compile(r"^[A-Za-z0-9 ,.\-]+$")    # 화학식·영문명(SO2, HCl, Benzene)


@dataclass(frozen=True)
class Resolved:
    status: str          # cas | group | fragment | non_air | ambiguous | unmapped
    cas: str = ""
    group: str = ""
    method: str = ""     # reviewed_fragment | reviewed_group | reviewed_alias+kr_list | kr_list | terminology | ...
    key: str = ""
    qualifier: str = ""


def _nfkc(text: str) -> str:
    return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", text or "")).strip()


def _is_qualifier(inner: str) -> bool:
    s = inner.strip()
    if not s or _KEEP_PAREN.search(s):
        return False
    if any(w in s for w in _QUALIFIER_WORDS) or re.search(r"\d{2}\.\d", s):
        return True
    return len(s) > 1 and bool(_ASCII_TOKEN.match(s))   # 한 글자('벤조(A)피렌')는 이름의 일부


def split_name(raw: str) -> tuple[str, str]:
    """원문 이름 → (키, 지운 단서). 키는 공백을 뺀 비교용 문자열."""
    s = _nfkc(raw).lstrip("*").strip()
    s = _FOOTNOTE.sub("", s).strip()
    removed: list[str] = []

    def drop(m: re.Match) -> str:
        if _is_qualifier(m.group(1)):
            removed.append(m.group(1).strip())
            return ""
        return m.group(0)

    s = _PAREN.sub(drop, s)
    s = re.sub(r"\s*주\)$", "", s)
    return s.replace(" ", ""), "; ".join(removed)


def name_key(text: str) -> str:
    return split_name(text)[0]


def unit_key(text: str) -> str:
    return re.sub(r"\s+", "", unicodedata.normalize("NFKC", text or "")).lower()


class NameResolver:
    def __init__(self, names_file: Path = NAMES_FILE, kr_lists_dir: Path = KR_LISTS_DIR, terminology_db: Path = TERMINOLOGY_DB):
        cfg = json.loads(names_file.read_text(encoding="utf-8"))
        self.cfg = cfg
        self.fragments = {name_key(x) for x in cfg["fragments"]} | {_nfkc(x) for x in cfg["fragments"]}
        self.groups = {g: v for g, v in cfg["groups"].items()}
        self.group_of = {name_key(a): g for g, v in self.groups.items() for a in v["aliases"]}
        self.aliases = {name_key(k): name_key(v) for k, v in cfg["aliases"].items()}
        self.non_air = [re.compile(x) for x in cfg.get("non_air_patterns", [])]
        self.units = {unit_key(raw): std for std, raws in cfg["units"].items() for raw in raws}
        self.kr_names, self.kr_cas_names = _kr_list_index(kr_lists_dir)
        self.term_names = _terminology_index(terminology_db)

    def unit(self, raw: str) -> str:
        return self.units.get(unit_key(raw), "")

    def resolve(self, raw: str) -> Resolved:
        if _nfkc(raw) in self.fragments:
            return Resolved("fragment", method="reviewed_fragment", key=_nfkc(raw))
        key, qual = split_name(raw)
        if not key or re.fullmatch(r"[\W\d_]*", key):
            return Resolved("fragment", method="qualifier_only", key=key, qualifier=qual)
        if key in self.fragments:
            return Resolved("fragment", method="reviewed_fragment", key=key, qualifier=qual)
        if any(p.search(key) for p in self.non_air):
            return Resolved("non_air", method="reviewed_non_air", key=key, qualifier=qual)
        if key in self.group_of:
            return Resolved("group", group=self.group_of[key], method="reviewed_group", key=key, qualifier=qual)
        target, via = (self.aliases[key], "reviewed_alias+") if key in self.aliases else (key, "")
        for index, method in ((self.kr_names, "kr_list"), (self.term_names, "terminology")):
            cas = index.get(target)
            if cas:
                if len(cas) > 1:
                    return Resolved("ambiguous", method=via + method, key=key, qualifier=qual)
                return Resolved("cas", cas=next(iter(cas)), method=via + method, key=key, qualifier=qual)
        return Resolved("unmapped", key=key, qualifier=qual)

    def cas_label(self, cas: str) -> str:
        return self.kr_cas_names.get(cas, "")


def _kr_list_index(folder: Path) -> tuple[dict[str, set[str]], dict[str, str]]:
    """KR_CLEAN_AIR_*.json 의 name_ko → CAS. group_parent(‘X 및 그 화합물’ 중 X 자체)는 이름 일치에 쓰지 않는다
    (배출기준 표의 '크롬'·'니켈' 은 물질군 기준이라 groups 에서 처리)."""
    by_name: dict[str, set[str]] = {}
    labels: dict[str, str] = {}
    for f in sorted(folder.glob("KR_CLEAN_AIR_*.json")):
        for e in json.loads(f.read_text(encoding="utf-8")).get("entries", []):
            cas, name = (e.get("cas") or "").strip(), e.get("name_ko") or ""
            if not cas or not name:
                continue
            labels.setdefault(cas, name)
            if e.get("role") == "group_parent":
                continue
            by_name.setdefault(name_key(name), set()).add(cas)
    return by_name, labels


def _terminology_index(db: Path) -> dict[str, set[str]]:
    """terminology.db 의 한국어 이름(‘벤젠 (Benzene)’ → ‘벤젠’, KISCHEM ‘·’ 머리 제거) → CAS."""
    out: dict[str, set[str]] = {}
    if not db.exists():
        return out
    conn = sqlite3.connect(f"file:{db.as_posix()}?mode=ro", uri=True)
    try:
        rows = conn.execute("SELECT name, cas_no FROM chemical_terms WHERE cas_no LIKE '%-%-%'").fetchall()
        rows += conn.execute("SELECT name_kor, cas_no FROM ncis_substance WHERE cas_no LIKE '%-%-%'").fetchall()
    finally:
        conn.close()
    for name, cas in rows:
        head = _nfkc((name or "").lstrip("·").split(" (")[0])
        if head:
            out.setdefault(head.replace(" ", ""), set()).add(cas.strip())
    return out
