"""Canada: CEPA 1999 Schedule 3 — Export Control List (Parts 1–3), from the Justice Laws consolidated XML.

<Schedule> whose heading Label is 'SCHEDULE 3' -> <Group> per PART -> top-level <Item> (Label = item number).
CAS numbers are printed in the item text ('(CAS 2385-85-5)'). Named members under an item ('(a) Hexabromobiphenyl
(CAS ...)') become entries of their own. Repealed items ('[Repealed, ...]') are not counted.
Expat (bundled with Python) refuses entity-expansion attacks; the XML is only read, never executed.
"""
from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from pathlib import Path

from intl_common import cas_tokens, clean, entry, fetch, file_info, split_entries

LIMS = "{http://justice.gc.ca/lims}"


def _text(el) -> str:
    return clean(" ".join(el.itertext())) if el is not None else ""


def schedule3(root) -> ET.Element:
    for sch in root.iter("Schedule"):
        head = sch.find("ScheduleFormHeading")
        if head is not None and _text(head.find("Label")) == "SCHEDULE 3":
            return sch
    raise ValueError("CEPA Schedule 3 not found in XML")


def parse_part(group, part: str) -> tuple[list[dict], int, list[str]]:
    rows: list[dict] = []
    repealed: list[str] = []
    counted = 0
    lst = group.find("Provision/List")
    for item in (lst.findall("Item") if lst is not None else []):
        label = _text(item.find("Label"))
        text = _text(item.find("Text"))
        if text.startswith("[Repealed"):
            repealed.append(label)
            continue
        counted += 1
        detail = f"CEPA Schedule 3 Part {part} item {label}"
        rows.append(entry("", text[:300], detail, cas_all=cas_tokens(text), match_method="law_cas" if cas_tokens(text) else "no_cas"))
        sub = item.find("List")
        for s in (sub.findall("Item") if sub is not None else []):
            st = _text(s.find("Text"))
            if cas_tokens(st):
                rows.append(entry("", f"{text[:120]} — {_text(s.find('Label'))} {st}"[:300], detail,
                                  cas_all=cas_tokens(st), match_method="law_cas"))
    return rows, counted, repealed


def collect(spec: dict, raw_dir: Path, offline: bool) -> dict:
    url = spec["downloads"]["xml"]
    path = fetch(url, raw_dir / "ca" / "cepa_C-15.31.xml", offline)
    root = ET.fromstring(path.read_bytes())
    current = root.get(f"{LIMS}current-date", "")
    sch = schedule3(root)
    amended = sch.get(f"{LIMS}lastAmendedDate", "")
    version = f"Justice Laws CEPA 1999 (S.C. 1999, c. 33) consolidated, current to {current}; Schedule 3 last amended {amended}"
    files = [file_info(path, url)]
    out = {}
    for group in sch.iter("Group"):
        label = _text(group.find("GroupHeading/Label"))  # 'PART 1'
        key = "part" + label.split()[-1]
        if key not in spec["lists"]:
            continue
        rows, counted, repealed = parse_part(group, label.split()[-1])
        entries, families, bad = split_entries(rows)
        out[key] = {"entries": entries, "family_entries": families,
                    "problems": [f"invalid CAS in source: {bad}"] if bad else [],
                    "official_count": None,
                    "official_count_basis": "법령에 총 건수 기재 없음 — 폐지되지 않은 항목 수",
                    "counted": counted, "source_version": version, "files": files,
                    "notes": [f"폐지 항목 제외 {counted}개 항목" + (f" (폐지: {', '.join(repealed)})" if repealed else "")]}
    return out
