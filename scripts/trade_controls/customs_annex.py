"""세관장확인고시 별표 1의2(수출)·2의2(수입) xlsx 를 표준 라이브러리로 읽는다.

열 구성: [품목번호(HSK), 품명, 요건 본문, 관계법령]. 요건 본문에 '[Benzene; 71-43-2]' 처럼 CAS 가 적혀 있다.
관계법령별로 행 본문과 CAS 집합을 모아 규칙의 세관장확인 여부를 대조하는 데 쓴다.
"""
from __future__ import annotations

import io
import re
import zipfile
import xml.etree.ElementTree as ET
from collections import defaultdict
from dataclasses import dataclass, field

_NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
_CAS_RE = re.compile(r"(?<![\d-])(\d{2,7}-\d{2}-\d)(?![\d-])")


@dataclass
class AnnexTable:
    texts_by_law: dict[str, list[str]] = field(default_factory=lambda: defaultdict(list))
    cas_by_law: dict[str, set[str]] = field(default_factory=lambda: defaultdict(set))
    row_count: int = 0


def _shared_strings(zf: zipfile.ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in zf.namelist():
        return []
    root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
    return ["".join(t.text or "" for t in si.iter(_NS + "t")) for si in root.findall(_NS + "si")]


def _cell_value(cell: ET.Element, shared: list[str]) -> str:
    kind = cell.get("t")
    v = cell.find(_NS + "v")
    if kind == "s" and v is not None:
        return shared[int(v.text)]
    if kind == "inlineStr":
        return "".join(t.text or "" for t in cell.iter(_NS + "t"))
    return v.text if v is not None and v.text else ""


def iter_rows(xlsx: bytes):
    with zipfile.ZipFile(io.BytesIO(xlsx)) as zf:
        shared = _shared_strings(zf)
        for name in sorted(n for n in zf.namelist() if n.startswith("xl/worksheets/sheet")):
            for row in ET.fromstring(zf.read(name)).iter(_NS + "row"):
                yield [_cell_value(c, shared) for c in row.findall(_NS + "c")]


def _cas_checksum_ok(cas: str) -> bool:
    head, mid, check = cas.split("-")
    digits = (head + mid)[::-1]
    return sum(int(d) * (i + 1) for i, d in enumerate(digits)) % 10 == int(check)


def parse_annex(xlsx: bytes) -> AnnexTable:
    table = AnnexTable()
    for cells in iter_rows(xlsx):
        if len(cells) < 4 or not re.match(r"\d{4}\.\d{2}-\d{4}", cells[0].strip()):
            continue
        law = cells[3].strip()
        table.row_count += 1
        table.texts_by_law[law].append(cells[2])
        table.cas_by_law[law].update(c for c in _CAS_RE.findall(cells[2]) if _cas_checksum_ok(c))
    return table
