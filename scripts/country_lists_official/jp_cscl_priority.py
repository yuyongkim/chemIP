"""Japan 化審法 優先評価化学物質 (Priority Assessment Chemical Substances), from NITE J-CHECK category 230.

J-CHECK list7 (category 230) gives 通し番号 / 公示整理番号 / 公示名称 / 公示日 for every designated item (one POST with
pageSize returns all); list5 under each 通し番号 gives the CAS RNs J-CHECK files under it. Session handling, paging
and the list5 row parser are the ones of the existing 化審法 lists (scripts/trade_controls/intl/jp_jcheck.py).
Raw HTML: <raw_dir>/jp_cscl_priority/jcheck230/. J-CHECK: 「公示整理番号(MITI番号)とCAS登録番号(CAS RN)の関連は、
最終的に確認されたものではありません」 — said in each detail.
"""
from __future__ import annotations

import html
import os
import re
import sys
import time
from pathlib import Path

from country_lists.base import Row, cas_valid

INTL_DIR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "trade_controls", "intl"))
CODE = "JP_CSCL_PRIORITY"
OWNED = (CODE,)
CATEGORY = 230
BASE = "https://www.nite.go.jp/chem/jcheck/"


def _jcheck():
    for p in (INTL_DIR, os.path.dirname(INTL_DIR)):
        if p not in sys.path:
            sys.path.append(p)
    import jp_jcheck  # noqa: E402  (scripts/trade_controls/intl)
    return jp_jcheck


def parse_items(page: str) -> list[dict]:
    """list7 rows -> [{tno, miti, name, date}]."""
    page = re.sub(r"<!--.*?-->", "", page, flags=re.S)
    out = []
    for tr in re.findall(r"<tr>.*?</tr>", page, re.S):
        if f"list5.action?category={CATEGORY}&" not in tr:
            continue
        cells = [re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", c))).strip() for c in re.findall(r"<td.*?</td>", tr, re.S)]
        if len(cells) >= 4 and cells[0].isdigit():
            out.append({"tno": int(cells[0]), "miti": cells[1], "name": cells[2], "date": cells[3]})
    return out


def _page(jc, session, folder: Path, name: str, url: str, offline: bool, data: dict | None = None, referer: str = "") -> str:
    path = folder / name
    if offline:
        return path.read_text(encoding="utf-8")
    text = session.get(url, data, referer=referer)
    folder.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    return text


def collect(raw_dir: str, offline: bool, source: str) -> tuple[list[Row], dict]:
    jc = _jcheck()
    folder = Path(raw_dir) / "jcheck230"
    session = None if offline else jc.Session()
    url = f"{BASE}list7.action?category={CATEGORY}&request_locale=ja"
    if not offline:
        session.get(url)  # opens the server-side list
    page = _page(jc, session, folder, "list7_all.html", url, offline,
                 {"dispPage": 1, "lastPage": 9, "sortKey": "num", "operationPage": "change", "inputPage": 1, "pageSize": 500}, url)
    items, problems = parse_items(page), []
    total = jc._count(page)
    if not total or total[2] != len(items):
        problems.append(f"J-CHECK 230: page says {total and total[2]} items, parsed {len(items)}")
    rows, no_cas = [], []
    for item in items:
        u5 = f"{BASE}list5.action?category={CATEGORY}&tno={item['tno']}&request_locale=ja"
        text = _page(jc, session, folder, f"tno{item['tno']:03d}.html", u5, offline)
        first = jc._count(text)
        if not offline and first and first[1] < first[2]:  # more than one page: ask for all rows at once
            text = _page(jc, session, folder, f"tno{item['tno']:03d}.html", f"{BASE}list5.action?category={CATEGORY}&request_locale=ja",
                         offline, {"dispPage": 1, "lastPage": 99, "sortKey": "casnum", "cno": "", "mno": "", "tno": item["tno"],
                                   "hno": "", "operationPage": "change", "inputPage": 1, "pageSize": 2000}, u5)
        subs = jc.parse_substances(text)
        count = jc._count(text)
        if count and count[2] != len(subs):
            problems.append(f"J-CHECK 230/{item['tno']}: page says {count[2]} rows, parsed {len(subs)} (paging failed)")
        good = [s for s in subs if s["cas"] and cas_valid(s["cas"])]
        if not good:
            no_cas.append(item["tno"])
        for s in good:
            detail = (f"優先評価化学物質 通し番号 {item['tno']}: {item['name']} | 公示整理番号 {item['miti']} | 公示日 {item['date']}"
                      + " | match: NITE J-CHECK CAS (MITI番号-CAS link not finally confirmed)")
            rows.append(Row(s["cas"], CODE, detail, source, item["name"]))
        if not offline:
            time.sleep(0.4)
    top = _page(jc, session, folder, "top.html", f"{BASE}top.action?request_locale=ja", offline)
    return rows, {"items": len(items), "items_without_cas": len(no_cas), "rows": len(rows),
                  "cas": len({r.cas_no for r in rows}), "problems": problems, "jcheck_data_date": jc.data_date(top)}
