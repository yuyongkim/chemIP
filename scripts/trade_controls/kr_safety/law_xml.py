"""Read law.go.kr DRF law XML: articles (조문) and appended tables (별표) as plain text."""
from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from pathlib import Path


def load(path: str | Path) -> ET.Element:
    return ET.parse(str(path)).getroot()


def basic_info(root: ET.Element) -> dict:
    b = root.find("기본정보")
    return {k: (b.findtext(k) or "").strip() for k in
            ("법령명_한글", "공포일자", "공포번호", "시행일자", "제개정구분")} if b is not None else {}


def annexes(root: ET.Element) -> list[dict]:
    """Every 별표/서식 unit: number, branch number, kind, title, text."""
    out = []
    for u in root.iter("별표단위"):
        out.append({
            "no": int(u.findtext("별표번호") or 0),
            "branch": int(u.findtext("별표가지번호") or 0),
            "kind": (u.findtext("별표구분") or "").strip(),
            "title": (u.findtext("별표제목") or "").strip(),
            "text": "".join(u.find("별표내용").itertext()) if u.find("별표내용") is not None else "",
            "pdf": (u.findtext("별표서식PDF파일링크") or "").strip(),
        })
    return out


def annex(root: ET.Element, no: int, branch: int = 0, kind: str = "별표") -> dict:
    for a in annexes(root):
        if a["no"] == no and a["branch"] == branch and a["kind"] == kind:
            return a
    raise LookupError(f"{kind} {no}의{branch} not found")


def article_text(root: ET.Element, no: int, branch: int = 0) -> str:
    """Full text of one article (조문 + 항 + 호 + 목) joined by newlines."""
    for u in root.iter("조문단위"):
        if u.findtext("조문여부") != "조문":
            continue
        if int(u.findtext("조문번호") or 0) != no:
            continue
        if int(u.findtext("조문가지번호") or 0) != branch:
            continue
        parts = []
        for el in u.iter():
            if el.tag in ("조문내용", "항내용", "호내용", "목내용") and el.text:
                parts.append("".join(el.itertext()).strip())
        return "\n".join(p for p in parts if p)
    raise LookupError(f"article {no}의{branch} not found")


def clean(s: str) -> str:
    return re.sub(r"\s+", " ", s or "").strip()
