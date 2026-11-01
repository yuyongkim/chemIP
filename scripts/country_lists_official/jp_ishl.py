"""Japan 労働安全衛生法 (ISHL) lists.

  JP_ISHL_LABEL_SDS  名称等を表示・通知すべき危険物及び有害物 (label / SDS duty; 令別表第3第1号, 令別表第9, 則別表第2).
                     MHLW 職場のあんぜんサイト Excel: sheet 「R7.4.1施行」 (whole list from 2025-04-01) and
                     「R8.4.1施行」 (substances added 2026-04-01). CAS = MHLW reference CAS (not part of the law).
  JP_ISHL_TOKKA      特定化学物質 第1類・第2類・第3類 (令別表第三, 特化則)
  JP_ISHL_ORGANIC    有機溶剤 (令別表第六の二, 有機則)
The last two come from the law text (e-Gov 法令API XML), which has names only. A name reaches a CAS only when it
equals a name in the MHLW label/SDS list after orthographic normalization (NFKC, small kana -> large kana as in
old statute spelling 「フエノール」, dash variants, spaces) — the CAS is then MHLW's reference CAS for that name.
"…を含有する製剤その他の物" items (mixtures) are not substances and are skipped. Every detail says "match: …".
"""
from __future__ import annotations

import re
import unicodedata
import xml.etree.ElementTree as ET

from country_lists.base import CAS_RE, Row, cas_valid
from xlsx_rows import read_sheets

LABEL = "JP_ISHL_LABEL_SDS"
TOKKA = "JP_ISHL_TOKKA"
ORGANIC = "JP_ISHL_ORGANIC"
OWNED = (LABEL, TOKKA, ORGANIC)
SHEETS = {"R7.4.1施行": "2025-04-01 施行", "R8.4.1施行": "2026-04-01 追加"}
SMALL = str.maketrans("ァィゥェォッャュョヮヵヶぁぃぅぇぉっゃゅょゎ", "アイウエオツヤユヨワカケあいうえおつやゆよわ")
OLD_KANJI = {"弗": "フッ", "沃": "ヨウ", "砒": "ヒ", "燐": "リン", "硼": "ホウ"}  # statute spelling -> 常用 spelling
KANJI_DIGITS = str.maketrans("〇一二三四五六七八九", "0123456789")  # both sides, so 「三酸化二アンチモン」 still equals itself
DASHES = re.compile(r"[‐‑‒–—―−－ｰ\-]")
MIXTURE = re.compile(r"含有する製剤その他の物|削除")
_PAREN = re.compile(r"（[^（）]*）|\([^()]*\)")


def name_key(name: str) -> str:
    s = unicodedata.normalize("NFKC", name or "").translate(SMALL).translate(KANJI_DIGITS)
    for old, new in OLD_KANJI.items():
        s = s.replace(old, new.translate(SMALL))
    s = DASHES.sub("-", s)
    s = re.sub(r"(?<=\d)・(?=\d)", ",", s)  # statute 「一・四―ジオキサン」 = 1,4-ジオキサン
    s = s.replace("′", "’").replace("'", "’")
    return re.sub(r"[\s　]", "", s)


def name_keys(name: str) -> set[str]:
    """The name, and the name without bracketed parts (別名 / 限定) — both normalized."""
    keys = {name_key(name)}
    bare = _PAREN.sub("", unicodedata.normalize("NFKC", name or ""))
    if bare.strip():
        keys.add(name_key(bare))
    return {k for k in keys if k}


def _section(cell: str) -> str:
    c = unicodedata.normalize("NFKC", cell)
    if "別表第3第1号" in c or "別表第３第１号" in cell:
        return "令別表第3第1号"
    if "別表第9" in c:
        return "令別表第9"
    if "規則別表第2" in c:
        return "則別表第2"
    return ""


def parse_label_list(data: bytes, source: str) -> tuple[list[Row], dict, dict[str, list[str]]]:
    """-> (rows, stats, {name key: [CAS]}) — the last one is used to match the statute names."""
    rows, by_name, items, no_cas = [], {}, 0, 0
    for sheet_name, rows_in in read_sheets(data).items():
        when = SHEETS.get(sheet_name)
        if not when:
            continue
        section = ""
        for r in rows_in:
            r = (r + [""] * 8)[:8]
            sec = _section(r[0]) if r[0] and not r[0].strip().isdigit() else ""
            if sec:
                section = sec
                continue
            if not (r[0].strip().isdigit() and r[2].strip()):
                continue
            items += 1
            no, name, name_en, cas_text, label_cut, sds_cut, note = (x.strip() for x in r[1:8])
            cases = [m.group(0) for m in CAS_RE.finditer(cas_text) if cas_valid(m.group(0))]
            for key in name_keys(name):
                by_name.setdefault(key, []).extend(c for c in cases if c not in by_name.get(key, []))
            if not cases:
                no_cas += 1
                continue
            more = "他" in cas_text
            detail = (f"{section} {no}: {name}" + (f" ({name_en})" if name_en else "")
                      + f" | 裾切値 ラベル {label_cut} % / SDS {sds_cut} % | {when}"
                      + (f" | 備考 {note}" if note else "")
                      + f" | match: MHLW reference CAS{' (representative; others exist)' if more else ''}")
            for cas in cases:
                rows.append(Row(cas, LABEL, detail, source, name))
    return rows, {"items": items, "items_without_cas": no_cas, "rows": len(rows),
                  "cas": len({r.cas_no for r in rows})}, by_name


def _text(node) -> str:
    """Element text without ruby readings (<Rt>): 「砒<Rt>ひ</Rt>素」 -> 砒素."""
    if node is None:
        return ""
    parts = [node.text or ""]
    for child in node:
        if child.tag != "Rt":
            parts.append(_text(child))
        parts.append(child.tail or "")
    return "".join(parts).strip()


def statute_items(xml: bytes) -> dict[str, list[tuple[str, str, str]]]:
    """e-Gov 施行令 XML -> {"tokka": [(class, number, name)], "organic": [("", number, name)]}."""
    root = ET.fromstring(xml)
    out = {"tokka": [], "organic": []}
    for table in root.iter("AppdxTable"):
        title = _text(table.find("AppdxTableTitle"))
        if title == "別表第三":
            for item in table.findall("Item"):
                cls = _text(item.find("ItemSentence"))
                for sub in item.findall("Subitem1"):
                    out["tokka"].append((cls, _text(sub.find("Subitem1Title")), _text(sub.find("Subitem1Sentence"))))
        elif title == "別表第六の二":
            for item in table.findall("Item"):
                out["organic"].append(("", _text(item.find("ItemTitle")), _text(item.find("ItemSentence"))))
    return out


def statute_rows(xml: bytes, by_name: dict[str, list[str]], source_tokka: str, source_org: str):
    rows, stats = [], {}
    for kind, code, src, label in (("tokka", TOKKA, source_tokka, "令別表第三"), ("organic", ORGANIC, source_org, "令別表第六の二")):
        listed = [x for x in statute_items(xml)[kind] if not MIXTURE.search(x[2])]
        matched = 0
        for cls, no, name in listed:
            cas_list = next((by_name[k] for k in name_keys(name) if by_name.get(k)), [])
            if not cas_list:
                continue
            matched += 1
            head = f"{label} {cls + ' ' if cls else ''}{no}: {name}"
            for cas in cas_list:
                rows.append(Row(cas, code, f"{head} | match: name = MHLW label/SDS list (normalized), its reference CAS",
                                source_org if kind == "organic" else src, name))
        stats[code] = {"items": len(listed), "items_matched": matched,
                       "unmatched": [n for c, no, n in listed if not any(by_name.get(k) for k in name_keys(n))],
                       "rows": sum(1 for r in rows if r.regulation == code)}
    return rows, stats
