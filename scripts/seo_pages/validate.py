"""Offline checks over the output folder: HTML structure, head fields and lengths, duplicates, internal links,
JSON-LD, sitemap coverage, summary-vs-section numbers, selection-vs-page counts, file counts and sizes."""
from __future__ import annotations

import json
import os
import re
import xml.etree.ElementTree as ET
from collections import Counter
from urllib.parse import urlsplit

import config
import htmlscan
import urls

# links that resolve outside this output (the SPA itself is deployed by the static_export / Pages job)
EXTERNAL_OK = {config.APP_PATH, "/chemip"}
SUMMARY_NUM = re.compile(r"\d[\d,]*")


def _html_files() -> list[str]:
    out = []
    for root, _, files in os.walk(config.OUT):
        if os.path.abspath(root).startswith(os.path.abspath(config.SHOTS)):
            continue
        out += [os.path.join(root, f) for f in files if f.endswith(".html")]
    return sorted(out)


def _resolves(href: str) -> bool:
    parts = urlsplit(href)
    if parts.scheme or parts.netloc:
        return True                       # external: not checked here
    if not parts.path:                    # pure fragment / query on same page
        return True
    if parts.path in EXTERNAL_OK:
        return True
    return os.path.isfile(urls.file_for(parts.path))


def run(sel: dict, gen: dict) -> dict:
    files = _html_files()
    titles, descs, problems = Counter(), Counter(), []
    bad_html = bad_title = bad_desc = bad_links = bad_ld = bad_canon = bad_h1 = 0
    summary_mismatch = 0
    noindex_paths, index_paths = set(), set()
    broken = []
    for file in files:
        path = urls.path_for(file)
        with open(file, encoding="utf-8") as fh:
            text = fh.read()
        if file.endswith(os.path.basename(config.GOOGLE_VERIFY_FILE)):
            continue
        s = htmlscan.scan(text)
        if s.errors:
            bad_html += 1
            problems.append((path, "html", s.errors[:2]))
        if not s.title or len(s.title) > config.TITLE_MAX:
            bad_title += 1
            problems.append((path, "title", s.title))
        desc = s.meta.get("description", "")
        if not desc or len(desc) > config.DESC_MAX:
            bad_desc += 1
            problems.append((path, "description", desc))
        titles[s.title] += 1
        descs[desc] += 1
        if s.canonical != config.SITE + path:
            bad_canon += 1
            problems.append((path, "canonical", s.canonical))
        if s.h1 != 1:
            bad_h1 += 1
        for h in s.hrefs:
            if not _resolves(h):
                bad_links += 1
                broken.append((path, h))
        try:
            for blob in s.ld:
                obj = json.loads(blob)
                assert obj.get("@context") == "https://schema.org" and obj.get("@type")
            assert s.ld
        except Exception as exc:  # noqa: BLE001
            bad_ld += 1
            problems.append((path, "jsonld", str(exc)))
        (noindex_paths if "noindex" in s.meta.get("robots", "") else index_paths).add(path)
        # summary sentence numbers must match the section data-counts
        if "summary" in s.text_by_id:
            nums = [int(n.replace(",", "")) for n in SUMMARY_NUM.findall(s.text_by_id["summary"].split(")", 1)[-1])]
            c = s.counts
            expected = [c.get("kr", 0), c.get("permits", 0), c.get("obligations", 0), c.get("intl", 0)]
            if not all(e in nums for e in expected if e):
                summary_mismatch += 1
                problems.append((path, "summary", nums, expected))

    # sitemap
    tree = ET.parse(os.path.join(config.OUT, "sitemap.xml"))
    ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    locs = [u.findtext("s:loc", namespaces=ns) for u in tree.getroot()]
    loc_paths = {urlsplit(x).path for x in locs}
    sitemap_missing_files = sorted(p for p in loc_paths if p not in EXTERNAL_OK and not os.path.isfile(urls.file_for(p)))
    sitemap_noindex = sorted(loc_paths & noindex_paths)
    index_not_in_sitemap = sorted(index_paths - loc_paths)
    # live seed URLs (chemip-seed.ts): each must have a page, be indexable and be in the sitemap under the same URL
    seed_paths = {urls.cas_path(r["cas"]) for r in sel["rows"] if r.get("seed")}
    seed_missing = sorted(p for p in seed_paths if not os.path.isfile(urls.file_for(p)))
    seed_noindex = sorted(seed_paths & noindex_paths)
    seed_not_in_sitemap = sorted(seed_paths - loc_paths)
    slash_locs = sorted(p for p in loc_paths if p.startswith(config.CAS_BASE) and p != config.CAS_BASE
                        and not p.startswith(config.LIST_BASE) and p.endswith("/"))

    # selection components (index-based) vs rendered facts (build_trade_controls-based)
    comp_mismatch = []
    rows = {r["cas"]: r for r in sel["rows"]}
    for cas, f in gen["facts"].items():
        r, c = rows[cas], f["counts"]
        for key in ("kr_lists", "permits", "foreign_lists", "controlled"):
            if r[key] != c[key]:
                comp_mismatch.append((cas, key, r[key], c[key]))

    size = sum(os.path.getsize(os.path.join(root, f)) for root, _, fs in os.walk(config.OUT)
               if not os.path.abspath(root).startswith(os.path.abspath(config.SHOTS)) for f in fs)
    nfiles = sum(len(fs) for root, _, fs in os.walk(config.OUT) if not os.path.abspath(root).startswith(os.path.abspath(config.SHOTS)))
    page_sizes = sorted(os.path.getsize(f) for f in files if "/chemip/cas/" in f.replace(os.sep, "/") and "/list/" not in f.replace(os.sep, "/"))
    return {
        "html_files": len(files), "files_total": nfiles, "bytes_total": size,
        "substance_page_bytes": {"min": page_sizes[0], "median": page_sizes[len(page_sizes) // 2], "max": page_sizes[-1]} if page_sizes else {},
        "html_structure_errors": bad_html, "title_problems": bad_title, "description_problems": bad_desc,
        "canonical_problems": bad_canon, "h1_problems": bad_h1, "jsonld_problems": bad_ld,
        "duplicate_titles": sum(v - 1 for v in titles.values() if v > 1),
        "duplicate_descriptions": sum(v - 1 for v in descs.values() if v > 1),
        "broken_internal_links": bad_links, "broken_examples": broken[:10],
        "summary_vs_section_mismatch": summary_mismatch,
        "indexable_pages": len(index_paths), "noindex_pages": len(noindex_paths),
        "sitemap_urls": len(locs), "sitemap_missing_files": sitemap_missing_files[:10],
        "sitemap_contains_noindex": len(sitemap_noindex), "indexable_not_in_sitemap": index_not_in_sitemap[:10],
        "seed_pages": len(seed_paths), "seed_problems": len(seed_missing) + len(seed_noindex) + len(seed_not_in_sitemap),
        "seed_missing_pages": seed_missing, "seed_noindex": seed_noindex,
        "seed_not_in_sitemap": seed_not_in_sitemap, "substance_locs_with_slash": len(slash_locs),
        "selection_vs_page_count_mismatch": len(comp_mismatch), "selection_mismatch_examples": comp_mismatch[:10],
        "title_len_max": max((len(t) for t in titles), default=0),
        "desc_len_max": max((len(d) for d in descs), default=0),
        "problems_examples": problems[:15],
    }
