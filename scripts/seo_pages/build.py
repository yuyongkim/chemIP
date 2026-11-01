"""Generation steps: load -> select -> facts (process pool) -> related -> write pages, hubs, sitemap, robots, reports."""
from __future__ import annotations

import csv
import datetime as dt
import json
import os
import shutil
from concurrent.futures import ProcessPoolExecutor

import config
import hub
import names
import related
import render
import seeds
import sitemap
import sources
import urls

WORKERS = max(1, min(8, (os.cpu_count() or 4) - 2))
CHUNK = 60

_W: dict = {}  # per-worker state


def _worker_init(kosha, ncis, section2, jur, display):
    import facts  # noqa: F401  (imports backend once per worker)
    _W.update(kosha=kosha, ncis=ncis, section2=section2, jur=jur, display=display, ctl=facts._controlled_meta())


def _worker(cas_list):
    import facts
    out = []
    for cas in cas_list:
        k = _W["kosha"][cas]
        out.append(facts.build(cas, k, _W["ncis"].get(cas, {}), _W["section2"].get(k["chem_id"]), _W["jur"], _W["ctl"],
                               _W["display"][cas]))
    return out


def write(path: str, text: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(text)


def write_json(name: str, obj) -> str:
    os.makedirs(config.REPORTS, exist_ok=True)
    path = os.path.join(config.REPORTS, name)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(obj, fh, ensure_ascii=False, indent=1, default=sorted)
    return path


def load_sources() -> dict:
    """substances = KOSHA rows + rows for live seeds that have no KOSHA record (no MSDS, regulation facts only)."""
    kosha = sources.kosha_substances()
    seed = seeds.load()
    return {"kosha": kosha, "seed": seed, "substances": {**seeds.extra_rows(seed, kosha), **kosha},
            "ncis": sources.ncis_substances(), "intl_codes": sources.intl_regulatory_codes(),
            "section2": sources.msds_section2({v["chem_id"] for v in kosha.values()}),
            "jur": sources.jurisdiction_names()}


def compute_facts(cas_list: list[str], src: dict, log) -> dict[str, dict]:
    need = set(cas_list)
    kosha = {c: src["substances"][c] for c in need}
    ncis = {c: src["ncis"][c] for c in need if c in src["ncis"]}
    s2 = {kosha[c]["chem_id"]: src["section2"].get(kosha[c]["chem_id"]) for c in need}
    display = names.with_seed_names(names.display_names(kosha, ncis, cas_list), src["seed"],
                                    config.SEED_NAME_USE_GENERATED)
    chunks = [cas_list[i:i + CHUNK] for i in range(0, len(cas_list), CHUNK)]
    out: dict[str, dict] = {}
    with ProcessPoolExecutor(WORKERS, initializer=_worker_init, initargs=(kosha, ncis, s2, src["jur"], display)) as ex:
        for i, batch in enumerate(ex.map(_worker, chunks), 1):
            for f in batch:
                out[f["cas"]] = f
            if i % 10 == 0 or i == len(chunks):
                log(f"facts {len(out)}/{len(cas_list)}")
    return out


def _clean_output() -> None:
    for sub in ("chemip", "sitemap.xml", "robots.txt"):
        p = os.path.join(config.OUT, sub)
        if os.path.isdir(p):
            shutil.rmtree(p)
        elif os.path.isfile(p):
            os.remove(p)


def generate(sel: dict, src: dict, log) -> dict:
    tiers = sel["tiers"]
    gen = sorted(c for c, t in tiers.items() if t in config.GENERATE_TIERS)
    indexable = {c for c in gen if tiers[c] in config.INDEX_TIERS}
    log(f"computing facts for {len(gen)} pages ({len(indexable)} indexable) with {WORKERS} workers")
    facts = compute_facts(gen, src, log)
    updated = dt.date.today().isoformat()

    # per-list hub pages: only lists covering enough indexable pages
    from backend_ro import tc_lists
    meta = hub.list_meta(tc_lists.load_kr_law_lists())
    idx_facts = [facts[c] for c in sorted(indexable)]
    members = hub.members_by_list(idx_facts)
    list_pages = {lid for lid, m in members.items() if lid in meta and len(m) >= config.LIST_PAGE_MIN}

    page_lists = {c: {x["list_id"] for g in facts[c]["kr_groups"] for x in g["lists"]} for c in gen}
    rel = related.build(page_lists, indexable)

    _clean_output()
    langs = ("ko", "en") if config.ENABLE_EN else ("ko",)
    for c in gen:
        f = facts[c]
        rel_facts = [facts[r] for r in rel.get(c, [])]
        for lang in langs:
            html = render.page(f, lang=lang, indexable=c in indexable, related=rel_facts, list_pages=list_pages,
                               updated=updated, has_en=config.ENABLE_EN)
            write(urls.file_for(urls.cas_path(c, lang)), html)
    write(urls.file_for(urls.hub_path()), hub.hub_page(idx_facts, meta, members, list_pages, updated))
    list_lastmod = {}
    for lid in sorted(list_pages):
        write(urls.file_for(urls.list_path(lid)), hub.list_page(meta[lid], members[lid], updated))
        list_lastmod[lid] = max((f["lastmod"] for f in members[lid] if f["lastmod"]), default="")

    # sitemap: SPA ko/en + glossary terms (its own canonical, hreflang pairs), hub, list pages, indexable substance pages
    all_dates = [facts[c]["lastmod"] for c in indexable if facts[c]["lastmod"]]
    entries = [(urls.hub_path(), max(all_dates, default=""))]
    entries += [(urls.list_path(lid), list_lastmod[lid]) for lid in sorted(list_pages)]
    for c in sorted(indexable):
        entries.append((urls.cas_path(c), facts[c]["lastmod"]))
        if config.ENABLE_EN:
            entries.append((urls.cas_path(c, "en"), facts[c]["lastmod"]))
    entries = sitemap.spa_entries() + entries  # SPA home ko/en (+ glossary terms when that screen exists), with hreflang
    write(os.path.join(config.OUT, "sitemap.xml"), sitemap.sitemap_xml(entries))
    write(os.path.join(config.OUT, "robots.txt"), sitemap.robots_txt())
    for f in (config.GOOGLE_VERIFY_FILE, config.FAVICON_FILE):
        shutil.copy2(f, os.path.join(config.OUT, os.path.basename(f)))

    _write_reports(sel, facts, indexable)
    return {"facts": facts, "indexable": indexable, "generated": gen, "list_pages": list_pages,
            "sitemap_urls": len(entries), "related": rel}


def _write_reports(sel: dict, facts: dict, indexable: set[str]) -> None:
    write_json("selection.json", sel["report"])
    os.makedirs(config.REPORTS, exist_ok=True)
    cols = ["cas", "chem_id", "seed", "tier", "score", "kr_lists", "ncis_reg", "permits", "foreign_lists", "foreign_juris",
            "controlled", "h_statements", "inventories"]
    with open(os.path.join(config.REPORTS, "selection.csv"), "w", encoding="utf-8-sig", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(cols + ["name_ko"])
        for r in sorted(sel["rows"], key=lambda r: (-r["score"], r["cas"])):
            if r["tier"] != "none":
                w.writerow([r[c] for c in cols] + [facts.get(r["cas"], {}).get("name_ko", "")])
    with open(os.path.join(config.REPORTS, "facts.jsonl"), "w", encoding="utf-8") as fh:
        for c in sorted(facts):
            fh.write(json.dumps({**facts[c], "indexable": c in indexable}, ensure_ascii=False) + "\n")
