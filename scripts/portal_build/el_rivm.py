"""RIVM probitrelaties pages (data/portal_raw/el/rivm_probit/*.html) → {CAS: probit record}. Pure parsing, standard library only.

Record: {name_nl, cas: [CAS, ...], a, b, n, status ("inhoudelijk vastgesteld" | "voorgesteld" | ...), established (date),
         page, doc}   Pr = a + b·ln(Cⁿ·t), C in mg/m3, t in min (RIVM convention, stated on each page as "a (mg/m3)" and in
         each technical support document, e.g. 20180315-chlorine-INTERIM p. 7: "with C in mg/m3 and t in min").
Only the current relation shown at the top of the page is read (the history table below it is ignored).
"""
from __future__ import annotations

import html
import json
import os
import re

import el_config as C

_CAS_RE = re.compile(r"\d{2,7}-\d{2}-\d")
_NUM = r"([−\-–]?\s*[0-9]+(?:[.,][0-9]+)?)"


def _text(page_html: str) -> str:
    t = re.sub(r"<(script|style)\b.*?</\1>", " ", page_html, flags=re.S)
    t = html.unescape(re.sub(r"<[^>]+>", "\n", t)).replace("\xa0", " ")
    return re.sub(r"\n\s*\n+", "\n", t)


def _num(s: str) -> float:
    return float(re.sub(r"\s+", "", s).replace("−", "-").replace("–", "-").replace(",", "."))


def parse_page(page_html: str) -> dict | None:
    t = _text(page_html)
    top = t.split("Historie afleiding")[0]
    m_a = re.search(r"\ba\s*\(mg/m\s*\n?\s*3\s*\n?\s*\)?\s*\n\s*" + _NUM, top)  # ")" is missing on some pages
    m_b = re.search(r"\nb\s*\n\s*" + _NUM, top)
    m_n = re.search(r"\nn\s*\n\s*" + _NUM, top)
    if not (m_a and m_b and m_n):
        return None
    status = re.search(r"\nStatus\s*\n\s*([^\n]+)", top)
    est = re.search(r"Inhoudelijk vastgesteld d\.d\.\s*\n\s*([0-9]{2}-[0-9]{2}-[0-9]{4})", top)
    cas_block = re.search(r"CAS-nummer\s*\n\s*([^\n]+)", top)
    doc = re.search(r'href="(/documenten/[^"]+)"', page_html)
    title = re.search(r"<h1[^>]*>(.*?)</h1>", page_html, flags=re.S)
    return {
        "name_nl": re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", title.group(1)))).strip() if title else "",
        "cas": _CAS_RE.findall(cas_block.group(1)) if cas_block else [],
        "a": _num(m_a.group(1)), "b": _num(m_b.group(1)), "n": _num(m_n.group(1)),
        "status": status.group(1).strip().lower() if status else "",
        "established": est.group(1) if est else "",
        "doc": C.RIVM_BASE + doc.group(1) if doc else "",
    }


def parse(raw_dir: str | None = None) -> tuple[dict[str, dict], dict]:
    raw_dir = raw_dir or C.raw_dir("rivm_probit")
    with open(os.path.join(raw_dir, C.MANIFEST), encoding="utf-8") as fh:
        manifest = json.load(fh)["files"]
    out: dict[str, dict] = {}
    stats = {"pages": 0, "parsed": 0, "no_relation": []}  # RIVM pages that state no relation ("-")
    for name, meta in sorted(manifest.items()):
        if name in ("status.html", "method.html") or not name.endswith(".html"):
            continue
        stats["pages"] += 1
        with open(os.path.join(raw_dir, name), encoding="utf-8", errors="replace") as fh:
            rec = parse_page(fh.read())
        if not rec:
            stats["no_relation"].append(name)
            continue
        rec["cas"] = rec["cas"] or _CAS_RE.findall(meta.get("cas", ""))
        rec["name_nl"] = rec["name_nl"] or meta.get("name", "")
        rec["page"] = meta["url"]
        rec["retrieved_at"] = meta["retrieved_at"]
        stats["parsed"] += 1
        for cas in rec["cas"]:
            out.setdefault(cas, rec)
    stats["cas"] = len(out)
    return out, stats
