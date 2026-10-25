"""Source: EU Combined Nomenclature official texts (English) -> HS4/HS6/CN8 titles.

The Excel copy has columns: A = new/reused flag, B = CN code ('2811', '2811 19',
'2811 11 00'), C = text, D = supplementary unit. Uncoded indent lines (no B)
are group captions and are not stored as titles.
"""
from __future__ import annotations

from collections import Counter

from . import config, http_fetch, xlsx_reader

SOURCE = f"EU_CN{config.CN_YEAR}"


def download() -> dict:
    payload = http_fetch.Session().request(config.CN_TEXT_URL)
    path = http_fetch.save_raw("cn", f"CNofftextE_{config.CN_YEAR}.xlsx", payload)
    return {"path": path, "payload": payload}


def parse(payload: bytes) -> dict:
    zf = xlsx_reader.open_xlsx(payload)
    sheet = xlsx_reader.sheet_paths(zf)[0][1]
    hs4, hs6_line6, hs6_line8, cn8 = {}, {}, {}, {}
    for r in xlsx_reader.iter_rows(zf, sheet):
        raw_code = (r.get("B") or "").strip()
        code = raw_code.replace(" ", "")
        text = (r.get("C") or "").strip()
        if not code.isdigit() or not text:
            continue
        if len(code) == 4:
            hs4[code] = text
        elif len(code) == 6:
            hs6_line6[code] = text
        elif len(code) == 8:
            cn8[code] = text
            if code.endswith("00"):
                hs6_line8.setdefault(code[:6], text)
    # An HS6 is either a 6-digit line (subdivided) or 'XXXXXX00' (not subdivided).
    hs6 = dict(hs6_line8)
    hs6.update(hs6_line6)
    # 'XXXXXX00' is only an HS6 title when no other CN8 sits under that HS6.
    per_hs6 = Counter(c[:6] for c in cn8)
    for k in list(hs6_line8):
        if k not in hs6_line6 and per_hs6[k] > 1:
            del hs6[k]
    return {"hs4": hs4, "hs6": hs6, "cn8": cn8}
