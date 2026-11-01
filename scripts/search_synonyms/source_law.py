"""Official names from the law.go.kr lists (backend/data/trade_controls/kr_lists): yields (cas, name, code).

Rules (synonym_sources.json law_lists): only entries whose CAS is printed in the law (match_method), minus the
skipped roles; one source code per list ("law:<list_id>") carrying the law, annex and URL. A name the same list
prints with two or more CAS is a group name: it gets "law:<list_id>#group" at group_tier.
"""
from __future__ import annotations

import glob
import json
import os

from names import split_names
from spec import project_path
from backend.core.chemical_aliases import normalize_alias


def _lists(cfg: dict) -> list[dict]:
    out = []
    for path in sorted(glob.glob(os.path.join(project_path(cfg["dir"]), cfg["file_glob"]))):
        if os.path.basename(path) in cfg["skip_files"]:
            continue
        with open(path, encoding="utf-8") as fh:
            data = json.load(fh)
        data.setdefault("list_id", os.path.basename(path)[:-5])
        out.append(data)
    return out


def _source(cfg: dict, data: dict, tier: str, note: str = "") -> dict:
    ref = " · ".join(x for x in (data.get("law"), data.get("title"), data.get("legal_basis")) if x)
    src = {"tier": tier, "ref": f"law.go.kr {ref}{note}"}
    if data.get("source_url"):
        src["url"] = data["source_url"]
    return src


def load(cfg: dict, spec: dict) -> tuple[dict[str, dict], list[tuple[str, str, str]]]:
    sources, rows = {}, []
    for data in _lists(cfg):
        code = cfg["code_prefix"] + data["list_id"]
        group = code + cfg["group_suffix"]
        sources[code] = _source(cfg, data, cfg["tier"])
        sources[group] = _source(cfg, data, cfg["group_tier"], " (같은 이름에 CAS 여럿: 물질군 이름)")
        found = _entry_names(cfg, spec, data)
        cas_per_name: dict[str, set[str]] = {}
        for cas, name in found:
            cas_per_name.setdefault(normalize_alias(name), set()).add(cas)
        for cas, name in found:
            rows.append((cas, name, group if len(cas_per_name[normalize_alias(name)]) > 1 else code))
    return sources, rows


def _entry_names(cfg: dict, spec: dict, data: dict) -> list[tuple[str, str]]:
    out = []
    for e in data.get("entries", []):
        if e.get("match_method") not in cfg["match_methods"] or e.get("role") in cfg["skip_roles"]:
            continue
        for field in cfg["name_fields"]:
            for name in split_names(e.get(field), spec):
                out.append(((e.get("cas") or "").strip(), name))
    return out
