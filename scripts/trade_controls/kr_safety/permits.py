"""Build kr_permits_safety.json from permits_spec.PERMITS, pulling verified_text from the law XML.

Item shape matches kr_permits_env.json / kr_permits_product.json: permit_id, name, law, kind (Korean word,
permit_kinds.py), trigger, authority, legal_basis, source_url, verified_text, plus when_required (시기).
"""
from __future__ import annotations

import json

from . import config
from .context import Ctx
from .permit_kinds import kind_ko
from .permits_spec import PERMITS


def _paragraph(ctx: Ctx, key: str, art: int, branch: int, phrase: str) -> str:
    text = ctx.article(key, art, branch)
    for para in text.splitlines():
        if phrase in para:
            return para.strip()
    raise LookupError(f"phrase not found in {key} 제{art}조: {phrase!r}")


def build(ctx: Ctx) -> dict:
    permits = []
    for spec in PERMITS:
        quotes = []
        for key, art, branch, phrase in spec["quotes"]:
            quotes.append({"instrument": ctx.meta(key)["name"], "article": f"제{art}조" + (f"의{branch}" if branch else ""),
                           "source_url": ctx.url(key), "text": _paragraph(ctx, key, art, branch, phrase)})
        rec = {k: v for k, v in spec.items() if k not in ("quotes", "law_key")}
        rec["kind"] = kind_ko(spec["kind"])
        rec["source_url"] = ctx.url(spec["law_key"])
        rec["verified_text"] = quotes
        permits.append(rec)
    return {"jurisdiction": "KR", "scope": "산업안전·노동·화재·고압가스·중대재해 (환경법·화관법/화평법은 별도 수집기)",
            "retrieved": config.RETRIEVED,
            "versions": {k: ctx.version(k) for k in list(ctx.manifest["laws"]) + list(ctx.manifest["admruls"])},
            "permits": permits}


def write(data: dict):
    config.PERMITS_JSON.parent.mkdir(parents=True, exist_ok=True)
    config.PERMITS_JSON.write_text(json.dumps(data, ensure_ascii=False, indent=2), "utf-8")
    return config.PERMITS_JSON
