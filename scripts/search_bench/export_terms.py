"""색인 생성기(build_global_index.py)가 쓰는 검색어 목록을 terms.tsv 로 내보낸다. 프로젝트 파이썬으로 실행한다."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from backend.core.terminology_db import TerminologyDB  # noqa: E402

from config import TERMS_TSV  # noqa: E402


def main() -> None:
    db = TerminologyDB()
    keywords = db.get_indexing_keywords()
    db.close()
    TERMS_TSV.parent.mkdir(parents=True, exist_ok=True)
    rows = {(k["chem_id"], k["name"].replace("\t", " ").strip()) for k in keywords if k.get("name")}
    TERMS_TSV.write_text("".join(f"{c}\t{n}\n" for c, n in sorted(rows)), encoding="utf-8")
    print(f"{len(rows):,} terms -> {TERMS_TSV}")


if __name__ == "__main__":
    main()
