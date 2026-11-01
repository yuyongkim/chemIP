"""Rule files of the safety tools (services 7 and 8), read once: safety_rules/*.json.

ghs_hazards.json   GHS hazard classes: KOSHA class-name patterns, CLP codes, category -> H / pictogram / signal word
compat_rules.json  storage compatibility systems (kr / un / ghs), class lists, pair rules, notes, sources
mixture_rules.json mixture classification constants (CLP Annex I)

The browser reads the same values from frontend/public/chemip/safety_rules_data.jsx, generated from these files by
gen_frontend_rules.py. Edit the JSON, then regenerate; never edit the generated file.
"""
from __future__ import annotations

import functools
import json
import os

RULES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "safety_rules")
FILES = {"ghs": "ghs_hazards.json", "compat": "compat_rules.json", "mixture": "mixture_rules.json"}


@functools.lru_cache(maxsize=None)
def load(name: str) -> dict:
    with open(os.path.join(RULES_DIR, FILES[name]), encoding="utf-8") as fh:
        return json.load(fh)


def ghs() -> dict:
    return load("ghs")


def compat() -> dict:
    return load("compat")


def mixture() -> dict:
    return load("mixture")
