"""Fetch the KCIA (former KPIA) petrochemical product lists into data/sources/kcia_products_raw.json.

Two pages (config.KCIA_PAGES): product-info (English labels by group) and statistics (Korean labels for the base
olefins/aromatics). Labels are stored verbatim with their group; nothing is interpreted here.
The per-product detail API (api/process.php EtcPages.info_product) returns data=null without a browser session,
so CAS numbers are NOT on the source: build_list.py resolves them against terminology.db.
Run: python fetch_kcia.py
"""
from __future__ import annotations

import datetime
import html
import json
import re
import urllib.request

import config

_CHECKBOX = re.compile(r'<input[^>]*name="chk\[\]"[^>]*value="([^"]+)"[^>]*datacate1=\s*"([^"]+)"')


def _get(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 " + config.USER_AGENT})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode("utf-8", "replace")


def _text_lines(page: str) -> list[str]:
    body = re.sub(r"<script.*?</script>|<style.*?</style>", "", page, flags=re.S)
    return [x.strip() for x in html.unescape(re.sub(r"<[^>]+>", "\n", body)).split("\n") if x.strip()]


def main() -> None:
    info = _get(config.KCIA_PAGES["product_info"])
    stats = _text_lines(_get(config.KCIA_PAGES["statistics"]))
    products = [{"label": v.strip(), "group": g.strip()} for v, g in _CHECKBOX.findall(info)]
    stat_labels = [stats[i - 1] for i, x in enumerate(stats) if x == "생산(출하)"]
    out = {"_source": config.KCIA_PAGES, "_fetched": datetime.date.today().isoformat(),
           "product_info": products, "statistics_labels": stat_labels}
    with open(config.KCIA_RAW, "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=1)
    print(f"product_info {len(products)} labels, statistics {len(stat_labels)} labels")


if __name__ == "__main__":
    main()
