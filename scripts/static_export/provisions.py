"""Writes pv/<CAS>.json (gzip bytes): the statutory provisions ("근거 조문") panel's answers for a bounded CAS set.

Body per country = exact output of GET /api/integrations/provisions/{cas}?country=<CC>&name=<name>, built with the
backend function the route calls (backend.integrations.epc_regulation_text.find_provisions → EPC query service).

What the UI sends (product_intl.jsx → product_provisions.jsx → api_integrations.jsx useProvisions):
- country: the jurisdiction selected on the map, only when it is an EPC index country. The map offers the jurisdictions the
  CAS is listed in (p/<CAS>.json intl.jurisdictions), so countries = EPC_JURISDICTION keys ∩ those listings.
- name: selected.name_en || "" (it is part of the search query "<name> <cas>"). A ?chem=<CAS> link opens the search item
  with that CAS (has_msds first, then KOSHA; api_chemicals.jsx resolveLinkChemId) and takes name_en from its detail; a
  search click takes the item's name_en. Both are the same value for every CAS of the set (checked when this was added).
  The name is stored in the file and the client uses the file only when its request has the same name.

CAS set: SEO tier 1 (config.SEO_FACTS rows with indexable) ∪ the benchmark list (config.BENCHMARK_SUBSTANCES).
Needs the search/ and p/ steps' output. Resumable: answers already in a file (same name) are kept, only missing countries
are asked. A failed call (service down, time-out) is left out of the file and reported; rerun to retry.
Report: reports/provisions_index.csv (cas, name, countries, hits, errors, raw, gz).
"""
from __future__ import annotations

import csv
import json
import os
import re
import time
from concurrent.futures import ThreadPoolExecutor

import config
import db  # noqa: F401  (puts G:\MSDS on sys.path)
from jsonio import SizeStats, read_any, write_gzip

_CAS_RE = re.compile(config.CAS_PATTERN)


def provisions_path(cas: str, root: str = config.PROVISIONS_DIR) -> str:
    return os.path.join(root, f"{cas}.json")


def cas_set() -> list[str]:
    with open(config.SEO_FACTS, encoding="utf-8") as fh:
        tier1 = {r["cas"] for r in map(json.loads, fh) if r.get("indexable")}
    with open(config.BENCHMARK_SUBSTANCES, encoding="utf-8") as fh:
        bench = {i["cas"] for i in json.load(fh)["items"]}
    return sorted(c for c in tier1 | bench if _CAS_RE.match(c or ""))


def ui_request(cas: str, index, countries: list[str]) -> tuple[str, list[str]] | None:
    """(name, countries) the UI would send for this CAS, or None when the panel never asks (no page / no EPC country)."""
    items = [i for i in index.search(cas)["items"] if i["cas_no"] == cas and i["chem_id"]]
    pref = next((i for i in items if i["has_msds"]), None) or next((i for i in items if i["source"] == "KOSHA"), None)
    page_path = os.path.join(config.PAGES_DIR, f"{pref['chem_id'] if pref else cas}.json")
    if not os.path.exists(page_path):
        return None
    page = read_any(page_path)
    listed = ((page.get("intl") or {}).get("jurisdictions")) or {}
    wanted = [c for c in countries if c in listed]
    return ((page.get("detail") or {}).get("name_en") or "", wanted) if wanted else None


def _previous(cas: str, name: str) -> dict:
    path = provisions_path(cas)
    if not os.path.exists(path):
        return {}
    old = read_any(path)
    return dict(old.get("countries") or {}) if old.get("name") == name else {}


def _remove_outside(keep: set[str]) -> int:
    os.makedirs(config.PROVISIONS_DIR, exist_ok=True)
    stale = [f for f in os.listdir(config.PROVISIONS_DIR) if f.endswith(".json") and f[:-5] not in keep]
    for f in stale:
        os.remove(os.path.join(config.PROVISIONS_DIR, f))
    return len(stale)


def export_provisions(log=print) -> dict:
    from backend.integrations.epc_regulation_text import EPC_JURISDICTION, find_provisions
    from static_search import StaticIndex

    t0 = time.time()
    index, countries = StaticIndex(), list(EPC_JURISDICTION)
    plan = {}
    for cas in cas_set():
        req = ui_request(cas, index, countries)
        if req:
            plan[cas] = req
    removed = _remove_outside(set(plan))
    answers = {cas: _previous(cas, name) for cas, (name, _) in plan.items()}
    reused = sum(len(a) for a in answers.values())
    jobs = [(cas, cc) for cas, (_, wanted) in plan.items() for cc in wanted if cc not in answers[cas]]
    log(f"provisions: {len(plan)} CAS, {len(jobs)} calls to ask, {reused} kept from earlier runs")

    def ask(job):
        cas, cc = job
        return cas, cc, find_provisions(cc, cas, plan[cas][0])

    errors: list[dict] = []
    with ThreadPoolExecutor(max_workers=config.PROVISIONS_CONCURRENCY) as pool:
        for n, (cas, cc, body) in enumerate(pool.map(ask, jobs), 1):
            if body.get("available"):
                answers[cas][cc] = body
            else:
                errors.append({"cas": cas, "country": cc, "reason": body.get("reason")})
            if n % 200 == 0:
                log(f"provisions: {n}/{len(jobs)} asked, {len(errors)} errors")

    stats, today = SizeStats(), time.strftime("%Y-%m-%d")
    os.makedirs(config.REPORTS, exist_ok=True)
    with open(os.path.join(config.REPORTS, "provisions_index.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["cas", "name", "countries", "hits", "errors", "raw", "gz"])
        for cas, (name, wanted) in plan.items():
            got = {cc: answers[cas][cc] for cc in wanted if cc in answers[cas]}
            missing = [cc for cc in wanted if cc not in got]
            if not got:
                w.writerow([cas, name, "", 0, " ".join(missing), 0, 0])
                continue
            path = provisions_path(cas)
            old = read_any(path) if os.path.exists(path) else {}
            exported_at = old.get("exported_at") if old.get("name") == name and old.get("countries") == got else today
            obj = {"v": config.PROVISIONS_FORMAT, "cas": cas, "name": name, "exported_at": exported_at, "countries": got}
            raw, packed = write_gzip(path, obj, config.GZIP_LEVEL)
            stats.add("pv", raw, packed)
            w.writerow([cas, name, " ".join(got), sum(len(b["hits"]) for b in got.values()), " ".join(missing), raw, packed])
    answered = sum(len(a) for a in answers.values())
    log(f"provisions: {stats.total()['files']} files, {answered} answers, {len(errors)} errors, removed {removed} stale")
    return {**stats.to_dict(), "dir": config.PROVISIONS_DIR, "cas_in_set": len(cas_set()), "cas_asked": len(plan),
            "answers": answered, "asked_now": len(jobs), "kept": reused, "errors": len(errors),
            "error_sample": errors[:20], "removed_stale": removed, "secs": round(time.time() - t0, 1)}
