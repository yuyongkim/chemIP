"""Official change sources → reg_changes rows (metadata only: title, date, link, list).

    (changed_on, jurisdiction, list_id, cas, change, detail, source_url, source_id)

| source_id            | what                                                                  | needs        |
|----------------------|-----------------------------------------------------------------------|--------------|
| law_go_kr_listmeta   | each KR list's 고시·법령 개정일 (amended_on, recorded from law.go.kr)   | nothing      |
| law_go_kr_api        | 법제처 OPEN API 발령일자 of each KR list's 고시/법령, when newer         | OC key (.env)|
| federal_register     | EPA / OSHA chemical rules (reg_config.FEDREG_QUERIES)                 | nothing      |
| echa_candidate_list  | ECHA Candidate List inclusion dates, one row per included substance   | nothing      |

The *_rows(...) parsers are pure (input = parsed response) and tested in tests/test_reg_official.py.
fetch_all() calls the network; a failing source is reported, never fatal.
"""
from __future__ import annotations

import datetime as dt
import json
import os
import re
import urllib.parse
import xml.etree.ElementTree as ET

import reg_config as C
import reg_http

CAS_RE = re.compile(r"^\d{2,7}-\d{2}-\d$")
MONTHS = {m: i for i, m in enumerate(["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], 1)}


# ---------- law.go.kr ----------

def listmeta_rows(lists: list[dict]) -> list[tuple]:
    """KR lists with an amended_on date: one 'modified' row each (the notice/statute amendment the list reflects)."""
    out = []
    for x in lists:
        if x["group"] == "kr_law" and re.match(r"^\d{4}-\d{2}-\d{2}$", x.get("amended_on") or ""):
            out.append((x["amended_on"], "KR", x["id"], None, "modified",
                        f"{x['law']} — {x['title']}: 고시·법령 개정", x.get("source_url") or "", "law_go_kr_listmeta"))
    return out


def _law_target(source_url: str) -> tuple[str, str] | None:
    """law.go.kr/행정규칙/<name> → ("admrul", name); /법령/<name> → ("law", name)."""
    path = urllib.parse.unquote(urllib.parse.urlparse(source_url or "").path)
    m = re.match(r"^/(행정규칙|법령)/([^/]+)", path)
    if not m:
        return None
    return ("admrul" if m.group(1) == "행정규칙" else "law"), m.group(2)


def _iso8(d: str) -> str:
    d = (d or "").strip()
    return f"{d[:4]}-{d[4:6]}-{d[6:8]}" if len(d) == 8 and d.isdigit() else ""


def law_search_hits(xml_bytes: bytes, target: str) -> list[dict]:
    root = ET.fromstring(xml_bytes)
    tag, name_tag, date_tag, no_tag = (("admrul", "행정규칙명", "발령일자", "발령번호") if target == "admrul"
                                       else ("law", "법령명한글", "공포일자", "공포번호"))
    return [{"name": (el.findtext(name_tag) or "").strip(), "date": _iso8(el.findtext(date_tag) or ""),
             "number": (el.findtext(no_tag) or "").strip()} for el in root.iter(tag)]


def law_api_rows(kr_list: dict, hits: list[dict]) -> list[tuple]:
    """Newest hit whose name (spaces removed) equals the list's notice name and whose date is after amended_on."""
    t = _law_target(kr_list.get("source_url", ""))
    if not t:
        return []
    want = t[1].replace(" ", "")
    dates = sorted((h for h in hits if h["name"].replace(" ", "") == want and h["date"]), key=lambda h: h["date"])
    if not dates or dates[-1]["date"] <= (kr_list.get("amended_on") or ""):
        return []
    h = dates[-1]
    return [(h["date"], "KR", kr_list["id"], None, "modified",
             f"{h['name']} 발령 {h['number']}".strip(), kr_list["source_url"], "law_go_kr_api")]


def law_oc() -> str:
    for name in C.LAW_OC_NAMES:
        if os.environ.get(name):
            return os.environ[name].strip()
    try:
        with open(C.ENV_FILE, encoding="utf-8") as fh:
            for line in fh:
                k, sep, v = line.partition("=")
                if sep and k.strip().upper() in C.LAW_OC_NAMES:
                    return v.strip().strip('"').strip("'")
    except OSError:
        pass
    return ""


def fetch_law(lists: list[dict]) -> tuple[list[tuple], dict]:
    oc = law_oc()
    if not oc:
        return [], {"skipped": f"no OC key ({' / '.join(C.LAW_OC_NAMES)} in env or .env)"}
    rows, failed = [], []
    for x in lists:
        t = _law_target(x.get("source_url", "")) if x["group"] == "kr_law" else None
        if not t:
            continue
        try:
            raw = reg_http.get(C.LAW_SEARCH_API, {"OC": oc, "target": t[0], "type": "XML", "query": t[1], "display": 20})
            hits = law_search_hits(raw, t[0])
            if not hits and b"<result>" in raw:
                return rows, {"failed": "OC key refused (IP/domain not registered at open.law.go.kr)"}
            rows += law_api_rows(x, hits)
        except Exception as exc:  # one notice failing does not stop the rest
            failed.append(f"{x['id']}: {str(exc)[:120]}")
    return rows, {"rows": len(rows), "failed": failed[:10]}


# ---------- Federal Register ----------

def fedreg_list_id(title: str) -> str | None:
    t = (title or "").lower()
    for needle, lid in C.FEDREG_LIST_RULES:
        if needle in t:
            return lid
    return None


def fedreg_rows(body: dict) -> list[tuple]:
    out = []
    for d in body.get("results") or []:
        date, title, url = d.get("publication_date") or "", (d.get("title") or "").strip(), d.get("html_url") or ""
        if not (date and title and url):
            continue
        out.append((date, "US", fedreg_list_id(title), None, "modified", f"[{d.get('type') or 'Rule'}] {title}", url,
                    "federal_register"))
    return out


def fetch_fedreg(today: dt.date) -> tuple[list[tuple], dict]:
    since = (today - dt.timedelta(days=C.FEDREG_SINCE_DAYS)).isoformat()
    rows, info = [], []
    for q in C.FEDREG_QUERIES:
        params = [("per_page", 100), ("order", "newest"), ("conditions[agencies][]", q["agency"]),
                  ("conditions[type][]", q["type"]), ("conditions[term]", q["term"]),
                  ("conditions[publication_date][gte]", since)]
        params += [("fields[]", f) for f in ("title", "publication_date", "html_url", "document_number", "type")]
        try:
            got = fedreg_rows(json.loads(reg_http.get(C.FEDREG_API, params)))
            rows += got
            info.append({"agency": q["agency"], "term": q["term"], "rows": len(got)})
        except Exception as exc:
            info.append({"agency": q["agency"], "term": q["term"], "error": str(exc)[:160]})
    seen, uniq = set(), []
    for r in rows:  # a rule can match two queries
        if r[6] not in seen:
            seen.add(r[6])
            uniq.append(r)
    return uniq, {"queries": info, "rows": len(uniq)}


# ---------- ECHA Candidate List ----------

def echa_date(s: str) -> str:
    m = re.match(r"^(\d{1,2})-([A-Za-z]{3})-(\d{4})$", (s or "").strip())
    if not m or m.group(2).title() not in MONTHS:
        return ""
    return f"{m.group(3)}-{MONTHS[m.group(2).title()]:02d}-{int(m.group(1)):02d}"


def echa_rows(items: list[dict]) -> list[tuple]:
    out = []
    for it in items:
        date = echa_date(it.get("dateOfInclusion") or "")
        if not date:
            continue
        name = "; ".join(n for n in it.get("substanceName") or [] if n).strip()
        reason = "; ".join(r for r in it.get("reasonForInclusion") or [] if r).strip()
        cas_list = [c.strip() for c in it.get("casNumber") or [] if CAS_RE.match((c or "").strip())]
        detail = f"{name} — {reason}" if reason else name
        for cas in cas_list or [None]:
            out.append((date, "EU", C.ECHA_LIST_ID, cas, "added", detail[:300], C.ECHA_CANDIDATE_PAGE, "echa_candidate_list"))
    return out


def fetch_echa() -> tuple[list[tuple], dict]:
    items, page = [], 1
    try:
        while page < 20:
            body = json.loads(reg_http.get(C.ECHA_CANDIDATE_API, {"pageIndex": page, "pageSize": C.ECHA_PAGE_SIZE}))
            got = body.get("items") or []
            items += got
            if len(got) < C.ECHA_PAGE_SIZE:
                break
            page += 1
    except Exception as exc:
        return [], {"error": str(exc)[:200], "items": len(items)}
    rows = echa_rows(items)
    return rows, {"items": len(items), "rows": len(rows)}


def fetch_all(lists: list[dict], today: dt.date) -> tuple[list[tuple], dict]:
    report, rows = {}, listmeta_rows(lists)
    report["law_go_kr_listmeta"] = {"rows": len(rows)}
    for name, fn in (("law_go_kr_api", lambda: fetch_law(lists)), ("federal_register", lambda: fetch_fedreg(today)),
                     ("echa_candidate_list", fetch_echa)):
        got, info = fn()
        rows += got
        report[name] = info
    return rows, report
