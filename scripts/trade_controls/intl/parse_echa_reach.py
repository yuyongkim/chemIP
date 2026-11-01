"""EU REACH registration status from ECHA CHEM, for a bounded set of CAS numbers only.

Why bounded: the ECHA legal notice (https://echa.europa.eu/legal-notice, s. 5.1.1 B, read 2026-11-01) allows reuse of
information with the acknowledgement "Source: European Chemicals Agency, https://echa.europa.eu/", but NOT the
replication of "whole or substantial parts of databases", and it prohibits systematic automated collection of a
whole or substantial part. ECHA publishes no open bulk file of registered substances (data.europa.eu has none; the
old "Registered substances" pages were decommissioned on 18 December 2025). So this collector looks up only the CAS
numbers in spec["cas_sets"] and stops at spec["max_substances"] (an insubstantial part of the ~23,000 registered
substances). A full list needs ECHA's prior written permission (ECHA contact page, information request form).

Per CAS (ECHA CHEM JSON API behind the substance pages, no key):
  /api-substance/v1/substance?searchText=<CAS>      → rmlId whose rmlCas is the CAS (else the one hit listing it)
  /api-substance/v1/substance/<rmlId>                → rmlEc, tonnageBand, listParticipation ("REACH REGISTERED")
  /api-dossier-list/v1/dossier?rmlId=..&legislation=REACH&registrationStatuses=Active&pageSize=100
                                                    → active registrations: count, dossierSubtype, NONS flag, dates
Only substances ECHA shows as registered (listParticipation or ≥1 active REACH registration) become entries.
Values are copied as ECHA shows them (tonnage band text, subtype names); nothing is estimated.
"""
from __future__ import annotations

import json
import re
import time
from collections import Counter
from pathlib import Path
from urllib.parse import quote

from intl_common import cas_is_valid, clean, entry, fetch, file_info

BASE = "https://chem.echa.europa.eu"
SEARCH = BASE + "/api-substance/v1/substance?searchText={q}&pageIndex=1&pageSize=20"
SUBSTANCE = BASE + "/api-substance/v1/substance/{rml}"
DOSSIERS = BASE + "/api-dossier-list/v1/dossier?rmlId={rml}&legislation=REACH&registrationStatuses=Active&pageIndex={page}&pageSize=100"
PAGE_URL = BASE + "/{rml}"
HEADERS = {"Accept": "application/json"}
CAS_IN_TEXT = re.compile(r'"?(\d{2,7}-\d{2}-\d)"?')

# ECHA dossierSubtype → short English label (the subtype text itself is kept in the counts)
SUBTYPE_LABELS = (  # ECHA prints e.g. "Article 10 - full", "Article 17 - intermediate", "Article 18 - intermediate"
    ("article 10", "full registration (Art. 10)"),
    ("article 17", "on-site isolated intermediate (Art. 17)"),
    ("article 18", "transported isolated intermediate (Art. 18)"),
)


def _get(url: str, dest: Path, offline: bool, pause: float) -> tuple[dict, dict]:
    if not offline and not dest.exists():
        time.sleep(pause)
    path = fetch(url, dest, offline or dest.exists(), headers=HEADERS)
    return json.loads(path.read_text(encoding="utf-8")), file_info(path, url)


def cas_set(spec: dict, project: Path) -> list[str]:
    """CAS numbers to look up, in spec order, unique, check digit valid, at most spec['max_substances']."""
    out: list[str] = []
    for src in spec.get("cas_sets") or []:
        if src.get("file"):
            text = (project / src["file"]).read_text(encoding="utf-8")
            found = re.findall(src.get("regex") or r'cas:\s*"(\d{2,7}-\d{2}-\d)"', text)
        elif src.get("list_file"):
            data = json.loads((project / src["list_file"]).read_text(encoding="utf-8"))
            found = [e.get("cas") or "" for e in data.get("entries") or []]
        elif src.get("intl_regulatory"):
            import sqlite3

            db = (project / "data" / "terminology.db").as_posix()
            with sqlite3.connect(f"file:{db}?mode=ro", uri=True) as conn:
                found = [r[0] for r in conn.execute("SELECT cas_no FROM intl_regulatory WHERE regulation = ? ORDER BY id",
                                                    (src["intl_regulatory"],))]
        else:
            found = list(src.get("cas") or [])
        out.extend(c for c in found if c and cas_is_valid(c) and c not in out)
    return out[: int(spec.get("max_substances") or 0)]


def pick_substance(cas: str, items: list[dict]) -> tuple[dict | None, str]:
    """The search hit for this CAS: the one whose reference CAS (rmlCas) is it, else the only hit listing it."""
    idx = [it.get("substanceIndex") or {} for it in items]
    exact = [s for s in idx if (s.get("rmlCas") or "").strip() == cas]
    if len(exact) == 1:
        return exact[0], "ECHA CHEM rmlCas"
    registered = [x for x in exact if "REACH REGISTERED" in (x.get("listParticipation") or [])]
    if len(exact) > 1 and len(registered) == 1:  # e.g. citric acid 201-069-1 (registered) and 680-681-4 (list number)
        return registered[0], f"ECHA CHEM rmlCas (the registered one of {len(exact)})"
    listed = [s for s in idx if cas in (s.get("casNumber") or [])]
    if len(listed) == 1:
        return listed[0], "ECHA CHEM casNumber"
    return None, f"{len(exact)} rmlCas / {len(listed)} casNumber hits"


def subtype_label(subtype: str) -> str:
    low = (subtype or "").lower()
    for key, label in SUBTYPE_LABELS:
        if key in low:
            return label
    return clean(subtype) or "unspecified"


def summarize_dossiers(dossiers: list[dict]) -> dict:
    """Active REACH registrations → counts per type, NONS count, first registration, latest update."""
    types = Counter(subtype_label((d.get("reachDossierInfo") or {}).get("dossierSubtype", "")) for d in dossiers)
    nons = sum(1 for d in dossiers if ((d.get("reachDossierInfo") or {}).get("nonsAssetFlag") or "").upper() == "T")
    reg_dates = sorted(d.get("registrationDate") or "" for d in dossiers if d.get("registrationDate"))
    upd = sorted(d.get("lastUpdatedDate") or "" for d in dossiers if d.get("lastUpdatedDate"))
    lead = [d for d in dossiers if "lead" in ((d.get("reachDossierInfo") or {}).get("registrationRole") or "").lower()]
    return {"active": len(dossiers), "types": dict(types.most_common()), "nons": nons,
            "first_registered": reg_dates[0] if reg_dates else "", "last_updated": upd[-1] if upd else "",
            "joint_submission": bool(lead)}


def detail_text(sub: dict, summary: dict, total: int) -> str:
    parts = []
    if sub.get("rmlEc"):
        parts.append(f"EC {sub['rmlEc']}")
    types = ", ".join(f"{k} {v}" for k, v in summary["types"].items())
    parts.append(f"REACH registered — active registrations {total}" + (f" ({types})" if types else ""))
    if summary["nons"]:
        parts.append(f"NONS (notified under Directive 67/548/EEC) {summary['nons']}")
    if sub.get("tonnageBand"):
        parts.append(f"total tonnage band {clean(sub['tonnageBand'])} per annum")
    if summary["first_registered"]:
        parts.append(f"first registration {summary['first_registered']}")
    if summary["last_updated"]:
        parts.append(f"latest dossier update {summary['last_updated']}")
    parts.append(f"ECHA CHEM {PAGE_URL.format(rml=sub.get('rmlId', ''))}")
    return "; ".join(parts)


def lookup(cas: str, raw: Path, offline: bool, pause: float) -> tuple[dict | None, str, list[dict]]:
    """One CAS → (entry or None, note, file infos)."""
    files = []
    found, info = _get(SEARCH.format(q=quote(cas)), raw / f"{cas}_search.json", offline, pause)
    files.append(info)
    sub_idx, how = pick_substance(cas, found.get("items") or [])
    if not sub_idx:
        return None, f"{cas}: no unique ECHA substance ({how})", files
    rml = sub_idx.get("rmlId") or ""
    sub, info = _get(SUBSTANCE.format(rml=quote(rml)), raw / f"{cas}_substance.json", offline, pause)
    files.append(info)
    dossiers: list[dict] = []
    page, total = 1, 0
    while True:
        data, info = _get(DOSSIERS.format(rml=quote(rml), page=page), raw / f"{cas}_dossiers_p{page:02d}.json", offline, pause)
        files.append(info)
        dossiers.extend(data.get("items") or [])
        total = int((data.get("state") or {}).get("totalItems") or 0)
        if len(dossiers) >= total or not data.get("items"):
            break
        page += 1
    listed = "REACH REGISTERED" in (sub.get("listParticipation") or [])
    if not listed and not dossiers:
        return None, f"{cas}: not REACH registered on ECHA CHEM ({rml})", files
    summary = summarize_dossiers(dossiers)
    name = sub.get("rmlName") or sub_idx.get("rmlName") or ""
    item = entry(cas, name, detail_text(sub, summary, total), ec=sub.get("rmlEc") or "", echa_id=rml,
                 match_method=how, tonnage_band=clean(sub.get("tonnageBand") or ""),
                 active_registrations=total, registration_types=summary["types"], nons=summary["nons"],
                 first_registered=summary["first_registered"], last_updated=summary["last_updated"],
                 url=PAGE_URL.format(rml=rml))
    return item, "", files


def run_dir(base: Path, offline: bool) -> Path:
    """Raw answers of one run sit in a dated folder; offline re-parses the newest one."""
    import datetime as dt

    if offline:
        days = sorted(p for p in base.glob("20*") if p.is_dir())
        if not days:
            raise FileNotFoundError(f"offline mode but no raw run under {base}")
        return days[-1]
    return base / dt.date.today().isoformat()


def collect(spec: dict, raw_dir: Path, offline: bool) -> dict:
    project = Path(__file__).resolve().parents[3]
    meta = spec["lists"]["registered"]
    wanted = cas_set(meta, project)
    raw = run_dir(raw_dir / "echa" / "reach_reg", offline)
    pause = float(meta.get("pause_seconds") or 1.0)
    entries, notes, files, problems = [], [], [], []
    for cas in wanted:
        try:
            item, note, infos = lookup(cas, raw, offline, pause)
        except Exception as exc:  # one failed lookup is a problem, not a crash
            problems.append(f"{cas}: lookup failed: {exc}")
            continue
        files.extend(infos)
        if item:
            entries.append(item)
        elif note:
            notes.append(note)
    return {"registered": {
        "entries": entries, "family_entries": [], "problems": problems,
        "official_count": None, "counted": len(entries),
        "source_version": f"ECHA CHEM REACH registrations, {len(entries)} registered of {len(wanted)} CAS looked up",
        "notes": [f"조회 범위: {len(wanted)}개 CAS(상한 {meta.get('max_substances')}) — ECHA 법적 고지상 DB 전체·상당 부분 복제 금지",
                  *notes],
        "files": files,
    }}
