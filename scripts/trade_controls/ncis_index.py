"""terminology.db(읽기 전용)에서 NCIS 분류별·국제목록별 CAS 집합을 만든다.

- ncis_substance.classifications(JSON 배열)의 sbstnClsfTypeNm 이 분류명이다.
- intl_regulatory.regulation 이 국제목록 코드(ROTTERDAM_PIC·MONTREAL_ODS·STOCKHOLM_POP 등)다.
DB 는 mode=ro 로만 연다. 쓰기는 하지 않는다.
"""
from __future__ import annotations

import json
import sqlite3
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class SubstanceIndex:
    all_cas: set[str] = field(default_factory=set)
    by_category: dict[str, set[str]] = field(default_factory=lambda: defaultdict(set))
    by_list: dict[str, set[str]] = field(default_factory=lambda: defaultdict(set))
    entry_counts: dict[str, int] = field(default_factory=lambda: defaultdict(int))


def _connect_ro(db_path: Path) -> sqlite3.Connection:
    return sqlite3.connect(f"file:{db_path.as_posix()}?mode=ro", uri=True)


def load_index(db_path: Path) -> SubstanceIndex:
    idx = SubstanceIndex()
    with _connect_ro(db_path) as conn:
        for cas, raw in conn.execute("SELECT cas_no, classifications FROM ncis_substance"):
            cas = (cas or "").strip()
            if not cas:
                continue
            idx.all_cas.add(cas)
            try:
                entries = json.loads(raw or "[]")
            except json.JSONDecodeError:
                continue
            for entry in entries if isinstance(entries, list) else []:
                name = (entry.get("sbstnClsfTypeNm") or "").strip() if isinstance(entry, dict) else ""
                if name:
                    idx.by_category[name].add(cas)
                    idx.entry_counts[name] += 1
        for cas, reg in conn.execute("SELECT cas_no, regulation FROM intl_regulatory"):
            if cas and reg:
                idx.by_list[reg].add(cas.strip())
    return idx


def category_summary(idx: SubstanceIndex) -> dict[str, dict[str, int]]:
    """분류별 물질 수(고유 CAS)와 분류 항목 수. 물질 수 내림차순."""
    return {
        name: {"substances": len(cas_set), "entries": idx.entry_counts[name]}
        for name, cas_set in sorted(idx.by_category.items(), key=lambda kv: -len(kv[1]))
    }
