"""Lens 형식 특허 원본(jsonl.gz) 한 줄 → 제목·초록·청구항·본문. build_global_index.py 와 같은 필드를 쓴다."""
from __future__ import annotations

import gzip
import json
from pathlib import Path
from typing import Iterator


def _texts(obj, key: str) -> list[str]:
    """obj 안의 모든 key 값을 모은다. 원본마다 dict·list 중첩 모양이 달라(claims 는 list, description 은 dict) 모양에 기대지 않는다."""
    out: list[str] = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k == key and isinstance(v, str):
                out.append(v)
            elif k == key and isinstance(v, list) and all(isinstance(x, str) for x in v):
                out.extend(v)
            else:
                out.extend(_texts(v, key))
    elif isinstance(obj, list):
        for v in obj:
            out.extend(_texts(v, key))
    return out


def parse(record: dict) -> dict:
    return {
        "doc_key": record.get("doc_key") or record.get("lens_id") or "",
        "title": " ".join(_texts(record.get("biblio", {}).get("invention_title"), "text")),
        "abstract": " ".join(_texts(record.get("abstract"), "text")),
        "claims": " ".join(_texts(record.get("claims"), "claim_text")),
        "description": " ".join(_texts(record.get("description"), "text")),
    }


def iter_lines(path: Path) -> Iterator[str]:
    with gzip.open(path, "rt", encoding="utf-8") as fh:
        yield from fh


def iter_records(path: Path) -> Iterator[dict]:
    for line in iter_lines(path):
        try:
            yield parse(json.loads(line))
        except json.JSONDecodeError:
            continue
