"""Parse the Australia Group 'Export Control List: Chemical Weapons Precursors' PDF."""
from __future__ import annotations

import re
from pathlib import Path

import pdfplumber

ENTRY_START = re.compile(r"^(\d{1,3})\.\s+(.*)$")
TAIL = re.compile(r"^(.*?)\s*\((\d{2,7}-\d{2}-\d)\)\s*(1B|2B|3B|Not Listed)?\s*$")
DATE_RE = re.compile(r"^\d{1,2} [A-Z][a-z]+ \d{4}$")


def parse(pdf_path: Path) -> dict:
    with pdfplumber.open(str(pdf_path)) as pdf:
        lines = []
        for page in pdf.pages:
            lines.extend((page.extract_text() or "").splitlines())
    version = next((l.strip() for l in lines[:6] if DATE_RE.match(l.strip())), "")
    entries, cur, footer = [], None, []
    for line in lines:
        s = line.strip()
        if s.startswith("Technical note"):
            cur = None
            footer.append(s)
            continue
        if footer:
            footer.append(s)
            continue
        m = ENTRY_START.match(s)
        if m and (cur is None or cur.get("cas")):
            cur = {"no": int(m.group(1)), "text": m.group(2)}
            entries.append(cur)
        elif cur is not None and not cur.get("cas") and not s.isdigit():
            cur["text"] += " " + s
        else:
            continue
        t = TAIL.match(cur["text"])
        if t:
            cur.update({"name": re.sub(r"\s+", " ", t.group(1)).strip(), "cas": t.group(2),
                        "cwc_schedule": t.group(3) or ""})
    note = " ".join(footer)
    note = re.sub(r"\s\d+$", "", note)  # trailing page number
    return {"version": version, "entries": entries, "technical_note": note}
