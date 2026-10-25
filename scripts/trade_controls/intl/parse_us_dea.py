"""US DEA List I / List II chemicals — 21 CFR 1310.02 from the eCFR versioner API.

The CFR table gives "(n) name" + DEA chemical code; List I (42) has sub-items (i)-(viii) without codes.
CAS numbers are not printed in the CFR. They come only from the INCB Red List entries already parsed in
drug_precursors.json (curated incb_alias in sources/us_dea.json) or from a unique exact name match in the
EPA TSCA Inventory (CA Index Name). Unmatched items are kept as family_entries without CAS.
"""
from __future__ import annotations

import csv
import gzip
import html
import io
import json
import re
import zipfile
from pathlib import Path

from intl_common import clean, entry, fetch, file_info, split_entries

PROJECT = Path(__file__).resolve().parents[3]
ECFR_HEADERS = {"Accept": "application/xml", "Accept-Encoding": "gzip"}


def _read_text(path: Path) -> str:
    raw = path.read_bytes()
    if raw[:2] == b"\x1f\x8b":
        raw = gzip.decompress(raw)
    return raw.decode("utf-8")


def _latest_version(spec: dict, raw_dir: Path, offline: bool) -> tuple[str, Path]:
    d = spec["downloads"]["cfr_1310_02"]
    vpath = fetch(d["versions_url"], raw_dir / "us" / "ecfr_part1310_versions.json", offline,
                  headers={"Accept": "application/json", "Accept-Encoding": "gzip"})
    versions = json.loads(_read_text(vpath))["content_versions"]
    dates = sorted(v["date"] for v in versions if v["identifier"] == "1310.02")
    return dates[-1], vpath


def parse_rows(xml: str) -> list[dict]:
    """Rows: {list, no, sub, name, code}. List from the '(a) List I' / '(b) List II' paragraphs."""
    rows: list[dict] = []
    for part, label in (("(a) List I chemicals", "List I"), ("(b) List II chemicals", "List II")):
        start = xml.find(part)
        end = xml.find("</TABLE>", start)
        for tr in re.findall(r"<TR>(.*?)</TR>", xml[start:end], re.S):
            cells = [clean(html.unescape(re.sub(r"<[^>]+>", "", c))) for c in re.findall(r"<TD[^>]*>(.*?)</TD>", tr, re.S)]
            if not cells or not cells[0]:
                continue
            m = re.match(r"\((\d+)\)\s*(.*)", cells[0])
            s = re.match(r"\(([ivx]+)\)\s*(.*)", cells[0])
            code = cells[1] if len(cells) > 1 else ""
            if m:
                rows.append({"list": label, "no": int(m.group(1)), "sub": "", "name": m.group(2), "code": code})
            elif s and rows:
                rows.append({"list": label, "no": rows[-1]["no"], "sub": s.group(1), "name": s.group(2), "code": ""})
    return rows


def _primary_name(name: str) -> str:
    """'Iodine' from 'Iodine'; 'Benzyl cyanide' from 'Benzyl cyanide'; cut ', its ...', ' and its ...', ' (...'."""
    base = re.split(r",\s+its\b| and its\b| and any\b|\s+\(", name, maxsplit=1)[0]
    return clean(base).rstrip(",")


def _tsca_names(zip_path: Path, member: str) -> dict[str, list[str]]:
    with zipfile.ZipFile(zip_path) as z:
        text = z.read(member).decode("utf-8", errors="replace")
    names: dict[str, list[str]] = {}
    for row in csv.DictReader(io.StringIO(text)):
        names.setdefault(row["ChemName"].strip().lower(), []).append(row["CASRN"].strip())
    return names


def collect(spec: dict, raw_dir: Path, offline: bool) -> dict:
    d = spec["downloads"]
    date, vpath = _latest_version(spec, raw_dir, offline)
    url = d["cfr_1310_02"]["url"].format(date=date)
    path = fetch(url, raw_dir / d["cfr_1310_02"]["file"], offline, headers=ECFR_HEADERS)
    rows = parse_rows(_read_text(path))

    incb = json.loads((PROJECT / spec["incb_source"]).read_text(encoding="utf-8"))
    incb_cas = {e["name"]: e["cas"] for e in incb["entries"] if e.get("cas_source") == "INCB Red List" and e.get("cas")}
    alias = {k: v for k, v in spec["incb_alias"].items() if not k.startswith("_")}

    tsca_path = raw_dir / d["tsca_inventory"]["file"]
    files = [file_info(path, url), file_info(vpath, d["cfr_1310_02"]["versions_url"])]
    tsca = {}
    if tsca_path.exists():  # downloaded by the EPA collector; reused read-only here
        tsca = _tsca_names(tsca_path, d["tsca_inventory"]["member"])
        files.append(file_info(tsca_path, d["tsca_inventory"]["url"]))

    out, problems, notes, unmatched = [], [], [], []
    methods: dict[str, int] = {}
    for r in rows:
        key = f"{r['list']} ({r['no']})" + (f"({r['sub']})" if r["sub"] else "")
        detail = f"{key}" + (f"; DEA chemical code {r['code']}" if r["code"] else "; sub-item of List I (42), code 8526")
        cas, method, basis = "", "", ""
        if key in alias:
            incb_name, basis = alias[key]
            if incb_name in incb_cas:
                cas, method = incb_cas[incb_name], "incb_name"
                basis = f"INCB Red List '{incb_name}' ({basis})"
            else:
                problems.append(f"{key}: alias target '{incb_name}' not in INCB entries with CAS")
        if not cas and tsca:
            hits = tsca.get(_primary_name(r["name"]).lower(), [])
            if len(hits) == 1:
                cas, method, basis = hits[0], "tsca_inventory_name", f"EPA TSCA Inventory CA Index Name '{_primary_name(r['name'])}'"
        if cas:
            methods[method] = methods.get(method, 0) + 1
            out.append(entry("", r["name"], detail, cas_all=[cas], category=r["list"], match_method=method, cas_source=basis))
        else:
            unmatched.append(key)
            out.append(entry("", r["name"], detail, category=r["list"], match_method="no_cas"))
    entries, families, bad = split_entries(out)
    if bad:
        problems.append(f"invalid CAS: {bad}")
    top = [r for r in rows if not r["sub"]]
    n1 = sum(1 for r in top if r["list"] == "List I")
    n2 = sum(1 for r in top if r["list"] == "List II")
    for label, n in (("List I", n1), ("List II", n2)):
        nums = [r["no"] for r in top if r["list"] == label]
        if nums != list(range(1, n + 1)):
            problems.append(f"{label} paragraph numbers not consecutive: {nums}")
    notes.append(f"21 CFR 1310.02 version {date}: List I {n1} paragraphs (+{len(rows) - len(top)} sub-items of (42)), List II {n2}.")
    notes.append(f"CAS match_method counts: {methods}; no CAS (family_entries): {', '.join(unmatched)}")
    return {"dea": {
        "entries": entries, "family_entries": families, "problems": problems,
        "official_count": n1 + n2, "official_count_basis": "numbered paragraphs in 1310.02(a) and (b) (count of the eCFR text itself)",
        "counted": len(top), "source_version": f"eCFR 21 CFR 1310.02, version date {date}",
        "notes": notes, "files": files,
    }}
