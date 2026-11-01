"""Offline check: client assembly (trade_assembly_ref) from p/ + g/ equals build_trade_controls for every
direction x country in ASSEMBLY_COUNTRIES, and the stored default views equal assembly with country "".
"""
from __future__ import annotations

import os
import random

import config
import db
from jsondiff import first_diff
from jsonio import dumps, read_any
from substances import page_path
from trade_assembly_ref import LIVE_ONLY, assemble_view


def verify(items: list[dict], n: int = config.ASSEMBLY_SAMPLE) -> dict:
    db.prepare_backend()
    from backend.core.trade_controls.assemble import build_trade_controls

    rb = read_any(os.path.join(config.GLOBAL_DIR, "rulebook.json"))
    common = read_any(os.path.join(config.GLOBAL_DIR, "trade_common.json"))
    with_cas = [it for it in items if it["cas"]]
    sample = random.Random(config.VERIFY_SEED + 1).sample(with_cas, min(n, len(with_cas)))
    checked = ok = 0
    failures = []
    for it in sample:
        page = read_any(page_path(it["chem_id"]))
        for d in config.DIRECTIONS:
            for country in config.ASSEMBLY_COUNTRIES:
                real = build_trade_controls(page["cas"], d, country)  # kotra_fetch=None
                if real.get("destination") and real["destination"].get("kotra") is not None:
                    real["destination"]["kotra"] = LIVE_ONLY
                mine = assemble_view(page, rb, common, d, country)
                if not country and dumps(page["trade"][d]) != dumps(mine):
                    failures.append({"chem_id": it["chem_id"], "direction": d, "country": "(stored)",
                                     "diff": first_diff(page["trade"][d], mine)})
                checked += 1
                if dumps(real) == dumps(mine):
                    ok += 1
                elif len(failures) < 20:
                    failures.append({"chem_id": it["chem_id"], "direction": d, "country": country, "diff": first_diff(real, mine)})
    return {"substances": len(sample), "views_checked": checked, "views_identical": ok, "failures": failures[:20]}
