"""Entry point: build every KR safety/labor/fire/gas list, the permit file and the QA file.

Run from G:\\MSDS\\scripts\\trade_controls:
    python -I -m kr_safety.law_fetch     # 1. download current law XML (law.go.kr DRF)
    python -I -m kr_safety.build_all     # 2. parse -> kr_lists/*.json, kr_permits_safety.json, kr_safety_qa.json
"""
from __future__ import annotations

import sys

from . import list_model as lm
from . import permits, qa
from . import p_fire, p_gas, p_hazmat, p_osh_decree, p_osh_msds, p_osh_oel, p_osh_rule, p_osh_std, p_sapa
from .context import Ctx

PARSERS = [p_osh_decree, p_osh_rule, p_osh_std, p_osh_oel, p_hazmat, p_gas, p_fire]
DERIVED = [p_osh_msds, p_sapa]          # cite lists built by PARSERS


def main(argv: list[str]) -> int:
    ctx = Ctx()
    lists: list[dict] = []
    for mod in PARSERS:
        lists.extend(mod.build(ctx))
    for mod in DERIVED:
        lists.extend(mod.build(ctx, lists))
    for lst in lists:
        path = lm.write(lst)
        print(f"{lst['list_id']:32s} entries={len(lst['entries']):4d} family={len(lst['family_entries']):3d} -> {path.name}")
    print("permits ->", permits.write(permits.build(ctx)))
    print("qa      ->", qa.write(qa.build(ctx, lists)))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
