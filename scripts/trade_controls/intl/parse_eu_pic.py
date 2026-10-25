"""EU PIC Regulation (EU) No 649/2012, consolidated text from the Publications Office (Cellar).

Annex I Part 1 (export notification), Part 2 (qualifying for PIC notification), Part 3 (PIC procedure /
explicit consent) and Annex V (export ban) are read from the consolidated XHTML tables.
The CELEX id of the latest consolidated version is looked up with the Cellar SPARQL endpoint.
A table row with all columns starts a chemical; shorter rows continue it (extra CAS numbers, or named
members such as the tributyltin compounds, which become entries of their own).
"""
from __future__ import annotations

import html
import re
import urllib.parse
from pathlib import Path

from intl_common import cas_tokens, clean, entry, fetch, file_info, split_entries

SPARQL = "https://publications.europa.eu/webapi/rdf/sparql"
CELLAR = "http://publications.europa.eu/resource/celex/{celex}"
QUERY = ('PREFIX cdm: <http://publications.europa.eu/ontology/cdm#> SELECT DISTINCT ?c WHERE {{ '
         '?w cdm:resource_legal_id_celex ?c . FILTER(STRSTARTS(STR(?c),"{prefix}")) }} ORDER BY DESC(?c) LIMIT 1')

# (key, heading text that opens the part, heading that closes it, number of columns of a full row)
PARTS = (
    ("part1", "PART 1 List of chemicals subject to export notification procedure", "PART 2 List of chemicals qualifying", 7),
    ("part2", "PART 2 List of chemicals qualifying for PIC notification", "PART 3 List of chemicals subject to the PIC", 6),
    ("part3", "PART 3 List of chemicals subject to the PIC procedure", "ANNEX II", 5),
)
ANNEX_V = ("annex5", "Persistent organic pollutants as listed in Annexes A and B to the Stockholm Convention", "ANNEX VI")


def latest_celex(prefix: str, raw_dir: Path, offline: bool) -> tuple[str, dict]:
    url = f"{SPARQL}?{urllib.parse.urlencode({'query': QUERY.format(prefix=prefix), 'format': 'text/csv'})}"
    path = fetch(url, raw_dir / "eurlex" / f"latest_{prefix}.csv", offline)
    rows = [r.strip().strip('"') for r in path.read_text(encoding="utf-8").splitlines()[1:] if r.strip()]
    if not rows:
        raise ValueError(f"no consolidated version found for {prefix}")
    return rows[0], file_info(path, url)


def _cells(row_html: str) -> list[str]:
    return [clean(html.unescape(re.sub(r"<[^>]+>", " ", c))) for c in re.findall(r"<t[dh][^>]*>.*?</t[dh]>", row_html, re.S)]


def _text_index(page: str, heading: str) -> int:
    """Position in the raw HTML of a heading given as plain text (tags and spacing ignored)."""
    words = [re.escape(w) for w in heading.split()]
    m = re.search(r"(?:\s|<[^>]+>)+".join(words), page)
    return m.start() if m else -1


def _rows(page: str, start: str, end: str) -> list[list[str]]:
    a = _text_index(page, start)
    b = _text_index(page[a + 1:], end) if a >= 0 else -1
    if a < 0 or b < 0:
        raise ValueError(f"section not found: {start}")
    seg = page[a:a + 1 + b]
    return [c for c in (_cells(r) for r in re.findall(r"<tr.*?</tr>", seg, re.S)) if c]


def _is_note(cells: list[str]) -> bool:
    return len(cells) == 1 and (cells[0].startswith("▼") or cells[0].startswith("(*") or cells[0].startswith("►"))


def _starts_with_name(cell: str) -> bool:
    return bool(re.match(r"^[—–-]?\s*[A-Za-z(]", cell)) and not re.match(r"^(ex |and others|i\(|p\(|sr|b$)", cell)


def parse_part(rows: list[list[str]], width: int, label: str) -> tuple[list[dict], int, list[str]]:
    """Rows of one Annex I part -> entry rows (cas_all), number of chemicals (full rows), 'and others' names."""
    header = [clean(re.sub(r"\(\s*\*\d\s*\)", "", h)) for h in rows[0]]
    out: list[dict] = []
    others: list[str] = []
    leads = 0
    current: dict | None = None
    for cells in rows[1:]:
        if _is_note(cells) or cells[0].startswith("(*1)"):
            continue
        if len(cells) == width and cells[0]:
            leads += 1
            detail = "; ".join(f"{h}: {v}" for h, v in zip(header[2:], cells[2:]) if v)
            current = entry("", re.sub(r"\(\s*\)", "", cells[0]), f"{label}; {detail}", cas_all=cas_tokens(cells[1]))
            out.append(current)
            if "and others" in cells[1]:
                others.append(current["name"])
            continue
        if current is None:
            continue
        text = " ".join(cells)
        if _starts_with_name(cells[0]) and cas_tokens(text):
            # named member listed under the chemical (e.g. Tributyltin oxide under tributyltin compounds)
            out.append(entry("", f"{current['name']} — {cells[0].lstrip('—– ')}", current["detail"], cas_all=cas_tokens(text)))
        else:
            current.setdefault("cas_all", [])
            current["cas_all"] += [c for c in cas_tokens(text) if c not in current["cas_all"]]
            if "and others" in text and current["name"] not in others:
                others.append(current["name"])
    return out, leads, others


def parse_annex5(rows: list[list[str]]) -> tuple[list[dict], int]:
    out: list[dict] = []
    for cells in rows:
        if _is_note(cells) or len(cells) < 2 or cells[0].startswith("Description of chemicals"):
            continue
        name, detail = (cells[1], cells[2]) if len(cells) >= 3 else (cells[0], cells[1])
        ban = cells[0] if len(cells) >= 3 and cells[0] else ""
        if not name or not detail:
            continue
        out.append(entry("", name, "; ".join(p for p in ("Annex V export ban", ban, detail) if p), cas_all=cas_tokens(detail)))
    return out, len(out)


def _result(rows: list[dict], counted: int, version: str, files: list[dict], others: list[str] | None = None) -> dict:
    entries, families, bad = split_entries(rows)
    for name in others or []:
        families.append(entry("", name, "CAS 'and others' — 표에 적힌 CAS 외 같은 계열(염·관련 화합물)도 해당"))
    return {"entries": entries, "family_entries": families, "problems": [f"invalid CAS in source: {bad}"] if bad else [],
            "official_count": None, "official_count_basis": "법령 표에 총 건수 기재 없음 — 표의 화학물질 행 수",
            "counted": counted, "source_version": version, "files": files,
            "notes": [f"표의 화학물질 행 {counted}개"]}


def collect(spec: dict, raw_dir: Path, offline: bool) -> dict:
    celex, q_info = latest_celex(spec["celex_prefix"], raw_dir, offline)
    url = CELLAR.format(celex=celex)
    path = fetch(url, raw_dir / "eurlex" / f"{celex}.html", offline,
                 headers={"Accept": "application/xhtml+xml", "Accept-Language": "eng"})
    page = path.read_text(encoding="utf-8")
    files = [q_info, file_info(path, url)]
    version = f"CELEX {celex} (consolidated {celex[-8:-4]}-{celex[-4:-2]}-{celex[-2:]})"
    out = {}
    for key, start, end, width in PARTS:
        rows, leads, others = parse_part(_rows(page, start, end), width, f"Annex I {key.replace('part', 'Part ')}")
        out[key] = _result(rows, leads, version, files, others)
    rows, n = parse_annex5(_rows(page, ANNEX_V[1], ANNEX_V[2]))
    out["annex5"] = _result(rows, n, version, files)
    return out
