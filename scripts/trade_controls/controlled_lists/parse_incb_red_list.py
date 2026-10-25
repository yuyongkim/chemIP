"""Parse Part One (Tables I and II) of the INCB Red List PDF.

Layout per substance (one visual block, blocks separated by a blank gap):
  row 1   x~72  English name (bold)            x~288 (Chemical Abstracts index name)
  row 2   x~108 French name                    x~288 HS code: nnnn.nn CAS number: n-n-n
  row 3   x~108 Spanish name
Long names wrap; English continuation rows start at x<100 before the HS/CAS row.
Superscript footnote markers (font size < 8) are dropped before reading words.
"""
from __future__ import annotations

import re
from pathlib import Path

import pdfplumber

PREP = re.compile(r"\S+ preparations \((?:retail|bulk)\): HS code \S+")
ANCHOR = re.compile(r"HS code:\s*(\S+)\s+CAS number:\s*(\S+)")
RIGHT_COL_X = 285
ENGLISH_X_MAX = 100
BLOCK_GAP = 15
ROW_MERGE = 2.5


def _rows(page) -> list[dict]:
    page = page.filter(lambda o: o.get("object_type") != "char" or o.get("size", 9) >= 8)
    words = page.extract_words(x_tolerance=1.5, keep_blank_chars=False)
    rows: list[dict] = []
    for w in sorted(words, key=lambda w: (round(w["top"], 1), w["x0"])):
        if rows and abs(rows[-1]["top"] - w["top"]) <= ROW_MERGE:
            rows[-1]["words"].append(w)
        else:
            rows.append({"top": w["top"], "words": [w]})
    for r in rows:
        r["words"].sort(key=lambda w: w["x0"])
        r["x0"] = r["words"][0]["x0"]
        r["left"] = " ".join(w["text"] for w in r["words"] if w["x0"] < RIGHT_COL_X)
        r["right"] = " ".join(w["text"] for w in r["words"] if w["x0"] >= RIGHT_COL_X)
        r["text"] = " ".join(w["text"] for w in r["words"])
    return rows


def _blocks(rows: list[dict]) -> list[list[dict]]:
    blocks: list[list[dict]] = []
    for r in rows:
        if blocks and r["top"] - blocks[-1][-1]["top"] <= BLOCK_GAP:
            blocks[-1].append(r)
        else:
            blocks.append([r])
    return blocks


def parse(pdf_path: Path) -> dict:
    out = {"edition": "", "table_I": [], "table_II": [], "anchor_count": {"I": 0, "II": 0}}
    table = None
    with pdfplumber.open(str(pdf_path)) as pdf:
        first = pdf.pages[0].extract_text() or ""
        m = re.search(r"\((\d+\w* edition, [A-Za-z]+ \d{4})\)", first)
        out["edition"] = m.group(1) if m else ""
        for page in pdf.pages[1:]:
            text = page.extract_text() or ""
            if "PART TWO" in text and table is not None:
                break
            for block in _blocks(_rows(page)):
                joined = " ".join(r["text"] for r in block)
                if "SUBSTANCES INCLUDED IN TABLE II" in joined:
                    table = "II"
                    continue
                if "SUBSTANCES INCLUDED IN TABLE I" in joined:
                    table = "I"
                    continue
                if table is None:
                    continue
                anchor_idx = next((i for i, r in enumerate(block) if ANCHOR.search(r["text"])), None)
                if anchor_idx is None:
                    continue
                out["anchor_count"][table] += 1
                hs, cas = ANCHOR.search(block[anchor_idx]["text"]).groups()
                head = block[:anchor_idx]
                if not head or head[0]["x0"] >= ENGLISH_X_MAX:
                    raise ValueError(f"unexpected block layout: {joined[:120]}")
                en = [head[0]["left"]] + [r["left"] for r in head[1:] if r["x0"] < ENGLISH_X_MAX]
                prep = [m.group(0) for r in block[anchor_idx + 1:]
                        for m in [PREP.search(r["text"])] if m]
                name = re.sub(r"(?<=-) (?=\w)", "", re.sub(r"\s+", " ", " ".join(en)).strip())  # re-join 'piperidine-1- carboxylate'
                if name.count("(") > name.count(")"):  # CA-index name spilled into left column
                    name = name[: name.rfind("(")].strip()
                out[f"table_{table}"].append({
                    "name": name,
                    "hs_code": hs,
                    "cas": "" if cas.lower() == "n/a" else cas,
                    "preparations_hs": prep,
                })
    return out
