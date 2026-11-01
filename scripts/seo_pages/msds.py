"""Parse KOSHA MSDS section 2 (hazard identification) XML into signal word, pictograms, H-statements, classes. Pure."""
from __future__ import annotations

import re
import xml.etree.ElementTree as ET

# KOSHA msdsItemCode values inside section 2
CODE_CLASSES = "B02"
CODE_PICTOGRAMS = "B0402"
CODE_SIGNAL = "B0404"
CODE_HSTATEMENTS = "B0406"
NO_DATA = {"자료없음", "해당없음", "-", ""}

_PICT_RE = re.compile(r"GHS0?(\d{1,2})", re.I)
_H_RE = re.compile(r"^\s*((?:EU)?H\d{3}[A-Za-z]{0,2}(?:\s*\+\s*H\d{3}[A-Za-z]{0,2})*)\s*[:：]?\s*(.*)$")


def _items(xml: str) -> dict[str, str]:
    try:
        root = ET.fromstring(xml.encode("utf-8") if isinstance(xml, str) else xml)
    except ET.ParseError:
        return {}
    out: dict[str, str] = {}
    for item in root.iter("item"):
        code = (item.findtext("msdsItemCode") or "").strip()
        detail = (item.findtext("itemDetail") or "").strip()
        if code:
            out[code] = detail
    return out


def _short(text: str) -> str:
    """Drop the long KOSHA drafting notes in parentheses, e.g. 'H350 : 암을 일으킬 수 있음(… 기재한다 …)'."""
    text = re.sub(r"\((?:[^()]*?(?:기재|명시|경우에 한)[^()]*)\)", "", text).strip()
    # nested notes, e.g. '…일으킴(특정표적장기독성(반복노출)을 일으키는 노출 경로를 기재. …)': cut the trailing note
    if text.endswith(")"):
        depth = 0
        for i in range(len(text) - 1, -1, -1):
            depth += {")": 1, "(": -1}.get(text[i], 0)
            if depth == 0:
                if re.search(r"기재|명시하|경우에 한", text[i:]):
                    text = text[:i].rstrip()
                break
    return re.sub(r"\s+", " ", text)


def parse_section2(xml: str | None) -> dict:
    """{'signal_word', 'pictograms': ['GHS02', ...], 'h_statements': [{'code','text'}], 'classes': [str]}."""
    empty = {"signal_word": "", "pictograms": [], "h_statements": [], "classes": []}
    if not xml:
        return empty
    items = _items(xml)
    if not items:
        return empty
    signal = items.get(CODE_SIGNAL, "").strip()
    picts = []
    for part in items.get(CODE_PICTOGRAMS, "").split("|"):
        m = _PICT_RE.search(part)
        if m:
            code = f"GHS{int(m.group(1)):02d}"
            if code not in picts:
                picts.append(code)
    hs, seen = [], set()
    for part in items.get(CODE_HSTATEMENTS, "").split("|"):
        m = _H_RE.match(part.strip())
        if not m:
            continue
        code = re.sub(r"\s+", "", m.group(1))
        if code in seen:
            continue
        seen.add(code)
        hs.append({"code": code, "text": _short(m.group(2))})
    classes = [c.strip() for c in items.get(CODE_CLASSES, "").split("|") if c.strip() not in NO_DATA]
    return {
        "signal_word": "" if signal in NO_DATA else signal,
        "pictograms": picts,
        "h_statements": hs,
        "classes": classes,
    }
