"""위험물 선박운송 기준 [별표 1] 위험물목록 (attached HWP) -> row records.

The HWP renders one table cell per paragraph. A row starts with a line holding the
4-digit UN number (국제연합번호 column) and ends with the same number repeated in the
last column. Inside a row: Korean name lines (Hangul), English proper shipping name
lines, then 정표찰(class), 부표찰(subsidiary), optional 'P' (marine pollutant), 용기등급.
"""
from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from pathlib import Path

from kr_env import hwp_text

from . import config, lawsrc

RULE = "위험물 선박운송 기준"
ANNEX_FILE_HINT = "[별표 1] 위험물목록"
_UN = re.compile(r"^\d{4}$")
_CLASS = re.compile(r"^(?:1|2|1\.[1-6][A-SN]?|2\.[1-3]|3|4\.[1-3]|5\.[12]|6\.[12]|7|8|9)$")
_DASH = {"-", "－", "—", "–", "", "�", "??"}
_SUB = re.compile(r"^[1-9](?:\.[1-6])?(?:/[1-9](?:\.[1-6])?)*$")
_PG = {"1": "I", "2": "II", "3": "III", "I": "I", "II": "II", "III": "III", "Ⅰ": "I", "Ⅱ": "II", "Ⅲ": "III"}
MAX_ROW_LINES = 160


def _hangul(s: str) -> bool:
    return any("가" <= ch <= "힣" for ch in s)


def _norm_cell(s: str) -> str:
    s = "".join(ch for ch in s if ch != "�" and ord(ch) < 0xF0000).strip()  # HWP PUA glyphs (dash) dropped
    return "-" if s in _DASH or set(s) <= {"?"} else s


def annex_attachment(doc: lawsrc.LawDoc) -> tuple[str, str]:
    names = [(e.text or "").strip() for e in doc.root.iter("첨부파일명")]
    links = [(e.text or "").strip() for e in doc.root.iter("첨부파일링크")]
    for n, l in zip(names, links):
        if ANNEX_FILE_HINT in n and n.lower().endswith(".hwp"):
            return n, l
    raise LookupError(f"{RULE}: attachment '{ANNEX_FILE_HINT}' not found")


def download(doc: lawsrc.LawDoc) -> tuple[Path, str, str]:
    name, link = annex_attachment(doc)
    seq = re.search(r"flSeq=(\d+)", link).group(1)
    path = config.RAW_ROOT / "ship" / f"dgl_flSeq{seq}.hwp"
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(lawsrc.download(link.replace("http://", "https://")))
    return path, name, link


def _join_ko(parts: list[str]) -> str:
    out = ""
    for p in parts:
        out = p if not out else (out + p if p.startswith("(") or out.endswith("(") else out + " " + p)
    return re.sub(r"\s+", " ", out).strip()


def _join_en(parts: list[str]) -> str:
    out = ""
    for p in parts:
        out = p if not out else (out + p if out.endswith("-") else out + " " + p)
    return re.sub(r"\s+", " ", out).strip()


def _class_tok(s: str) -> str | None:
    t = re.sub(r"^1,([1-6][A-SN])$", r"1.\1", s)        # '1,3C' misprint in the 고시 for 1.3C
    return t if _CLASS.match(t) else None


_NOTE_WORDS = ("특별요건", "참조", "참고", "규칙")


def _note(rest: list[str], q: int) -> tuple[str | None, int]:
    """Cells like '특별요건204참조', '특별요건' '181' '참조', '국제해상위험물규칙 참조' -> (text, next index)."""
    if q >= len(rest) or not any(w in rest[q] for w in _NOTE_WORDS):
        return None, q
    parts = [rest[q]]
    q += 1
    while "참조" not in parts[-1] and "참고" not in parts[-1] and q < len(rest) and len(parts) < 4:
        parts.append(rest[q])
        q += 1
    return " ".join(parts), q


def _subsidiary(rest: list[str]) -> tuple[str, int, str | None, bool]:
    """(subsidiary or '-', tokens used, note, ok) from the cells after the class cell."""
    if not rest:
        return "-", 0, None, False
    first = rest[0]
    if first == "P":                       # 부표찰 cell empty, marine-pollutant mark printed
        return "-", 0, None, True
    note, q = _note(rest, 0)
    if note:
        return "-", q, note, True
    if first != "-" and not _SUB.match(first.rstrip("/")):
        return "-", 0, None, False
    sub, q = first.rstrip("/"), 1
    joined = first.endswith("/")
    # multi-part subsidiary risk printed on several cells ('5.1' '8', '3' '/6.1', '3/' '8')
    while sub != "-" and q < len(rest) and rest[q] not in ("P", "-") and _SUB.match(rest[q].strip("/")) \
            and (joined or rest[q].startswith("/") or rest[q] not in _PG):
        joined = rest[q].endswith("/")
        sub, q = f"{sub}/{rest[q].strip('/')}", q + 1
    return sub, q, None, True


def _row(un: str, body: list[str]) -> dict | None:
    k, ko, en = 0, [], []
    while k < len(body) and _hangul(body[k]):
        ko.append(body[k]); k += 1
    while k < len(body) and not _class_tok(body[k]):
        en.append(body[k]); k += 1
    if k >= len(body) or not (ko or en):
        return None
    cls, rest = _class_tok(body[k]), body[k + 1:]
    sub, q, note, ok = _subsidiary(rest)
    mp = q < len(rest) and rest[q] == "P"
    q += 1 if mp else 0
    pg_note, q2 = _note(rest, q)
    pg_raw = None if pg_note else (rest[q] if (ok and q < len(rest)) else None)
    if not pg_note and (pg_raw is None or (pg_raw != "-" and pg_raw not in _PG)):
        ok = False
    row = {"un_number": un, "name_ko": _join_ko(ko), "name_en": _join_en(en) or None,
           "class": cls, "subsidiary_risk": None if sub == "-" or not ok else sub,
           "packing_group": _PG.get(pg_raw or "") if ok else None, "marine_pollutant": mp}
    if body[k] != cls:
        row["class_printed"] = body[k]
    if note:
        row["subsidiary_note"] = note
    if pg_note:
        row["packing_group_note"] = pg_note
    if not ok:
        row["columns_unparsed"] = "부표찰/용기등급 칸 해석 불가 (원문 확인 필요)"
    return row


def _next_row_start(lines: list[str], i: int, limit: int) -> int | None:
    for j in range(i + 1, min(len(lines), i + limit)):
        if _UN.match(lines[j]):
            nxt = next((x for x in lines[j + 1:j + 3] if x), "")
            if _hangul(nxt):
                return j
    return None


def parse_rows(lines: list[str]) -> tuple[list[dict], dict]:
    """Return (rows, stats). The main table is sorted by UN number; a drop of more than
    100 marks the start of the later tables (P200 gas table, peroxide lists) and ends parsing."""
    rows, i, n, last_end, skipped, used = [], 0, len(lines), 0, [], set()
    while i < n:
        un = lines[i]
        if not _UN.match(un):
            i += 1
            continue
        if rows and int(un) < int(rows[-1]["un_number"]) - 100:
            break
        i0 = i
        end = next((j for j in range(i + 1, min(n, i + MAX_ROW_LINES)) if lines[j] == un), None)
        closure = True
        if end is None:
            nxt = next((x for x in lines[i + 1:i + 3] if x), "")
            if rows and int(un) >= int(rows[-1]["un_number"]) and _hangul(nxt):
                end, closure = _next_row_start(lines, i, MAX_ROW_LINES), False   # last-column number missing (e.g. UN3555)
            if end is None:
                i += 1
                continue
        if not any(x.strip() for x in lines[i + 1:end]):
            # number printed twice at the row start and not in the last column (e.g. UN2905)
            i = end
            end = next((j for j in range(i + 1, min(n, i + MAX_ROW_LINES)) if lines[j] == un), None)
            if end is None:
                end, closure = _next_row_start(lines, i, MAX_ROW_LINES), False
            if end is None:
                i += 1
                continue
        row = _row(un, [_norm_cell(x) for x in lines[i + 1:end] if x.strip()])
        if row is not None and not closure:
            row["row_end_inferred"] = "마지막 열 국제연합번호 없음 — 다음 행 시작까지를 한 행으로 처리"
            end -= 1
        if row is None:
            skipped.append(un)
            i += 1
            continue
        rows.append(row)
        used.update(range(i0, end + 1))
        last_end = end
        i = end + 1
    region = [(j, x) for j, x in enumerate(lines[:last_end + 1]) if x]
    starts = [(j, a) for (j, a), (_, b) in zip(region, region[1:]) if _UN.match(a) and _hangul(b)]
    stray = [{"line": j, "un": a} for j, a in starts if j not in used]
    return rows, {"row_starts_in_table_region": len(starts), "rows": len(rows),
                  "closure_without_class": skipped, "starts_outside_rows": stray}


def load() -> tuple[lawsrc.LawDoc, list[dict], dict, dict]:
    doc = lawsrc.fetch_admrul(RULE)
    path, name, link = download(doc)
    text = hwp_text.extract_text(path.read_bytes())
    # hwp_text emits UTF-16 code units one by one: re-pair surrogates, lone ones -> U+FFFD
    text = text.encode("utf-16-le", "surrogatepass").decode("utf-16-le", "replace")
    lines = [ln.strip() for ln in text.split("\n")]
    rows, stats = parse_rows(lines)
    src = {"attachment_name": name, "attachment_url": link, "raw_file": str(path)}
    return doc, rows, stats, src
