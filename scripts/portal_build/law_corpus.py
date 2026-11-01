"""Korean law corpus: 법제처 OPEN API → data/portal_raw/law/ (raw) + portal_facts.db law_* tables. Run:

    python -I -B G:\\MSDS\\scripts\\portal_build\\law_corpus.py [--only <name part>] [--history] [--reparse]

For each law_set.json entry:
1. lawSearch (target law / admrul) → the 현행 version with an exactly equal name (law_parse.pick_current)
2. lawService → full text, only when that version (doc_key kind:serial) is not in law_docs yet (--reparse re-reads
   bodies from the raw store instead of skipping)
3. when the 현행 version of a law_id changed since the last run: article diff old → new appended to reg_changes
   (source_id law_go_kr_api, reg_diff.append_changes skips rows already present). The first run is the baseline.
4. history (eflaw / admrul nw=2) when the version changed, the law has no history rows yet, or --history
Report: data/portal_raw/law/build_report.json. One failing law is reported, never fatal.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import sys

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I drops the script dir from sys.path

import law_api  # noqa: E402
import law_config as C  # noqa: E402
import law_parse as P  # noqa: E402
import law_raw  # noqa: E402
import law_store as S  # noqa: E402
import portal_db  # noqa: E402
import reg_diff  # noqa: E402  (append_changes: the shared append-only writer of reg_changes)
import reg_official  # noqa: E402  (law_oc: the OC key, env or .env)


def fetch_history(client, raw, conn, kind: str, law_id: str, name: str) -> int:
    rows, page = 0, 1
    while page <= C.MAX_PAGES:
        data, body, url = client.history_page(kind, name, page)
        raw.save(raw.history_path(kind, law_id, page), body, url)
        hits, total = P.search_hits(data, kind)
        rows += S.put_history(conn, kind, law_id, hits)
        if not hits or page * C.PAGE_SIZE >= total:
            break
        page += 1
    return rows


def load_body(client, raw, kind: str, serial: str, reparse: bool) -> tuple[dict, str, dict]:
    rel = raw.body_path(kind, serial)
    if reparse and raw.has(rel):
        return raw.read_json(rel), rel, raw.manifest["files"][rel]
    data, body, url = client.service(kind, serial)
    return data, rel, raw.save(rel, body, url)


def run_one(entry: dict, client, raw, conn, opts) -> dict:
    kind, name = entry["kind"], entry["name"]
    data, body, url = client.search_current(kind, name)
    raw.save(raw.search_path(kind, P.norm_name(name)), body, url)
    hits, _ = P.search_hits(data, kind)
    hit, why = P.pick_current(hits, name)
    if not hit:
        return {"name": name, "kind": kind, "status": "failed", "reason": why}
    key = S.doc_key(kind, hit["serial"])
    prev = S.current_doc(conn, kind, hit["law_id"])
    res = {"name": name, "kind": kind, "status": "ok", "official_name": hit["name"], "law_id": hit["law_id"],
           "serial": hit["serial"], "promulgated_on": hit["promulgated_on"], "effective_on": hit["effective_on"]}
    if S.has_doc(conn, key) and not opts.reparse:
        res["body"] = "kept"
    else:
        payload, rel, meta = load_body(client, raw, kind, hit["serial"], opts.reparse)
        parsed = P.doc(kind, payload)
        if parsed["meta"]["law_id"] and parsed["meta"]["law_id"] != hit["law_id"]:
            return {**res, "status": "failed", "reason": f"body law_id {parsed['meta']['law_id']} != search {hit['law_id']}"}
        parsed["meta"] = {k: parsed["meta"][k] or hit.get(k, "") for k in parsed["meta"]}
        S.put_doc(conn, key, kind, hit["serial"], parsed, {
            "set_name": name, "url": C.LINK_VERSION[kind].format(serial=hit["serial"]),
            "url_current": C.LINK_CURRENT[kind].format(name=hit["name"]), "raw_file": rel,
            "sha256": meta["sha256"], "fetched_at": meta["fetched_at"]})
        res["body"] = "reparsed" if opts.reparse else "fetched"
    S.set_current(conn, kind, hit["law_id"], key)
    doc = S.current_doc(conn, kind, hit["law_id"])
    res["articles"], res["annexes"] = doc["articles"], doc["annexes"]
    changed = prev is not None and prev["doc_key"] != key
    if changed:
        diff = P.diff_articles(S.load_articles(conn, prev["doc_key"]), S.load_articles(conn, key))
        rows = S.change_rows(diff, doc, doc["url"], entry.get("list_ids"))
        res["diff"] = {"from": prev["doc_key"], "to": key, "articles": len(diff),
                       "reg_changes_inserted": reg_diff.append_changes(conn, rows) if rows else 0}
    if changed or opts.history or S.history_count(conn, kind, hit["law_id"]) == 0:
        res["history_rows"] = fetch_history(client, raw, conn, kind, hit["law_id"], hit["name"])
    res["history_total"] = S.history_count(conn, kind, hit["law_id"])
    return res


def run(entries: list[dict], client, raw, conn, opts) -> dict:
    S.ensure(conn)
    results = []
    for e in entries:
        try:
            results.append(run_one(e, client, raw, conn, opts))
        except Exception as exc:  # one law failing does not stop the rest
            results.append({"name": e["name"], "kind": e["kind"], "status": "failed",
                            "reason": law_api.mask(f"{type(exc).__name__}: {exc}", client.oc)[:300]})
        finally:
            raw.write_manifest()
    ok = [r for r in results if r["status"] == "ok"]
    return {"entries": len(entries), "resolved": len(ok),
            "resolved_by_kind": {k: sum(r["kind"] == k for r in ok) for k in ("law", "admrul")},
            "failed": [{"name": r["name"], "kind": r["kind"], "reason": r["reason"]} for r in results if r["status"] != "ok"],
            "articles_current": sum(r.get("articles", 0) for r in ok),
            "annexes_current": sum(r.get("annexes", 0) for r in ok),
            "history_rows": sum(r.get("history_total", 0) for r in ok),
            "version_changes": [r["diff"] for r in ok if r.get("diff")],
            "requests": client.requests, "results": results}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", help="entries whose name contains this (spaces ignored)")
    ap.add_argument("--history", action="store_true", help="refetch the history of every law")
    ap.add_argument("--reparse", action="store_true", help="re-parse stored bodies (fetch only what is missing)")
    opts = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    oc = reg_official.law_oc()
    if not oc:
        sys.exit("no OC key (LAW_GO_KR_OC in env or .env)")
    with open(C.LAW_SET, encoding="utf-8") as fh:
        entries = json.load(fh)["laws"]
    if opts.only:
        entries = [e for e in entries if P.norm_name(opts.only) in P.norm_name(e["name"])]
    conn = portal_db.connect()
    try:
        report = run(entries, law_api.Client(oc), law_raw.RawStore(), conn, opts)
        with conn:
            portal_db.put_sources(conn, {sid: {**s, "retrieved_at": dt.date.today().isoformat()}
                                         for sid, s in C.SOURCES.items()})
        report["tables"] = S.table_sizes(conn)
    finally:
        conn.close()
    report["db_bytes"] = os.path.getsize(portal_db.PORTAL_DB)
    report["day"] = dt.date.today().isoformat()
    with open(C.REPORT, "w", encoding="utf-8") as fh:
        json.dump(report, fh, ensure_ascii=False, indent=1)
    print(json.dumps({k: v for k, v in report.items() if k != "results"}, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
