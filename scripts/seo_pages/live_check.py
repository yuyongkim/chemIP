"""Sample rendered pages vs the PRODUCTION API (127.0.0.1:7011): one request at a time, <= 2 req/s, bot UA.

Per sampled page: trade-controls import + export and chemical detail. Compared with what the HTML shows:
Korean list ids, permit ids, foreign list ids (union of both directions, inventories excluded), controlled list ids,
obligation rule ids (specific + generic), HS6 codes, MSDS signal word and H-codes.
"""
from __future__ import annotations

import json
import random
import re
import time
import urllib.error
import urllib.parse
import urllib.request

import config
import htmlscan
import urls

_last = [0.0]
H_CODE = re.compile(r"((?:EU)?H\d{3}[A-Za-z]{0,2}(?:\s*\+\s*H\d{3}[A-Za-z]{0,2})*)\s*:")


def get(path: str):
    wait = config.API_GAP_SECONDS - (time.time() - _last[0])
    if wait > 0:
        time.sleep(wait)
    req = urllib.request.Request(config.API + path, headers={"User-Agent": config.API_USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=config.API_TIMEOUT) as r:
            body, status = r.read(), r.status
    except urllib.error.HTTPError as e:
        body, status = e.read(), e.code
    finally:
        _last[0] = time.time()
    return (json.loads(body or b"null") if status == 200 else None), status


def _api_sets(cas: str, chem_id: str) -> dict:
    q = urllib.parse.quote(cas, safe="")
    imp, s1 = get(f"/regulations/trade-controls/{q}?direction=import")
    exp, s2 = get(f"/regulations/trade-controls/{q}?direction=export")
    det, s3 = get(f"/chemicals/{urllib.parse.quote(chem_id, safe='')}")
    if s1 != 200 or s2 != 200:
        return {"error": f"trade-controls {s1}/{s2}"}
    kr = {m["list_id"] for g in imp["kr_law_lists"] for m in g["lists"] if config.is_real_kr_list(m.get("list_id") or "")}
    intl = {m["list_id"] for d in (imp, exp) for m in d["intl_lists"] if not m.get("absent")} - config.INVENTORY_LIST_IDS
    out = {
        "kr": kr,
        "permits": {p.get("permit_id") or p.get("name") for p in imp["kr_permits"]},
        "intl": intl,
        "controlled": {m["list_id"] for m in imp["controlled_lists_any"]},
        "rules": {r["rule_id"] for d in (imp, exp) for r in d["kr_obligations"]},
        "hs6": {h["hs6"] for h in imp["hs"] if h.get("hs6")},
    }
    if s3 == 200 and det:
        sec2 = next((s for s in det.get("sections") or [] if s.get("section_seq") == 2), None)
        items = {i.get("msdsItemCode"): i.get("itemDetail", "") for i in (sec2 or {}).get("content") or []}
        out["signal"] = (items.get("B0404") or "").strip()
        out["h_codes"] = {re.sub(r"\s+", "", m) for m in H_CODE.findall(items.get("B0406") or "")}
    return out


def _page_sets(cas: str) -> dict:
    with open(urls.file_for(urls.cas_path(cas)), encoding="utf-8") as fh:
        text = fh.read()
    s = htmlscan.scan(text)
    d = s.data
    hs6 = set(re.findall(r'<li><span class="mono">(\d{6})</span>', text.split('id="hs"', 1)[-1].split("<h2", 1)[0]))
    hsec = text.split('id="h-statements"', 1)[-1].split("</ul>", 1)[0] if 'id="h-statements"' in text else ""
    sig = re.search(r'<span class="signal">([^<]*)</span>', text)
    return {
        "kr": set(d.get("kr", {}).get("data-list", [])),
        "permits": set(d.get("permits", {}).get("data-permit", [])),
        "intl": set(d.get("intl", {}).get("data-list", [])),
        "controlled": set(d.get("controlled", {}).get("data-list", [])),
        "rules_specific": set(d.get("obligations", {}).get("data-rule", [])),
        "hs6": hs6,
        "signal": sig.group(1) if sig else "",
        "h_codes": set(re.findall(r'<li><span class="mono">([^<]+)</span>', hsec)),
        "counts": s.counts,
    }


def run(gen: dict) -> dict:
    rng = random.Random(config.SAMPLE_SEED)
    pool = sorted(gen["indexable"])
    sample = rng.sample(pool, min(config.LIVE_SAMPLE, len(pool)))
    results, fails = [], 0
    for cas in sample:
        f = gen["facts"][cas]
        api = _api_sets(cas, f["chem_id"] or cas)  # /api/chemicals accepts a CAS for non-KOSHA substances
        page = _page_sets(cas)
        if "error" in api:
            results.append({"cas": cas, "error": api["error"]})
            fails += 1
            continue
        generic = {o["rule_id"] for o in f["obligations_generic"]}
        checks = {
            "kr_lists": page["kr"] == api["kr"] and page["counts"].get("kr") == len(api["kr"]),
            "permits": page["permits"] == api["permits"] and page["counts"].get("permits", 0) == len(api["permits"]),
            "foreign_lists": page["intl"] == api["intl"] and page["counts"].get("intl") == len(api["intl"]),
            "controlled": page["controlled"] == api["controlled"],
            "obligations": (page["rules_specific"] | generic) == api["rules"],
            "hs6": page["hs6"] == api["hs6"],
        }
        if "signal" in api:
            checks["msds_signal"] = page["signal"] == api["signal"] or (not page["signal"] and api["signal"] in ("", "자료없음", "해당없음"))
            checks["msds_h_codes"] = page["h_codes"] == api["h_codes"]
        ok = all(checks.values())
        fails += not ok
        row = {"cas": cas, "ok": ok, "checks": checks,
               "api_counts": {k: len(v) for k, v in api.items() if isinstance(v, set)}}
        if not ok:
            row["diff"] = {k: {"page_only": sorted(page.get(k if k != "rules" else "rules_specific", set()) - api[k]) if isinstance(api.get(k), set) else None,
                               "api_only": sorted(api[k] - page.get(k if k != "rules" else "rules_specific", set())) if isinstance(api.get(k), set) else None}
                           for k in ("kr", "permits", "intl", "controlled", "hs6", "h_codes") if isinstance(api.get(k), set)}
        results.append(row)
    return {"sampled": len(sample), "failed": fails, "requests": len(sample) * 3, "results": results}
