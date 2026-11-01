"""TCEQ(텍사스) 배출사건(emission event) 오염물질 이름을 CAS / 물질군으로 잇는다.

원문: Environment_1 track_11_events/contaminants.csv 의 name, p1p/cache/eer_point_contaminants.csv 의 contaminant.
CAS 가 없고 이름만 있으며, 'Butane, N-'·'Ethylene (gaseous)'·'Butadiene, 1-3'·'VCM' 같은 표기가 섞여 있다.

규칙:
- 키: NFKC → 공백 정리 → casefold. 비교할 때는 synonyms.jsonl 과 같은 normalize_alias(하이픈·밑줄 → 공백)를 한 번 더 거친다.
- 후보 키를 차례로 만든다(규칙은 scripts/tceq_event_names.json 의 normalize 에 데이터로 둔다):
  원문 → 단서 괄호·꼬리 제거('(gaseous)'·'(liquid)'·', anhydrous') → 쉼표 뒤로 뒤집힌 접두 되돌리기('Butane, N-' → 'n-butane',
  'Butadiene, 1-3' → '1,3-butadiene', 'Hexane, 2-methyl-' → '2-methylhexane') → normalize.rewrites('butene-1' → '1-butene',
  'n-decane' → 'decane', 'i-butane' → 'isobutane' 등).
- 찾는 순서: 검토 이름표(groups 이름 → ambiguous → aliases → groups 패턴, 모든 후보 키) → 이름 색인(registry 층 → synonym 층,
  모든 후보 키) → 'X (Y)' 괄호 일치(두 이름이 같은 CAS, 한쪽은 없어도 됨, Y 가 E/Z·cis/trans 같은 기술자면 안 씀) → unmapped.
  registry 층: terminology.db ncis_substance.name_eng · kreach_chemicals.name_en + synonyms.jsonl registry 등급.
  synonym 층: synonyms.jsonl synonym 등급(PubChem·ECHA·EPA·KISCHEM 등) + terminology.db chemical_terms.name_en(KOSHA). 한 층에서 CAS 가 둘 이상이면 ambiguous 로 두고 고르지 않는다.
- 검토 이름표의 alias 는 반드시 CAS 와 출처(source)를 함께 적는다. 추측한 매핑은 넣지 않는다.
"""
from __future__ import annotations

import json
import re
import sqlite3
import sys
import unicodedata
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.core.chemical_aliases import normalize_alias  # noqa: E402

NAMES_FILE = Path(__file__).resolve().with_name("tceq_event_names.json")
TERMINOLOGY_DB = ROOT / "data" / "terminology.db"
SYNONYMS_FILE = ROOT / "backend" / "data" / "search" / "synonyms.jsonl"

STATUSES = ("cas", "group", "ambiguous", "unmapped")


@dataclass(frozen=True)
class Resolved:
    status: str          # cas | group | ambiguous | unmapped
    cas: str = ""        # status=cas 일 때만 채운다(ambiguous 는 비우고 candidates() 로 후보를 본다)
    group: str = ""      # status=group 일 때 GROUPS 의 키
    method: str = ""     # reviewed_group(_pattern) | reviewed_ambiguous | reviewed_alias | registry | synonym
                         # (+strip / +reorder / +rewrite: 규칙으로 바꾼 키로 찾음, +paren: 'X (Y)' 의 두 이름이 같은 CAS)
    key: str = ""        # 실제로 찾은 키(정규화 후)


def _cfg() -> dict:
    return json.loads(NAMES_FILE.read_text(encoding="utf-8"))


# 물질군: 키 → {"ko", "en"} (다른 모듈이 import 해서 화면 이름으로 쓴다)
def _entries(section: dict) -> list[tuple[str, dict]]:
    """'_doc' 같은 설명 키(밑줄로 시작)를 뺀 항목."""
    return [(k, v) for k, v in section.items() if not k.startswith("_") and isinstance(v, dict)]


GROUPS: dict[str, dict[str, str]] = {k: {"ko": v["ko"], "en": v["en"]} for k, v in _entries(_cfg()["groups"])}


# ── 이름 키 ─────────────────────────────────────────────────────────────

def base_key(raw: str) -> str:
    """NFKC → 공백 하나로 → casefold → 끝의 쉼표·떨어진 하이픈 찌꺼기 제거."""
    s = re.sub(r"\s+", " ", unicodedata.normalize("NFKC", raw or "")).strip().casefold()
    return re.sub(r"(?:\s+-|[\s,;])+$", "", s)          # 'Isopropyl Mercaptan -' · 'Trichloropropane,' ('Butane, N-' 의 '-' 는 남긴다)


def _strip_qualifiers(key: str, rules: dict) -> str:
    """'(gaseous)'·'(liquid)'·'(total)' 같은 단서 괄호와 ', gaseous'·', anhydrous' 같은 꼬리, 'anhydrous ' 같은 머리를 지운다."""
    words = rules["qualifier_words"]
    alt = "|".join(re.escape(w) for w in sorted(words, key=len, reverse=True))
    s = re.sub(rf"\s*\(\s*(?:{alt})\s*\)", "", key)
    s = re.sub(rf"\s*,\s*(?:{alt})$", "", s)
    s = re.sub(rf"^(?:{'|'.join(re.escape(w) for w in rules['qualifier_prefixes'])})\s+", "", s)
    return re.sub(r"\s+", " ", s).strip(" ,")


def _reorder(key: str, rules: dict) -> str:
    """쉼표 뒤로 뒤집힌 접두를 앞으로: 'butane, n-' → 'n-butane', 'butadiene, 1-3' → '1,3-butadiene',
    'hexane, 2-methyl-' → '2-methylhexane', 'butyl alcohol, tert-' → 'tert-butyl alcohol'. 해당 없으면 그대로."""
    m = re.fullmatch(r"(.+?)\s*,\s*(.+)", key)
    if not m:
        return key
    head, tail = m.group(1).strip(), m.group(2).strip()
    prefixes = rules["inverted_prefixes"]
    if tail in prefixes:
        return prefixes[tail] + head
    if re.fullmatch(rules["locant_pattern"], tail):                       # '1-3' · '1,3' · '1,2,4-'
        return re.sub(r"\s*[-,]\s*", ",", tail.rstrip("-")) + "-" + head
    if re.fullmatch(rules["substituent_pattern"], tail):                  # '2-methyl-' · 'methyl-'
        return tail.rstrip("-") + head
    return key


def candidate_keys(raw: str, rules: dict | None = None) -> list[tuple[str, str]]:
    """(키, 규칙) 목록. 규칙: '' = 원문 키, 'strip' = 단서 제거, 'reorder' = 접두 되돌림(단서 제거 뒤),
    'rewrite' = normalize.rewrites 를 차례로 적용한 결과(하나 바뀔 때마다 후보 하나; 앞 결과에 이어서 적용)."""
    rules = rules or _tables().rules
    k0 = base_key(raw)
    k1 = _strip_qualifiers(k0, rules)
    k2 = _reorder(k1, rules)
    seq = [(k0, ""), (k1, "strip"), (k2, "reorder")]
    k = k2
    for pattern, repl, *_ in rules.get("rewrites", []):
        nk = re.sub(pattern, repl, k).strip(" -")
        if nk != k:
            k = nk
            seq.append((k, "rewrite"))
    out: list[tuple[str, str]] = []
    for k, rule in seq:
        if k and all(k != x for x, _ in out):
            out.append((k, rule))
    return out


_PAREN_SPLIT = re.compile(r"^(.+?)\s*\(([^()]+)\)\s*$")


def lookup_key(key: str) -> str:
    """색인 비교용 키(synonyms.jsonl 과 같은 normalize_alias)."""
    return normalize_alias(key)


# ── 표 읽기 ─────────────────────────────────────────────────────────────

class _Tables:
    def __init__(self, names_file: Path = NAMES_FILE, terminology_db: Path = TERMINOLOGY_DB, synonyms_file: Path = SYNONYMS_FILE):
        cfg = json.loads(names_file.read_text(encoding="utf-8"))
        self.cfg = cfg
        self.rules = cfg["normalize"]
        self.group_of: dict[str, str] = {}
        self.group_patterns: list[tuple[re.Pattern, str]] = []
        for g, v in _entries(cfg["groups"]):
            for a in v.get("aliases", []):
                self.group_of[self._k(a)] = g
            for p in v.get("patterns", []):
                self.group_patterns.append((re.compile(p, re.I), g))
        self.ambiguous = {self._k(n): tuple(v.get("candidates", [])) for n, v in _entries(cfg.get("ambiguous", {}))}
        self.aliases = {self._k(n): v["cas"] for n, v in _entries(cfg["aliases"])}
        self.registry, self.synonym = _name_index(terminology_db, synonyms_file)

    def _k(self, name: str) -> str:
        return lookup_key(base_key(name))


@lru_cache(maxsize=1)
def _tables() -> _Tables:
    return _Tables()


def _name_index(db: Path, syn_file: Path) -> tuple[dict[str, set[str]], dict[str, set[str]]]:
    """이름(lookup_key) → CAS 집합, registry 층과 synonym 층 둘."""
    registry: dict[str, set[str]] = {}
    synonym: dict[str, set[str]] = {}

    def add(index: dict, name: str, cas: str) -> None:
        k, c = lookup_key(name or ""), (cas or "").strip()
        if k and re.fullmatch(r"\d{2,7}-\d{2}-\d", c):
            index.setdefault(k, set()).add(c)

    if db.exists():
        conn = sqlite3.connect(f"file:{db.as_posix()}?mode=ro", uri=True)
        try:
            for index, q in ((registry, "SELECT name_eng, cas_no FROM ncis_substance"),
                             (registry, "SELECT name_en, cas_no FROM kreach_chemicals"),
                             # KOSHA 영문명은 CAS 가 어긋난 행이 있어(예: 'Methane' → 8006-14-2 천연가스, 'Isoprene' → 9006-04-6 천연고무) synonym 층에 둔다
                             (synonym, "SELECT name_en, cas_no FROM chemical_terms WHERE source = 'KOSHA'")):
                for name, cas in conn.execute(q):
                    add(index, name, cas)
        finally:
            conn.close()
    if syn_file.exists():
        with open(syn_file, encoding="utf-8") as fh:
            header = json.loads(fh.readline())
            tiers = {code: s["tier"] for code, s in header["sources"].items()}
            for line in fh:
                if not line.strip():
                    continue
                cas, names = json.loads(line)
                for name, code in names:
                    add(registry if tiers.get(code) == "registry" else synonym, name, cas)
    return registry, synonym


# ── 찾기 ────────────────────────────────────────────────────────────────

def _with_rule(method: str, rule: str) -> str:
    return f"{method}+{rule}" if rule else method


def _resolve(raw: str, *, reviewed: bool = True, rules: bool = True) -> Resolved:
    t = _tables()
    bases = candidate_keys(raw, t.rules) if rules else [(base_key(raw), "")]
    keys = [(lookup_key(b), r) for b, r in bases if lookup_key(b)]
    if not keys:
        return Resolved("unmapped", key="")
    if reviewed:
        for k, r in keys:
            if k in t.group_of:
                return Resolved("group", group=t.group_of[k], method=_with_rule("reviewed_group", r), key=k)
        for k, r in keys:
            if k in t.ambiguous:
                return Resolved("ambiguous", method=_with_rule("reviewed_ambiguous", r), key=k)
            if k in t.aliases:
                return Resolved("cas", cas=t.aliases[k], method=_with_rule("reviewed_alias", r), key=k)
        for b, r in bases:                                      # 패턴은 normalize_alias 전 키('c5's', 'c6-c8')에 건다
            for pat, g in t.group_patterns:
                if pat.fullmatch(b):
                    return Resolved("group", group=g, method=_with_rule("reviewed_group_pattern", r), key=lookup_key(b))
    for layer, index in (("registry", t.registry), ("synonym", t.synonym)):
        for k, r in keys:
            hits = index.get(k)
            if hits:
                if len(hits) > 1:
                    return Resolved("ambiguous", method=_with_rule(layer, r), key=k)
                return Resolved("cas", cas=next(iter(hits)), method=_with_rule(layer, r), key=k)
    if rules:
        hit = _paren_agree(raw, reviewed)
        if hit:
            return hit
    return Resolved("unmapped", key=keys[-1][0])


def _paren_agree(raw: str, reviewed: bool) -> Resolved | None:
    """'X (Y)' 꼴('Methyl ethyl ketone (MEK)', 'Water (H2O)', 'Heptane (or n-)'): X 와 Y 를 따로 찾아
    CAS 가 하나로 모이고(같은 CAS 이거나 한쪽은 unmapped) 물질군·ambiguous 가 섞이지 않을 때만 그 CAS. 아니면 None.
    괄호 안이 입체·이성질 기술자(normalize.paren_descriptor_pattern: E, Z, cis, trans, R, S, ±)면 쓰지 않는다('2-Pentene,(E)')."""
    m = _PAREN_SPLIT.match(unicodedata.normalize("NFKC", raw or "").strip())
    if not m:
        return None
    inner = base_key(m.group(2))
    if re.fullmatch(_tables().rules["paren_descriptor_pattern"], inner):   # '(E)'·'(Z)'·'(cis)'·'(R)' 은 이성질체를 정하는 말이라 버릴 수 없다
        return None
    parts = [_resolve(x, reviewed=reviewed, rules=True) for x in (m.group(1), m.group(2))]
    if any(p.status in ("group", "ambiguous") for p in parts):
        return None
    cas = {p.cas for p in parts if p.status == "cas"}
    if len(cas) != 1:
        return None
    first = next(p for p in parts if p.status == "cas")
    return Resolved("cas", cas=first.cas, method=first.method.split("+")[0] + "+paren", key=first.key)


def resolve(name: str) -> Resolved:
    """TCEQ 오염물질 이름 → Resolved(status, cas, group, method, key)."""
    return _resolve(name)


def resolve_plain(name: str) -> Resolved:
    """비교 기준선: 검토 이름표·정규화 규칙 없이 이름 색인 완전 일치만."""
    return _resolve(name, reviewed=False, rules=False)


def candidates(name: str) -> tuple[str, ...]:
    """ambiguous 일 때 후보 CAS(검토 이름표에 적은 후보, 없으면 색인에서 나온 CAS 전부). 그 외에는 빈 튜플."""
    r = resolve(name)
    if r.status != "ambiguous":
        return ()
    t = _tables()
    if r.method.startswith("reviewed_ambiguous"):
        return t.ambiguous.get(r.key, ())
    index = t.registry if r.method.startswith("registry") else t.synonym
    return tuple(sorted(index.get(r.key, ())))
