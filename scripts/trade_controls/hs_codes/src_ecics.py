"""Source: EU ECICS full extract (CAS RN -> CN code), DG TAXUD Data Dissemination System.

Extract layout (sheet 'DDS2-ECICS Extract'): CUS NUMBER | CAS REGISTRY NUMBERS |
CN CODE | IUPAC DESCRIPTION | FIRST NOMENCLATURE | FIRST NOMENCLATURE DESCRIPTION |
SYNONYMS. One row per CUS entry; the CAS field may list several CAS RNs (comma
separated) when the entry is a mixture or a set of equivalent forms.
"""
from __future__ import annotations

import re
import zipfile
import io

from . import cas as casmod
from . import config, http_fetch, xlsx_reader

SOURCE = "EU_ECICS"
_HEADERS = {
    "cus": "CUS NUMBER",
    "cas": "CAS REGISTRY NUMBERS",
    "cn": "CN CODE",
    "iupac": "IUPAC DESCRIPTION",
    "nom": "FIRST NOMENCLATURE",
    "nom_desc": "FIRST NOMENCLATURE DESCRIPTION",
}


def download() -> dict:
    sess = http_fetch.Session()
    page = sess.request(config.ECICS_CONSULT_URL).decode("utf-8", "replace")
    m = re.search(r"Last update:\s*(\d{2})-(\d{2})-(\d{4})", page)
    last_update = f"{m.group(3)}-{m.group(2)}-{m.group(1)}" if m else None
    payload = sess.request(config.ECICS_FULL_URL)
    path = http_fetch.save_raw("ecics", "ECICS_full_extract.zip", payload)
    return {"path": path, "payload": payload, "last_update": last_update}


def _split_code(cn: str) -> tuple[str | None, str | None, str]:
    """Return (hs6, cn8, level) for a CN code string as published."""
    if len(cn) == 8:
        return cn[:6], cn, "cn8"
    if len(cn) == 6:
        return cn, None, "hs6"
    if len(cn) == 4:
        return None, None, "hs4"
    if len(cn) == 2:
        return None, None, "chapter"
    return None, None, "other"


def parse(payload: bytes) -> dict:
    outer = zipfile.ZipFile(io.BytesIO(payload))
    names = [n for n in outer.namelist() if n.lower().endswith(".xlsx")]
    if len(names) != 1:
        raise ValueError(f"unexpected ECICS archive content: {outer.namelist()}")
    if outer.getinfo(names[0]).file_size > config.MAX_UNZIPPED_BYTES:
        raise ValueError("ECICS xlsx beyond size cap")
    zf = xlsx_reader.open_xlsx(outer.read(names[0]))
    sheet = xlsx_reader.sheet_paths(zf)[0][1]
    rows_iter = xlsx_reader.iter_rows(zf, sheet)
    hdr = xlsx_reader.header_map(next(rows_iter))
    missing = [h for h in _HEADERS.values() if h not in hdr]
    if missing:
        raise ValueError(f"ECICS header changed, missing: {missing}")
    col = {k: hdr[v] for k, v in _HEADERS.items()}

    out, rejected = [], []
    stats = {"source_rows": 0, "rows_no_cas": 0, "rows_no_cn": 0, "rows_multi_cas": 0,
             "cn_levels": {}}
    for r in rows_iter:
        stats["source_rows"] += 1
        cus = (r.get(col["cus"]) or "").strip()
        cas_field = (r.get(col["cas"]) or "").strip()
        cn = re.sub(r"\D", "", r.get(col["cn"]) or "")
        iupac = (r.get(col["iupac"]) or "").strip()
        nom = (r.get(col["nom"]) or "").strip()
        nom_desc = (r.get(col["nom_desc"]) or "").strip()
        if not cas_field:
            stats["rows_no_cas"] += 1
            rejected.append({"raw_cas": "", "cus": cus, "cn_code": cn, "reason": "no CAS in entry"})
            continue
        if not cn:
            stats["rows_no_cn"] += 1
            rejected.append({"raw_cas": cas_field, "cus": cus, "cn_code": "", "reason": "no CN code"})
            continue
        hs6, cn8, level = _split_code(cn)
        stats["cn_levels"][level] = stats["cn_levels"].get(level, 0) + 1
        parts = [p for p in re.split(r"[,;]", cas_field) if p.strip()]
        multi = len(parts) > 1
        stats["rows_multi_cas"] += int(multi)
        description = iupac or nom_desc
        name_type = "IUPAC" if iupac else (nom or None)
        for raw in parts:
            norm = casmod.normalize(raw)
            if not casmod.is_valid(norm):
                reason = ("placeholder CAS 0-00-0 (entry has no CAS RN)" if norm == "0-00-0"
                          else "CAS format/check digit invalid")
                rejected.append({"raw_cas": raw.strip(), "cus": cus, "cn_code": cn,
                                 "reason": reason})
                continue
            out.append({
                "cas": norm, "hs6": hs6, "cn8": cn8, "hsk10": None,
                "description": description, "source": SOURCE,
                "cn_code": cn, "cn_level": level, "cus": cus, "name_type": name_type,
                "cas_group": cas_field if multi else None, "is_multi_cas": int(multi),
            })
    return {"rows": out, "rejected": rejected, "stats": stats}
