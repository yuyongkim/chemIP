"""Pure: law_* rows of data/portal_facts.db → the JSON shapes of the static law area (CONTRACT.md "law/").

doc_id(kind, law_id)                       "law_000162" / "admrul_2100000..." (law_id is stable across versions)
article_item(row)                          one law_articles row → {t: "a" | "h" | "b", no, title?, head?, paras?, text?, eff?}
doc_file(doc, articles, annexes, history)  law/<id>.json
index_entry(doc, n_history)                one row of law/index.json docs
toc_rows(doc_id, items)                    [[id, t, no, title]] rows of law/toc.json (headings and article titles)
doc_lookup(docs)                           {name: {id, kind, articles: {no: {...}}, annexes}} for law_cite.resolve
Tested in tests/test_law_export.py.
"""
from __future__ import annotations

import json

import law_config as LC
import law_export_config as C

KIND_WORD = {"law": "법령", "admrul": "행정규칙"}
ITEM_KIND = {"article": "a", "heading": "h", "body": "b"}


def doc_id(kind: str, law_id: str) -> str:
    return C.DOC_ID_FMT.format(kind=kind, law_id=law_id)


def _paras(raw) -> list[dict]:
    return [{"no": p.get("no") or "", "text": p.get("text") or "",
             "items": [{"no": it.get("no") or "", "text": it.get("text") or "",
                        "sub": [{"no": s.get("no") or "", "text": s.get("text") or ""} for s in it.get("subitems") or []]}
                       for it in p.get("items") or []]}
            for p in raw or []]


def _body_lines(paras: list[dict]) -> int:
    texts = [p["text"] for p in paras] + [i["text"] for p in paras for i in p["items"]] \
        + [s["text"] for p in paras for i in p["items"] for s in i["sub"]]
    return sum(t.count("\n") + 1 for t in texts if t)


def article_head(text: str, paras: list[dict]) -> str:
    """The article's own lead (조문내용: "제2조(정의) 이 법에서 …") — text = lead + 항/호/목 lines (law_parse.law_articles)."""
    lines = (text or "").split("\n")
    keep = max(0, len(lines) - _body_lines(paras))
    return "\n".join(lines[:keep]).strip()


def article_item(row: dict) -> dict:
    t = ITEM_KIND.get(row["kind"], "a")
    if t == "h":
        return {"t": "h", "no": row["article_no"] or "", "text": row["text"]}
    out = {"t": t, "no": row["article_no"] or "", "title": row.get("title") or ""}
    paras = _paras(json.loads(row["paras_json"])) if row.get("paras_json") else []
    if paras:
        out["head"] = article_head(row["text"], paras)
        out["paras"] = paras
    else:
        out["text"] = row["text"]
    if row.get("effective_on"):
        out["eff"] = row["effective_on"]
    return out


def art_url(kind: str, name: str) -> str:
    """law.go.kr article link template of a doc ("" for 행정규칙). {art} = 제N조 / 제N조의M."""
    tpl = C.ART_URL.get(kind) or ""
    return tpl.format(name=name.replace(" ", "")) if tpl else ""


def _meta(doc: dict) -> dict:
    return {
        "id": doc_id(doc["kind"], doc["law_id"]), "kind": doc["kind"], "kind_word": KIND_WORD.get(doc["kind"], doc["kind"]),
        "name": doc["name"], "law_type": doc.get("law_type") or "", "ministry": doc.get("ministry") or "",
        "promulgated_on": doc.get("promulgated_on") or "", "promulgation_no": doc.get("promulgation_no") or "",
        "effective_on": doc.get("effective_on") or "", "amend_type": doc.get("amend_type") or "",
        "url": doc.get("url_current") or "", "url_version": doc.get("url") or "", "art_url": art_url(doc["kind"], doc["name"]),
        "articles": doc.get("articles") or 0, "annexes": doc.get("annexes") or 0,
        "as_of": (doc.get("fetched_at") or "")[:10],
    }


def history_row(h: dict, kind: str) -> dict:
    tpl = LC.LINK_VERSION.get(kind) or ""
    return {"serial": h["serial"], "url": tpl.format(serial=h["serial"]) if tpl else "", "effective_on": h["effective_on"], "promulgated_on": h.get("promulgated_on") or "",
            "promulgation_no": h.get("promulgation_no") or "", "law_type": h.get("law_type") or "",
            "amend_type": h.get("amend_type") or "", "status": h.get("status") or "", "name": h.get("name") or ""}


def annex_row(x: dict) -> dict:
    return {"no": x.get("annex_no") or "", "kind": x.get("annex_kind") or "", "title": x.get("title") or "",
            "pdf": x.get("pdf_url") or "", "file": x.get("file_url") or ""}


def doc_file(doc: dict, articles: list[dict], annexes: list[dict], history: list[dict]) -> dict:
    hist = sorted((history_row(h, doc["kind"]) for h in history), key=lambda h: (h["effective_on"], h["serial"]), reverse=True)
    return {"v": C.FORMAT, **_meta(doc), "source": C.SOURCE,
            "items": [article_item(a) for a in articles],
            "annex_list": [annex_row(x) for x in annexes],
            "history": hist}


def index_entry(doc: dict, n_history: int) -> dict:
    m = _meta(doc)
    return {k: m[k] for k in ("id", "kind", "kind_word", "name", "law_type", "ministry", "promulgated_on", "effective_on",
                              "articles", "annexes", "url", "art_url", "as_of")} | {"history": n_history}


def toc_rows(did: str, items: list[dict]) -> list[list[str]]:
    rows = []
    for it in items:
        if it["t"] == "h":
            rows.append([did, "h", it["no"], " ".join(it["text"].split())])
        elif it.get("title"):
            rows.append([did, it["t"], it["no"], it["title"]])
    return rows


def doc_lookup(docs: list[dict]) -> dict:
    """docs: [{doc row, items: law_articles rows, annexes: law_annexes rows}] → lookup keyed by doc name."""
    out = {}
    for d in docs:
        arts = {}
        for a in d["articles"]:
            if a["kind"] in ("article", "body") and a["article_no"]:
                arts[a["article_no"]] = {"text": a["text"], "title": a.get("title") or "",
                                         "paras": json.loads(a["paras_json"]) if a.get("paras_json") else None}
        out[d["doc"]["name"]] = {"id": doc_id(d["doc"]["kind"], d["doc"]["law_id"]), "kind": d["doc"]["kind"],
                                 "articles": arts, "annexes": d["annexes"]}
    return out
