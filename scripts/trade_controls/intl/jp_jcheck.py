"""NIHS/NITE J-CHECK (化審法データベース) list pages: 政令 item list and the CAS examples under each item.

list6.action?category=C          -> 政令番号 / 政令名称 (C: 211 第一種特定, 212 第二種特定, 220 監視)
list5.action?category=C&tno=N    -> No. / CAS RN / MITI番号 / 化学物質名称 for item N
The site keeps paging in a server session: GET the page first, then POST pageSize=200 (and inputPage for page 2+).
Raw HTML is saved under raw_dir/jp/jcheck/. J-CHECK states that the MITI番号-CAS RN link is not finally confirmed.
"""
from __future__ import annotations

import html
import http.cookiejar
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

from intl_common import USER_AGENT, clean, file_info

BASE = "https://www.nite.go.jp/chem/jcheck/"
COUNT_RE = re.compile(r"(\d+)\s*-\s*(\d+)\s*件目表示/\s*(\d+)\s*件中")


class Session:
    def __init__(self) -> None:
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

    def get(self, url: str, data: dict | None = None, referer: str = "") -> str:
        body = urllib.parse.urlencode(data).encode() if data is not None else None
        req = urllib.request.Request(url, data=body, headers={"User-Agent": USER_AGENT, "Referer": referer or url})
        last: Exception | None = None
        for attempt in range(1, 4):
            try:
                with self.opener.open(req, timeout=90) as resp:
                    return resp.read().decode("utf-8", errors="replace")
            except Exception as exc:  # network errors are retried
                last = exc
                time.sleep(2 * attempt)
        raise RuntimeError(f"J-CHECK download failed: {url}: {last}")


def _text(fragment: str) -> str:
    return clean(html.unescape(re.sub(r"<[^>]+>", " ", fragment)))


def _count(page: str) -> tuple[int, int, int] | None:
    m = COUNT_RE.search(_text(page))
    return tuple(int(g) for g in m.groups()) if m else None


def _save(path: Path, text: str) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    return path


def _read(path: Path) -> str:
    if not path.exists():
        raise FileNotFoundError(f"offline mode but raw file missing: {path}")
    return path.read_text(encoding="utf-8")


def parse_items(page: str) -> list[dict]:
    """政令 items on a list6 page: [{tno, name}]."""
    items = []
    for m in re.finditer(r'href="list5\.action\?category=\d+&tno=(\d+)[^"]*"[^>]*>\s*\d+\s*</a>\s*</td>\s*<td>(.*?)</td>', page, re.S):
        items.append({"tno": int(m.group(1)), "name": _text(m.group(2))})
    return items


def parse_substances(page: str) -> list[dict]:
    """Rows of a list5 page: [{cas, miti, name}] ('-' means none)."""
    rows = []
    for tr in re.findall(r"<tr.*?</tr>", page, re.S):
        cells = [_text(c) for c in re.findall(r"<td.*?</td>", tr, re.S)]
        if len(cells) >= 4 and cells[0].isdigit():
            cas = cells[1] if cells[1] not in ("-", "") else ""
            rows.append({"cas": cas, "miti": cells[2] if cells[2] != "-" else "", "name": cells[3]})
    return rows


def data_date(page: str) -> str:
    """'データを更新しました。(2026/10/15)' on the J-CHECK top page -> '2026-10-15'."""
    m = re.search(r"データを更新しました。\s*\((\d{4})/(\d{1,2})/(\d{1,2})\)", _text(page))
    return f"{m.group(1)}-{int(m.group(2)):02d}-{int(m.group(3)):02d}" if m else ""


def fetch_category(category: int, raw_dir: Path, offline: bool) -> dict:
    """Items of a category with their substances: {items, files, problems, data_date}."""
    folder = raw_dir / "jp" / "jcheck" / str(category)
    session = None if offline else Session()
    list_url = f"{BASE}list6.action?category={category}&request_locale=ja"
    list_path = folder / "list6.html"
    page = _read(list_path) if offline else _save(list_path, session.get(list_url)).read_text(encoding="utf-8")
    items = parse_items(page)
    files = [file_info(list_path, list_url)]
    problems = []
    total = _count(page)
    if total and total[2] != len(items):
        problems.append(f"J-CHECK category {category}: page says {total[2]} items, parsed {len(items)}")
    for item in items:
        url = f"{BASE}list5.action?category={category}&tno={item['tno']}&request_locale=ja"
        subs: list[dict] = []
        page_no = 1
        first = "" if offline else session.get(url)  # GET opens the server-side list (100 rows per page)
        while True:
            path = folder / f"tno{item['tno']:03d}_p{page_no}.html"
            if offline:
                text = _read(path)
            else:
                done = _count(first)
                if page_no == 1 and (not done or done[1] >= done[2]):
                    text = first  # everything (or nothing) is already on the first page
                else:
                    last_page = re.search(r'name="lastPage" value="(\d*)"', first)
                    text = session.get(f"{BASE}list5.action?category={category}&request_locale=ja", {
                        "dispPage": max(page_no - 1, 1), "lastPage": last_page.group(1) if last_page else "",
                        "sortKey": "casnum", "cno": "", "mno": "", "tno": item["tno"], "hno": "",
                        "operationPage": "change" if page_no == 1 else "next", "inputPage": max(page_no - 1, 1),
                        "pageSize": 200}, referer=url)
                    if not _count(text):
                        problems.append(f"J-CHECK {category}/{item['tno']}: paging request p{page_no} failed")
                _save(path, text)
            files.append(file_info(path, url))
            subs.extend(parse_substances(text))
            count = _count(text)
            if not count or count[1] >= count[2]:
                if count and count[2] != len(subs):
                    problems.append(f"J-CHECK {category}/{item['tno']}: page says {count[2]} rows, parsed {len(subs)}")
                break
            page_no += 1
        item["substances"] = subs
    top_url = f"{BASE}top.action?request_locale=ja"
    top_path = folder.parent / "top.html"
    top = _read(top_path) if offline else _save(top_path, session.get(top_url)).read_text(encoding="utf-8")
    files.append(file_info(top_path, top_url))
    return {"items": items, "files": files, "problems": problems, "data_date": data_date(top)}
