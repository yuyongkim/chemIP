"""Static files for the regulation list browser and change alerts (service 6) → v1/reg/ (gzip bytes, .json/.xml names).

    v1/reg/lists.json             every list: id, group, jurisdiction, law, title, counts, dates, source (CONTRACT.md)
    v1/reg/list/<id>.json         one list: meta + first part of rows [cas, name, name_en, detail]
    v1/reg/list/<id>.<k>.json     parts k = 1.. of a long list (config.REG_PART_ROWS rows each)
    v1/reg/changes.json           newest reg_changes rows (portal_facts.db), large row batches folded into one item
    v1/reg/changes.xml            the same as RSS 2.0 (served as application/rss+xml)

Inputs: the lists (scripts/portal_build/reg_lists.py, read-only) and portal_facts.db reg_changes / sources (read-only).
Run after scripts/portal_build/reg_diff.py: run_all.py --steps reg.
"""
from __future__ import annotations

import hashlib
import os
import shutil
import sqlite3
import sys

import config
from jsonio import dumps, gz, write_gzip

PORTAL_BUILD = os.path.join(config.PROJECT, "scripts", "portal_build")
if PORTAL_BUILD not in sys.path:
    sys.path.append(PORTAL_BUILD)  # appended, so static_export modules (config, db, ...) are never shadowed

import reg_config as RC  # noqa: E402
import reg_lists  # noqa: E402
from reg_rss import build_rss  # noqa: E402

FIELDS = ["cas", "name", "name_en", "detail"]
CHANGE_COLS = "changed_on, jurisdiction, list_id, cas, change, detail, source_url, source_id"


def list_meta(x: dict, parts: int) -> dict:
    return {"id": x["id"], "g": x["group"], "j": x["jurisdiction"], "law": x["law"], "title": x["title"],
            "n": len(x["rows"]), "cas": reg_lists.cas_count(x["rows"]), "parts": parts, "amended_on": x["amended_on"],
            "version": x["version"], "retrieved": x["retrieved"], "url": x["source_url"], "src": x["source_id"]}


def split_parts(rows: list, size: int) -> list[list]:
    return [rows[i:i + size] for i in range(0, len(rows), size)] or [[]]


def fold_changes(rows: list[tuple], titles: dict[str, str], over: int = RC.AGGREGATE_OVER) -> list[dict]:
    """reg_changes rows (newest first) → screen items. A (date, list, change, source) group with more than `over`
    substance rows becomes one item {n, cas: null, detail: ""} so a big re-export does not flood the feed."""
    groups: dict[tuple, list] = {}
    for r in rows:
        groups.setdefault((r[0], r[2], r[4], r[7]), []).append(r)
    items, done = [], set()
    for r in rows:
        key = (r[0], r[2], r[4], r[7])
        g = groups[key]
        substance_rows = [x for x in g if x[3]]
        if len(substance_rows) > over:
            if key in done:
                continue
            done.add(key)
            items.append({"d": r[0], "j": r[1] or "", "list": r[2] or "", "title": titles.get(r[2] or "", ""), "cas": None,
                          "ch": r[4], "detail": "", "url": r[6] or "", "src": r[7], "n": len(substance_rows)})
            for x in g:
                if not x[3]:  # list-level rows of the same group stay separate
                    items.append(_item(x, titles))
            continue
        items.append(_item(r, titles))
    return items


def _item(r: tuple, titles: dict[str, str]) -> dict:
    return {"d": r[0], "j": r[1] or "", "list": r[2] or "", "title": titles.get(r[2] or "", ""), "cas": r[3],
            "ch": r[4], "detail": r[5] or "", "url": r[6] or "", "src": r[7], "n": 1}


CHANGE_WORDS = {"added": "추가", "removed": "삭제", "modified": "변경"}
SOURCE_SHORT = {"federal_register": "Federal Register (US)", "echa_candidate_list": "ECHA Candidate List",
                "law_go_kr_listmeta": "법제처", "law_go_kr_api": "법제처", "chemip_export_diff": "ChemIP"}


def rss_items(items: list[dict]) -> list[dict]:
    out = []
    for it in items[: RC.RSS_ITEMS]:
        what = f"{it['n']}종" if it["n"] > 1 else (it["detail"] or it["cas"] or "")
        head = it["title"] or it["list"] or SOURCE_SHORT.get(it["src"], it["src"])
        title = f"[{CHANGE_WORDS.get(it['ch'], it['ch'])}] {head}" + (f" — {what}" if what and what != head else "")
        if it["cas"]:
            title += f" ({it['cas']})"
        link = RC.LIST_PAGE_URL.format(id=it["list"]) if it["list"] and it["src"] == "chemip_export_diff" else (it["url"] or RC.SITE)
        guid = hashlib.sha1("|".join(str(it.get(k)) for k in ("d", "list", "cas", "ch", "detail", "url", "src")).encode()).hexdigest()
        out.append({"title": title[:300], "link": link, "date": it["d"], "guid": guid,
                    "description": f"{it['j']} · {it['d']} · {it['src']}"})
    return out


def _read_changes(path: str) -> tuple[list[tuple], dict, int]:
    if not os.path.exists(path):
        return [], {}, 0
    conn = sqlite3.connect(f"file:{path.replace(os.sep, '/')}?mode=ro", uri=True)
    try:
        total = conn.execute("SELECT COUNT(*) FROM reg_changes").fetchone()[0]
        rows = conn.execute(f"SELECT {CHANGE_COLS} FROM reg_changes ORDER BY changed_on DESC, source_id, list_id, cas "
                            "LIMIT ?", (config.REG_CHANGES_SCAN,)).fetchall()
        sources = {sid: {"name": n, "url": u, "license": lic, "retrieved_at": at}
                   for sid, n, u, lic, at in conn.execute("SELECT * FROM sources") if sid in RC.SOURCES}
    finally:
        conn.close()
    return rows, sources, total


def export_reg(log=print) -> dict:
    out = config.REG_DIR
    list_dir = os.path.join(out, "list")
    if os.path.isdir(list_dir):
        shutil.rmtree(list_dir)  # a list that disappeared must not leave its old files behind
    os.makedirs(list_dir, exist_ok=True)
    day = __import__("datetime").date.today().isoformat()

    lists = reg_lists.collect_lists()
    metas, gz_bytes, files = [], 0, 0
    for x in lists:
        parts = split_parts(x["rows"], config.REG_PART_ROWS)
        meta = list_meta(x, len(parts))
        metas.append(meta)
        head = {"v": config.REG_FORMAT, **meta, "license": x["license"], "fields": FIELDS,
                "part": 0, "part_rows": config.REG_PART_ROWS, "rows": parts[0]}
        gz_bytes += write_gzip(os.path.join(list_dir, f"{x['id']}.json"), head)[1]
        for k, part in enumerate(parts[1:], 1):
            gz_bytes += write_gzip(os.path.join(list_dir, f"{x['id']}.{k}.json"),
                                   {"v": config.REG_FORMAT, "id": x["id"], "part": k, "rows": part})[1]
        files += len(parts)

    rows, sources, total = _read_changes(config.PORTAL_DB)
    titles = {m["id"]: m["title"] for m in metas}
    items = fold_changes(rows, titles)[: RC.CHANGES_RECENT]
    write_gzip(os.path.join(out, "lists.json"), {"v": config.REG_FORMAT, "exported_at": day, "groups": RC.GROUPS,
                                                 "count": len(metas), "lists": metas, "sources": sources})
    write_gzip(os.path.join(out, "changes.json"), {"v": config.REG_FORMAT, "exported_at": day, "total": total,
                                                   "count": len(items), "items": items})
    rss = build_rss({"title": "ChemIP 규제 목록 변경 / Regulatory list changes", "link": RC.SITE + "/chemip?view=reg",
                     "description": "ChemIP 가 아는 규제 목록의 추가·삭제·변경과 공식 개정 소식(제목·날짜·링크)",
                     "self_url": RC.FEED_URL, "language": "ko", "built": day}, rss_items(items))
    with open(os.path.join(out, "changes.xml"), "wb") as fh:
        fh.write(gz(rss))
    log(f"reg: {len(metas)} lists, {files} list files ({gz_bytes / 1e6:.1f} MB gzip), {len(items)} change items of {total}")
    return {"lists": len(metas), "list_files": files, "list_gzip_bytes": gz_bytes, "rows": sum(m["n"] for m in metas),
            "change_items": len(items), "reg_changes_total": total, "rss_items": min(len(items), RC.RSS_ITEMS),
            "lists_json_bytes": len(gz(dumps(metas)))}
