"""Saudi Arabia: SFDA cosmetics ingredient lists (Prohibited Ingredients List, Restricted Substances List).

Published only as paginated HTML tables ('Chemical Name | CAS Number | Details', 10 rows a page, ?page=0..N).
The last page number is read from the pager of page 0; every page is saved under raw/sa/ and parsed.
A CAS cell may hold several numbers ('132-60-5 / 5949-18-8'); an empty cell = family entry.
The 'Details' pop-ups (conditions of use) are not fetched; the source_url points to the list.
"""
from __future__ import annotations

import html
import re
import time
from pathlib import Path

from intl_common import cas_tokens, clean, entry, fetch, file_info, split_entries

ROW = re.compile(r"<tr\b[^>]*>\s*<td>(.*?)</td>\s*<td>(.*?)</td>", re.S)


def _plain(fragment: str) -> str:
    return clean(html.unescape(re.sub(r"<[^>]+>", " ", fragment)))


def last_page(page: str) -> int:
    return max([int(x) for x in re.findall(r"[?&]page=(\d+)", page)] or [0])


def crawl(url: str, stem: str, raw_dir: Path, offline: bool, headers: dict, pause: float) -> tuple[list[tuple], list[dict], int]:
    first = fetch(url.format(page=0), raw_dir / "sa" / f"{stem}_p0000.html", offline, headers=headers)
    pages = [first]
    n = last_page(first.read_text(encoding="utf-8", errors="replace"))
    for i in range(1, n + 1):
        if not offline:
            time.sleep(pause)
        pages.append(fetch(url.format(page=i), raw_dir / "sa" / f"{stem}_p{i:04d}.html", offline, headers=headers))
    rows: list[tuple] = []
    for i, p in enumerate(pages):
        text = p.read_text(encoding="utf-8", errors="replace")
        body = text[text.find("<tbody"):text.find("</tbody>")]
        rows += [(_plain(a), _plain(b), i) for a, b in ROW.findall(body)]
    files = [file_info(pages[0], url.format(page=0)),
             {"pages": len(pages), "url_pattern": url, "files": f"{stem}_p0000..{len(pages) - 1:04d}.html"}]
    return rows, files, len(pages)


def collect(spec: dict, raw_dir: Path, offline: bool) -> dict:
    out = {}
    for key, meta in spec["lists"].items():
        rows, files, pages = crawl(meta["list_url"], key, raw_dir, offline, spec.get("headers") or {}, spec.get("pause", 0.4))
        items = []
        for name, cas_cell, page in rows:
            cas = cas_tokens(cas_cell)
            items.append(entry("", name[:300], f"SFDA {meta['label']}; page {page + 1}", cas_all=cas,
                               match_method="law_cas" if cas else "no_cas"))
        entries, families, bad = split_entries(items)
        out[key] = {"entries": entries, "family_entries": families,
                    "problems": [f"invalid CAS in source: {bad}"] if bad else [],
                    "official_count": None,
                    "official_count_basis": f"SFDA 페이지에 총 건수 기재 없음 — {pages}쪽 표의 행 수",
                    "counted": len(rows),
                    "source_version": f"SFDA {meta['label']} 웹 목록({pages}쪽, {len(rows)}행) 2026-10-25 수집, 개정일 표시 없음",
                    "notes": [f"표 {pages}쪽 전체를 읽었다(쪽당 10행). 사용 조건(Details 팝업)은 수집하지 않음."],
                    "files": files}
    return out
