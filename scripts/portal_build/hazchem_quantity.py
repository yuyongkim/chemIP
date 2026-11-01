"""Build g/hazchem_quantity.json — the 화학물질관리법 per-substance quantity thresholds (최하위·하위·상위 규정수량)
for the "적용 법규 판정기" screen (?view=applicability, frontend/public/chemip/apl_*.jsx). Added 2026-10-31.

Source (statute-like administrative rule, not copyright-protected — 저작권법 제7조):
  화학물질안전원고시 「유해화학물질의 규정수량에 관한 규정」 제2026-4호 (2026-05-06 시행)
  별표 2  인체급성유해성·인체만성유해성·생태유해성 물질별 규정수량 (1,557 rows)
  별표 3  사고대비물질별 규정수량 (100 rows)
  law.go.kr publishes each 별표 as .hwp (and .pdf); we read the .hwp tables with hwp5_tables.read_tables (stdlib only).

Steps:
  1) download the two .hwp attachments into data/portal_raw/hazchem_quantity/ (skipped when present; --refresh to force),
     record sha256 + retrieval date in manifest.json. Bytes are untrusted and only parsed as an OLE/HWP table.
  2) parse → {accident: {CAS: [entry]}, hazardous: {CAS: [entry]}} and check row counts
  3) write gzip JSON (.json name) to E:/dev-cache/chemip-static/out/v1/g/hazchem_quantity.json and a staging copy
     (only this file) for upload_r2_s3.py --src <staging> --prefix v1/g --gzip-all

Run:  python -I -B G:\\MSDS\\scripts\\portal_build\\hazchem_quantity.py [--refresh]
Format: scripts/static_export/CONTRACT.md "g/hazchem_quantity.json".
"""
from __future__ import annotations

import datetime as _dt
import gzip
import hashlib
import json
import os
import re
import sys
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from hwp5_tables import read_tables  # noqa: E402

PROJECT = r"G:\MSDS"
RAW_DIR = os.path.join(PROJECT, "data", "portal_raw", "hazchem_quantity")
OUT_FILE = r"E:\dev-cache\chemip-static\out\v1\g\hazchem_quantity.json"
STAGING_DIR = r"E:\dev-cache\chemip-static\staging_hazchem_quantity"

NOTICE = {
    "name": "유해화학물질의 규정수량에 관한 규정",
    "issuer": "화학물질안전원",
    "number": "화학물질안전원고시 제2026-4호",
    "number_en": "NICS Notice No. 2026-4",
    "name_en": "Regulation on the Prescribed Quantities of Hazardous Chemicals",
    "promulgated": "2026-05-06",
    "effective": "2026-05-06",
    "url": "https://www.law.go.kr/행정규칙/유해화학물질의규정수량에관한규정",
    "legal": "화학물질관리법 시행규칙 제19조제2항제2호·제8항, 제23조제2항제4호·제12항, 제27조제1항제1호·제7항",
    "license": "공공 고시(저작권법 제7조에 따른 비보호 저작물)",
}
# law.go.kr attachment ids (flSeq) of the .hwp files for notice 제2026-4호 — change together with NOTICE.
ATTACHMENTS = {
    "annex2": {"flSeq": "167151497", "file": "byl2_2026-4.hwp", "rows": 1557},
    "annex3": {"flSeq": "167151613", "file": "byl3_2026-4.hwp", "rows": 100},
}
DOWNLOAD = "https://www.law.go.kr/LSW/flDownload.do?flSeq={}&bylClsCd=200201"
MAX_BYTES = 5_000_000
CAS_RE = re.compile(r"\d{2,7}-\d{2}-\d")
KIND = {"급성": "acute", "만성": "chronic", "생태": "eco", "저확산": "lowdisp", "용액": "solution"}


def _download(key: str, refresh: bool) -> str:
    meta = ATTACHMENTS[key]
    path = os.path.join(RAW_DIR, meta["file"])
    if os.path.exists(path) and not refresh:
        return path
    os.makedirs(RAW_DIR, exist_ok=True)
    req = urllib.request.Request(DOWNLOAD.format(meta["flSeq"]), headers={"User-Agent": "chemip-portal-build/1"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = resp.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES or data[:8] != b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1":
        raise ValueError(f"{key}: not an HWP (OLE) file or too large")
    with open(path, "wb") as fh:
        fh.write(data)
    return path


def _num(s: str):
    """'0.125' → 0.125, '8*' → 8.0, '-'/'' → None (the notice's '-' = no such quantity)."""
    s = (s or "").strip().rstrip("*").replace(",", "")
    try:
        return float(s)
    except ValueError:
        return None


def _cas_list(s: str) -> list[str]:
    return CAS_RE.findall(s or "")


def _name_parts(s: str) -> tuple[str, str]:
    """'염소[Chlorine]' / '염소 [Chlorine]' → ('염소', 'Chlorine')."""
    s = " ".join((s or "").split())
    m = re.match(r"^(.*?)\s*\[(.*)\]\s*$", s)
    return (m.group(1).strip(), m.group(2).strip()) if m else (s, "")


def parse_annex3(table: list[list[str]]) -> list[dict]:
    """사고대비물질: [no, 이름, CAS, 함량(%), 최하위, 하위, 상위]; continuation rows = 용액(*) or a second 함량 band."""
    out: list[dict] = []
    for row in table[1:]:
        no, name, cas, conc, lowest, lower, upper = (row + [""] * 7)[:7]
        q = {"lowest": _num(lowest), "lower": _num(lower), "upper": _num(upper)}
        if no.strip():
            ko, en = _name_parts(name)
            out.append({"no": int(no), "name": ko, "name_en": en, "cas": _cas_list(cas), "bands": [{"kind": "base", "conc": _num(conc), **q}]})
        elif out:
            if "*" in lowest:   # 별표 3 일반기준 가: 상온·상압에서 액체(용액)이면 * 값
                out[-1]["bands"].append({"kind": "solution", "conc": out[-1]["bands"][0]["conc"], **q})
            else:               # 질산 70% 초과
                c = conc.strip()
                band = {"kind": "base", "conc": _num(re.sub(r"[^\d.]", "", c)), "concAbove": "초과" in c, **q}
                out[-1]["bands"].append(band)
    return out


def parse_annex2(table: list[list[str]]) -> list[dict]:
    """인체급성·만성·생태유해성: [연번, 고유번호, 이름, CAS, 구분, 함량, 최하위, 하위, 상위]; '' 연번 rows continue the entry."""
    out: list[dict] = []
    for row in table[1:]:
        no, uid, name, cas, kind, conc, lowest, lower, upper = (row + [""] * 9)[:9]
        kinds = [KIND[k] for k in kind.split(",") if k in KIND]
        band = {"kinds": kinds, "conc": _num(conc), "lowest": _num(lowest), "lower": _num(lower), "upper": _num(upper)}
        if no.strip():
            ko, en = _name_parts(name)
            out.append({"no": int(no), "id": uid.strip(), "name": ko, "name_en": en, "cas": _cas_list(cas),
                        "deleted": kind.strip() == "(삭제)", "bands": []})
        if out and kinds:
            out[-1]["bands"].append(band)
    return out


def by_cas(entries: list[dict]) -> dict[str, list[dict]]:
    idx: dict[str, list[dict]] = {}
    for e in entries:
        if e.get("deleted"):
            continue
        slim = {k: v for k, v in e.items() if k not in ("cas", "deleted")}
        for c in e["cas"]:
            idx.setdefault(c, []).append(slim)
    return idx


def build(refresh: bool = False) -> dict:
    a2 = parse_annex2(read_tables(_download("annex2", refresh))[0])
    a3 = parse_annex3(read_tables(_download("annex3", refresh))[0])
    if len(a2) != ATTACHMENTS["annex2"]["rows"] or [e["no"] for e in a2] != list(range(1, len(a2) + 1)):
        raise ValueError(f"annex2: {len(a2)} entries or 연번 gap")
    if len(a3) != ATTACHMENTS["annex3"]["rows"] or [e["no"] for e in a3] != list(range(1, len(a3) + 1)):
        raise ValueError(f"annex3: {len(a3)} entries or 번호 gap")
    empty = [e["no"] for e in a2 if not e["deleted"] and not e["bands"]]
    if empty:
        raise ValueError(f"annex2 entries without bands: {empty[:10]}")
    return {
        "v": 1,
        "exported_at": _dt.date.today().isoformat(),
        "source": NOTICE,
        "unit": "t",
        "counts": {"annex2": len(a2), "annex2_deleted": sum(e["deleted"] for e in a2), "annex3": len(a3)},
        "accident": by_cas(a3),
        "hazardous": by_cas(a2),
    }


def _manifest() -> None:
    rec = {"retrieved": _dt.date.today().isoformat(), "notice": NOTICE["number"], "files": {}}
    for key, meta in ATTACHMENTS.items():
        p = os.path.join(RAW_DIR, meta["file"])
        with open(p, "rb") as fh:
            rec["files"][key] = {"flSeq": meta["flSeq"], "file": meta["file"], "sha256": hashlib.sha256(fh.read()).hexdigest()}
    with open(os.path.join(RAW_DIR, "manifest.json"), "w", encoding="utf-8") as fh:
        json.dump(rec, fh, ensure_ascii=False, indent=1)


def write(body: dict) -> tuple[int, int]:
    raw = json.dumps(body, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    packed = gzip.compress(raw, 9, mtime=0)
    for path in (OUT_FILE, os.path.join(STAGING_DIR, "hazchem_quantity.json")):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as fh:
            fh.write(packed)
    return len(raw), len(packed)


if __name__ == "__main__":
    body = build(refresh="--refresh" in sys.argv)
    _manifest()
    raw, packed = write(body)
    print(f"hazchem_quantity: annex2 {body['counts']['annex2']} ({body['counts']['annex2_deleted']} deleted), "
          f"annex3 {body['counts']['annex3']}; CAS keys accident {len(body['accident'])}, hazardous {len(body['hazardous'])}; "
          f"{raw} B raw, {packed} B gzip → {OUT_FILE}")
