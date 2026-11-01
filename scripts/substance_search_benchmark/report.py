"""Write a benchmark run as reports/<label>_<target>.json (all rows) and .md (tables + misses)."""
from __future__ import annotations

import json
import os

import config


def _pct(v) -> str:
    return "-" if v is None else f"{v * 100:.1f}%"


def _cell(s: dict) -> str:
    return f"{_pct(s['rank1_rate'])} / {_pct(s['topk_rate'])} (n={s['n']})"


def _provenance(prov: dict) -> list[str]:
    lines = ["", "## IUPAC circularity guard", "",
             "IUPAC query strings come from PubChem. `pubchem_only` = the search knows that exact name only from the "
             "PubChem synonyms (a hit is circular); `independent` = another source has it, or no synonym matches it.", "",
             "| IUPAC subset | n | rank-1 | top-3 |", "|---|---:|---:|---:|"]
    for p, s in prov.items():
        lines.append(f"| {p} | {s['n']} | {s['rank1']} ({_pct(s['rank1_rate'])}) | {s['topk']} ({_pct(s['topk_rate'])}) |")
    return lines


def _markdown(label: str, target: str, rows: list[dict], types: dict, cats: dict, meta: dict,
              prov: dict | None = None) -> list[str]:
    lines = [f"# Substance search benchmark: {label} / {target}", "",
             f"{meta['when']} · {meta['cases']} substances · {meta['queries']} queries · cells = rank-1 / top-{config.TOP_K}", "",
             "## By query type", "", "| query type | n | rank-1 | top-3 |", "|---|---:|---:|---:|"]
    for t, s in types.items():
        lines.append(f"| {t} | {s['n']} | {s['rank1']} ({_pct(s['rank1_rate'])}) | {s['topk']} ({_pct(s['topk_rate'])}) |")
    cols = [*config.QUERY_TYPES, "all"]
    lines += ["", "## By source category", "", "| category | " + " | ".join(cols) + " |", "|---|" + "---:|" * len(cols)]
    for cat, per in cats.items():
        lines.append(f"| {cat} | " + " | ".join(_cell(per[c]) for c in cols) + " |")
    if prov:
        lines += _provenance(prov)
    misses = [r for r in rows if r["rank"] != 1]
    lines += ["", f"## Not rank-1 ({len(misses)})", "", "| type | query | expected CAS | rank | got #1 | categories |",
              "|---|---|---|---:|---|---|"]
    for r in misses:
        lines.append(f"| {r['type']} | {r['q']} | {r['cas']} | {r['rank'] or '-'} | {r['top1'] or '-'} | {','.join(r['categories'])} |")
    return lines


def write(label: str, target: str, rows: list[dict], types: dict, cats: dict, meta: dict,
          prov: dict | None = None) -> tuple[str, str]:
    os.makedirs(config.REPORTS, exist_ok=True)
    base = os.path.join(config.REPORTS, f"{label}_{target}")
    with open(base + ".json", "w", encoding="utf-8") as fh:
        json.dump({"meta": meta, "by_type": types, "by_category": cats, "iupac_by_provenance": prov or {}, "rows": rows}, fh, ensure_ascii=False, indent=1)
    with open(base + ".md", "w", encoding="utf-8") as fh:
        fh.write("\n".join(_markdown(label, target, rows, types, cats, meta)) + "\n")
    return base + ".json", base + ".md"
