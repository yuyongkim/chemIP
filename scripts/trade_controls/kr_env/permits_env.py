"""Build kr_permits_env.json from data/permits_env_spec.json.

Every verified_text is the paragraph of the cited article (downloaded from law.go.kr in
this run) that contains the spec's phrase; a missing phrase raises instead of guessing.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

from . import config, lawgo

SPEC = Path(__file__).with_name("data") / "permits_env_spec.json"


def _squash(s: str) -> str:
    return re.sub(r"\s+", "", s)


def _find(lines: list[str], phrase: str, where: str) -> str:
    key = _squash(phrase)
    hits = [ln for ln in lines if key in _squash(ln)]
    if not hits:
        raise LookupError(f"phrase not found in {where}: {phrase}")
    return min(hits, key=len)   # the paragraph itself, not a longer container line


def _quote(q: dict) -> dict:
    if "admrul" in q:
        doc = lawgo.fetch_admrul(q["admrul"])
        lines = [t.strip() for el in doc.root.iter("조문내용") for t in (el.text or "").splitlines() if t.strip()]
        where = f"{doc.name} (고시)"
        text = _find(lines, q["phrase"], where)
        return {"source": doc.name, "article": None, "text": text,
                "source_url": config.admrul_page_url(doc.name), "law_mst": doc.mst, "promulgated": doc.promulgated}
    doc = lawgo.fetch_law(q["law"])
    art = lawgo.article_text(doc, q["article"], q.get("branch", 0))
    label = f"제{q['article']}조" + (f"의{q['branch']}" if q.get("branch") else "")
    text = _find(art.splitlines(), q["phrase"], f"{doc.name} {label}")
    return {"source": doc.name, "article": label, "text": text,
            "source_url": config.law_page_url(doc.name), "law_mst": doc.mst, "promulgated": doc.promulgated,
            "effective": doc.effective}


def build() -> dict:
    spec = json.loads(SPEC.read_text(encoding="utf-8"))
    permits = []
    for p in spec["permits"]:
        quotes = [_quote(q) for q in p["quotes"]]
        permits.append({
            "permit_id": p["permit_id"], "name": p["name"], "law": p["law"], "kind": p["kind"],
            "trigger": p["trigger"], "authority": p["authority"], "legal_basis": p["legal_basis"],
            "source_url": quotes[0]["source_url"],
            "verified_text": [f"[{q['source']} {q['article'] or ''}] {q['text']}".replace(" ]", "]") for q in quotes],
            "verified_sources": quotes,
        })
    return {"jurisdiction": "KR", "scope": "환경 법령(대기·물·토양·폐기물·악취·화학물질 배출량조사·통합허가·오존층) 인허가·신고·제출 의무",
            "retrieved": config.RETRIEVED, "note": spec["_note"], "permits": permits}


def write(doc: dict) -> Path:
    config.PERMITS_OUT.parent.mkdir(parents=True, exist_ok=True)
    config.PERMITS_OUT.write_text(json.dumps(doc, ensure_ascii=False, indent=1), encoding="utf-8")
    return config.PERMITS_OUT
