"""방식 A — 지금 색인 생성 방식: 원본 jsonl.gz 를 처음부터 끝까지 읽으며 Aho-Corasick 으로 전체 검색어를 찾는다.
단일 프로세스 처리량을 잰다(실제 생성기는 여러 프로세스로 나눠 돌린다)."""
from __future__ import annotations

import ahocorasick

from config import PATENT_RAW_ROOT, SAMPLE_FILES, TERMS_TSV, TEXT_FIELDS
from records import iter_records
from results import Timer, save, size_bytes


def load_automaton() -> tuple[ahocorasick.Automaton, int]:
    auto = ahocorasick.Automaton()
    n = 0
    for line in TERMS_TSV.read_text(encoding="utf-8").splitlines():
        chem_id, _, term = line.partition("\t")
        if len(term) >= 2:  # 이름 안의 줄바꿈으로 갈라진 줄은 탭이 없어 건너뛴다
            auto.add_word(term.lower(), (chem_id, term))
            n += 1
    auto.make_automaton()
    return auto, n


def _bounded(text: str, end: int, length: int) -> bool:
    start = end - length + 1
    before = text[start - 1] if start > 0 else " "
    after = text[end + 1] if end + 1 < len(text) else " "
    return not (before.isalnum() or before == "-" or after.isalnum() or after == "-")


def main() -> None:
    with Timer() as tb:
        auto, n_terms = load_automaton()
    files = [PATENT_RAW_ROOT / f for f in SAMPLE_FILES]
    docs = hits = 0
    with Timer() as t:
        for path in files:
            for rec in iter_records(path):
                docs += 1
                found = set()
                for f in TEXT_FIELDS:
                    text = rec[f].lower()
                    for end, (chem_id, term) in auto.iter(text):
                        if chem_id not in found and _bounded(text, end, len(term)):
                            found.add(chem_id)
                hits += len(found)
    gz = sum(size_bytes(p) for p in files)
    save("raw_scan", {
        "method": "원본 전체 스캔 (Aho-Corasick, 1 프로세스)",
        "terms": n_terms,
        "automaton_seconds": round(tb.s, 1),
        "docs": docs,
        "doc_chem_hits": hits,
        "scan_seconds": round(t.s, 1),
        "gz_mb_per_s": round(gz / 1e6 / t.s, 2),
    })


if __name__ == "__main__":
    main()
