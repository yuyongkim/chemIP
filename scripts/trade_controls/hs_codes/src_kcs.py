"""Source: Korea Customs Service (관세청) file data on data.go.kr.

* 15049722 관세청_HS부호      -> HSK 10-digit codes with Korean/English item names
                                  and validity dates (Excel serial days).
* 15049720 관세청_HSK별 신성질별_성질별 분류 -> Korean 2/4/6/10-digit titles per HSK10.

Neither file carries CAS numbers: KCS publishes no CAS -> HSK mapping here, so
these feed the hsk10_code / hs6_heading tables only.
"""
from __future__ import annotations

import datetime as dt
import json
import re
from collections import Counter, defaultdict

from . import config, http_fetch, xlsx_reader

SOURCE = "KR_KCS"
_DL_RE = re.compile(r"fn_fileDataDown\('(\d+)',\s*'(uddi:[0-9a-f-]+)',\s*'([^']*)',\s*'(\d+)',\s*'(\d+)'\)")


def _download_file(pk: str, label: str) -> dict:
    sess = http_fetch.Session()
    page_url = f"{config.DATAGOKR_BASE}/data/{pk}/fileData.do"
    page = sess.request(page_url).decode("utf-8", "replace")
    m = _DL_RE.search(page)
    if not m:
        raise RuntimeError(f"data.go.kr {pk}: download button not found")
    _, detail_pk, atch, sn, _hist = m.groups()
    xhr = {"X-Requested-With": "XMLHttpRequest", "Referer": page_url}
    info = json.loads(sess.request(
        config.DATAGOKR_BASE + "/tcs/dss/selectFileDataDownload.do",
        data={"publicDataDetailPk": detail_pk, "publicDataPk": pk, "atchFileId": atch,
              "fileDetailSn": sn, "publicDataTyCode": "PR0051"}, headers=xhr))
    if not info.get("status"):
        raise RuntimeError(f"data.go.kr {pk}: download refused")
    detail = info.get("dataSetFileDetailInfo") or {}
    limit = json.loads(sess.request(config.DATAGOKR_BASE + "/cmm/cmm/check-limit.json",
                                    data={"atchFileId": info["atchFileId"],
                                          "fileDetailSn": info["fileDetailSn"]}, headers=xhr))
    if limit.get("needCaptcha"):
        raise RuntimeError(f"data.go.kr {pk}: captcha required, retry later")
    file_url = (f"{config.DATAGOKR_BASE}/cmm/cmm/fileDownload.do?atchFileId={info['atchFileId']}"
                f"&fileDetailSn={info['fileDetailSn']}&dataNm={label}")
    payload = sess.request(file_url, headers={"Referer": page_url})
    path = http_fetch.save_raw("kcs", f"{label}.xlsx", payload)
    return {"path": path, "payload": payload, "page_url": page_url,
            "data_name": detail.get("dataNm"), "updated": detail.get("updtDt"),
            "registered": detail.get("confmDt")}


def download() -> dict:
    return {"hs_code": _download_file(config.KCS_HS_CODE_PK, "kcs_hs_code"),
            "hs_class": _download_file(config.KCS_HS_CLASS_PK, "kcs_hsk_classification")}


def _serial_to_date(s: str | None) -> str | None:
    try:
        return (dt.date(1899, 12, 30) + dt.timedelta(days=int(float(s)))).isoformat()
    except (TypeError, ValueError):
        return None


def parse_hs_code(payload: bytes) -> dict:
    """HSK10 leaves active on RETRIEVED -> [{hsk10, hs6, name_ko, name_en, valid_from, valid_to}]"""
    zf = xlsx_reader.open_xlsx(payload)
    rows = xlsx_reader.iter_rows(zf, xlsx_reader.sheet_paths(zf)[0][1])
    hdr = xlsx_reader.header_map(next(rows))
    need = ["HS부호", "적용시작일자", "적용종료일자", "한글품목명", "영문품목명"]
    if any(h not in hdr for h in need):
        raise ValueError(f"KCS HS부호 header changed: {list(hdr)}")
    code_c, from_c, to_c, ko_c, en_c = (hdr[h] for h in need)
    out, stats = [], Counter()
    for r in rows:
        code = (r.get(code_c) or "").strip()
        stats["source_rows"] += 1
        if not (code.isdigit() and len(code) == 10):
            stats["non_leaf_or_bad_code"] += 1
            continue
        vf, vt = _serial_to_date(r.get(from_c)), _serial_to_date(r.get(to_c))
        if (vf and vf > config.RETRIEVED) or (vt and vt < config.RETRIEVED):
            stats["inactive_on_retrieved"] += 1
            continue
        out.append({"hsk10": code, "hs6": code[:6], "name_ko": (r.get(ko_c) or "").strip(),
                    "name_en": (r.get(en_c) or "").strip(), "valid_from": vf, "valid_to": vt})
    stats["hsk10_active"] = len(out)
    return {"rows": out, "stats": dict(stats)}


def parse_hs_class(payload: bytes) -> dict:
    """Korean HS4/HS6 titles from the latest-year sheet."""
    zf = xlsx_reader.open_xlsx(payload)
    best = None
    for _name, path in xlsx_reader.sheet_paths(zf):
        rows = list(xlsx_reader.iter_rows(zf, path))
        hdr = xlsx_reader.header_map(rows[0])
        years = [int(r.get(hdr.get("년도", ""), "0") or 0) for r in rows[1:]]
        year = max(years) if years else 0
        if best is None or year > best[0]:
            best = (year, hdr, rows[1:])
    year, hdr, rows = best
    code_col = next(c for h, c in hdr.items() if "10단위부호" in h)
    c4, c6, c10 = hdr["세번4단위품명"], hdr["세번6단위품명"], hdr["세번10단위품명"]
    t4, t6, per_hs6 = defaultdict(Counter), defaultdict(Counter), defaultdict(list)
    for r in rows:
        code = (r.get(code_col) or "").strip()
        if not (code.isdigit() and len(code) == 10):
            continue
        if (r.get(c4) or "").strip():
            t4[code[:4]][r[c4].strip()] += 1
        if (r.get(c6) or "").strip():
            t6[code[:6]][r[c6].strip()] += 1
        per_hs6[code[:6]].append((r.get(c10) or "").strip())
    hs4 = {k: v.most_common(1)[0][0] for k, v in t4.items()}
    hs6, basis = {}, {}
    for k, names in per_hs6.items():
        if t6.get(k):
            hs6[k], basis[k] = t6[k].most_common(1)[0][0], "6단위품명"
        elif len(names) == 1 and names[0]:
            # HS6 not subdivided in HSK: its single 10-digit line carries the HS6 text.
            hs6[k], basis[k] = names[0], "sole 10단위품명"
    return {"year": year, "hs4": hs4, "hs6": hs6, "hs6_basis": basis}
