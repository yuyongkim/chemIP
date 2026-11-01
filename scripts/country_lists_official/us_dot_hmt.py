"""US DOT 49 CFR 172.101 Hazardous Materials Table (HMT) and its Appendix A (hazardous substances, RQ).

The HMT is keyed by proper shipping name (PSN), not CAS. A row reaches a CAS only by one of:
  un        the CAS's own UN number (KOSHA MSDS §14 or Wikidata P695) equals the HMT identification number
  name      the PSN, normalized, equals an English name that belongs to exactly one CAS
  name+state  the PSN minus a physical-state / stabilization qualifier (", refrigerated liquid", ", anhydrous" …)
            equals such a name (e.g. "Ethylene, refrigerated liquid" -> Ethylene)
Appendix A Table 1 has names and RQs only (no CAS in 49 CFR). Its names are the 40 CFR 302.4 names, so a row
reaches a CAS only when its name equals a 302.4 "Hazardous substance" exactly (302.4 prints the CASRN).
Italic text in column 2 is description, not part of the PSN; rows whose column 2 is all italic ("…, see …") are
cross-references and are skipped. The method is written into every row's detail ("match: …").
"""
from __future__ import annotations

import html
import re
from dataclasses import dataclass, field

from country_lists.base import Row, cas_valid
from substance_index import norm_name, unique_cas

CODE_HMT = "US_DOT_HMT"
CODE_RQ = "US_DOT_HMT_RQ"
OWNED = (CODE_HMT, CODE_RQ)
HMT_CAPTION = "Hazardous Materials Table"
RQ_CAPTION = "Table 1 to Appendix A"
CFR302_CAPTION = "Table 302.4"
STATE_QUALIFIERS = (
    "refrigerated liquid", "compressed", "anhydrous", "stabilized", "inhibited", "solid", "liquid", "molten",
    "dry", "solution", "aqueous solution", "liquefied", "refrigerated liquid (cryogenic liquid)",
)
_TAG = re.compile(r"<[^>]+>")
_SUP = re.compile(r"<sup>.*?</sup>", re.S)  # footnote marks ("Benzene <sup>a</sup>")
_ITALIC = re.compile(r'<E T="03">.*?</E>', re.S)


def cell_text(fragment: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(_TAG.sub(" ", _SUP.sub(" ", fragment or "")))).strip(" ,")


def tables(xml: str) -> dict[str, str]:
    """Caption text -> table markup."""
    out = {}
    for t in re.finditer(r"<TABLE.*?</TABLE>", xml, re.S):
        cap = re.search(r"<CAPTION>(.*?)</CAPTION>", t.group(0), re.S)
        out[cell_text(cap.group(1)) if cap else f"table@{t.start()}"] = t.group(0)
    return out


def _table(xml: str, caption: str) -> str:
    for cap, body in tables(xml).items():
        if caption in cap:
            return body
    raise ValueError(f"table not found: {caption}")


def _cells(tr: str) -> list[str]:
    return re.findall(r"<TD[^>]*>(.*?)</TD>", tr, re.S)


@dataclass
class HmtEntry:
    symbols: str
    psn: str
    description: str
    hazard_class: str
    ident: str
    pgs: list[str] = field(default_factory=list)
    labels: list[str] = field(default_factory=list)
    provisions: list[str] = field(default_factory=list)


def parse_hmt(xml: str) -> list[HmtEntry]:
    """HMT rows -> entries. A row with an empty column 2 continues the entry above (another packing group)."""
    entries: list[HmtEntry] = []
    for tr in re.findall(r"<TR>(.*?)</TR>", _table(xml, HMT_CAPTION), re.S):
        tds = _cells(tr)
        if len(tds) < 7:
            continue
        sym, desc, cls, ident, pg, labels, sp = (cell_text(x) for x in tds[:7])
        psn = cell_text(_ITALIC.sub(" ", tds[1]))
        if not desc:
            if entries and (pg or labels or sp):
                e = entries[-1]
                for value, bucket in ((pg, e.pgs), (labels, e.labels), (sp, e.provisions)):
                    if value and value not in bucket:
                        bucket.append(value)
            continue
        if not psn or not cls:  # cross-reference ("Accumulators, electric, see Batteries, wet etc"): no class
            continue
        entries.append(HmtEntry(sym, psn, cell_text(tds[1]), cls, ident.replace(" ", ""),
                                [pg] if pg else [], [labels] if labels else [], [sp] if sp else []))
    return entries


def base_names(psn: str) -> list[tuple[str, str]]:
    """[(name to look up, method)] — the PSN itself, then the PSN without a trailing state qualifier."""
    out = [(psn, "name")]
    low = psn.casefold()
    for q in sorted(STATE_QUALIFIERS, key=len, reverse=True):
        suffix = ", " + q
        if low.endswith(suffix):
            out.append((psn[: -len(suffix)], "name+state"))
            break
    return out


def entry_detail(e: HmtEntry, method: str) -> str:
    parts = [e.ident or "no ID number", f"Class {e.hazard_class}" if e.hazard_class else "",
             f"PG {'/'.join(e.pgs)}" if e.pgs else "PG —", f"Labels {'; '.join(e.labels)}" if e.labels else "",
             f"symbols {e.symbols}" if e.symbols else "", f"match: {method}",
             f"SP {'; '.join(e.provisions)}" if e.provisions else ""]
    if e.description != e.psn:
        parts.append(f"description: {e.description}")
    return " | ".join(p for p in parts if p)


def match_hmt(entries: list[HmtEntry], un_index: dict[str, dict[str, str]], names: dict[str, set[str]]):
    """-> ([(cas, entry, method)], stats). One (cas, entry) pair once; methods joined."""
    by_un: dict[str, list[tuple[str, str]]] = {}
    for cas, uns in un_index.items():
        for un, src in uns.items():
            by_un.setdefault("UN" + un, []).append((cas, src))
    hits: dict[tuple[str, int], list[str]] = {}
    by_psn: dict[str, set[str]] = {}  # PSN -> CAS that reached it by UN number
    for i, e in enumerate(entries):
        for cas, src in by_un.get(e.ident, []):
            hits.setdefault((cas, i), []).append(f"UN number ({src})")
            by_psn.setdefault(norm_name(e.psn), set()).add(cas)
    for i, e in enumerate(entries):
        for name, method in base_names(e.psn):
            label = method if method == "name" else f"name+state ({name})"
            cas = unique_cas(names, name)
            if not cas:  # a name shared by several CAS: keep it only if one of them holds that same PSN by UN number
                both = (names.get(norm_name(name)) or set()) & by_psn.get(norm_name(name), set())
                cas = next(iter(both)) if len(both) == 1 else ""
                label += ", disambiguated by the UN match of the same PSN" if cas else ""
            if cas:
                hits.setdefault((cas, i), []).append(label)
                break
    out = [(cas, entries[i], "; ".join(dict.fromkeys(m))) for (cas, i), m in sorted(hits.items())]
    matched = {i for _, i in hits}
    stats = {"entries": len(entries), "entries_matched": len(matched), "rows": len(out),
             "cas": len({c for c, _ in hits}),
             "by_method": {k: sum(1 for *_, m in out if k in m) for k in ("UN number", "name+state", "name")}}
    stats["by_method"]["name"] -= stats["by_method"]["name+state"]
    return out, stats


def hmt_rows(xml: str, un_index, names, source: str) -> tuple[list[Row], dict]:
    matched, stats = match_hmt(parse_hmt(xml), un_index, names)
    rows = [Row(cas, CODE_HMT, entry_detail(e, method), source, e.psn) for cas, e, method in matched if cas_valid(cas)]
    return rows, stats


def parse_cfr302(xml: str) -> dict[str, str]:
    """40 CFR 302.4 Table 302.4: normalized hazardous-substance name -> CASRN (rows with a valid CASRN only)."""
    out: dict[str, str] = {}
    for tr in re.findall(r"<TR>(.*?)</TR>", _table(xml, CFR302_CAPTION), re.S):
        tds = [cell_text(x) for x in _cells(tr)]
        if len(tds) >= 2 and cas_valid(tds[1]):
            out.setdefault(norm_name(tds[0]), tds[1])
    return out


def parse_rq(xml: str) -> list[tuple[str, str]]:
    """Appendix A Table 1 -> [(hazardous substance, 'RQ lb (kg)')]."""
    out = []
    for tr in re.findall(r"<TR>(.*?)</TR>", _table(xml, RQ_CAPTION), re.S):
        tds = [cell_text(x) for x in _cells(tr)]
        if len(tds) >= 2 and tds[0] and re.match(r"[\d.]", tds[1] or ""):
            out.append((tds[0], tds[1]))
    return out


def rq_rows(xml49: str, xml40: str, source: str) -> tuple[list[Row], dict]:
    cfr = parse_cfr302(xml40)
    rows, unmatched = [], 0
    for name, rq in parse_rq(xml49):
        cas = cfr.get(norm_name(name), "")
        if not cas:
            unmatched += 1
            continue
        m = re.match(r"([\d.,]+)\s*\(([\d.,]+)\)", rq)
        rq_text = f"RQ {m.group(1)} lb ({m.group(2)} kg)" if m else f"RQ {rq}"
        rows.append(Row(cas, CODE_RQ, f"{rq_text} | match: exact name = 40 CFR 302.4 (CASRN)", source, name))
    seen, out = set(), []
    for r in rows:  # one row per (cas, name)
        if (r.cas_no, r.chemical_name) not in seen:
            seen.add((r.cas_no, r.chemical_name))
            out.append(r)
    return out, {"entries": len(out) + unmatched, "rows": len(out), "cas": len({r.cas_no for r in out}),
                 "unmatched_names": unmatched}
