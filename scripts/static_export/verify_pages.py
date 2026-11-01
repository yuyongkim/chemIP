"""p/ verification against the LIVE API: random substances, every endpoint a page replaces, sequential + gentle."""
from __future__ import annotations

import random

import config
import live_api
from jsondiff import first_diff
from jsonio import read_any
from substances import page_path


def _endpoints(page: dict) -> list[tuple[str, str, object]]:
    cid, cas = page["chem_id"], page["cas"]
    out = [("chemical", f"/chemicals/{live_api.q(cid)}", page["detail"])]
    if cas:
        for d in config.DIRECTIONS:
            out.append((f"trade_{d}", f"/regulations/trade-controls/{live_api.q(cas)}?direction={d}&country=", page["trade"][d]))
        out.append(("international", f"/regulations/international/{live_api.q(cas)}", page["intl"]))
        out.append(("kr_permit_context", f"/integrations/kr-permit-context/{live_api.q(cas)}", page["permit_context"]))
    return out


def verify(items: list[dict], n: int = config.VERIFY_PAGES, log=print) -> dict:
    sample = random.Random(config.VERIFY_SEED).sample(items, min(n, len(items)))
    checks = []
    for i, item in enumerate(sample, 1):
        page = read_any(page_path(item["chem_id"]))
        for name, path, mine in _endpoints(page):
            api, status = live_api.get(path)
            if name == "chemical" and status != page["detail_status"]:
                diff = f"status {status} vs {page['detail_status']}"
            else:
                diff = first_diff(api, mine) if status == 200 or name == "chemical" else f"status {status}"
            checks.append({"chem_id": item["chem_id"], "kind": item["kind"], "endpoint": name, "status": status,
                           "equal": diff is None, "diff": diff})
        if i % 20 == 0:
            log(f"verify pages {i}/{len(sample)}: {sum(c['equal'] for c in checks)}/{len(checks)} equal")
    summary: dict[str, dict] = {}
    for c in checks:
        s = summary.setdefault(c["endpoint"], {"checked": 0, "equal": 0})
        s["checked"] += 1
        s["equal"] += c["equal"]
    kinds: dict[str, int] = {}
    for it in sample:
        kinds[it["kind"]] = kinds.get(it["kind"], 0) + 1
    return {"substances": len(sample), "by_kind": kinds, "summary": summary,
            "mismatches": [c for c in checks if not c["equal"]][:50]}
