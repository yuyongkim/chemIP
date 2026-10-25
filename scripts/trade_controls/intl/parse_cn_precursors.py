"""China 易制毒化学品 (precursor chemicals), categories 第一类/第二类/第三类.

1. Base: 《易制毒化学品管理条例》附表 parsed from the regulation text (.doc).
2. Additions: transcribed in sources/cn_precursors.json; each name and printed CAS is checked against the raw
   text of its announcement; every item is checked against MOFCOM's 2026 licence catalogue.
3. CAS: printed in the announcement (law_cas) > exact 品名/别名 in 危险化学品目录 (cn_hazchem_name)
   > INCB Red List via incb_alias (incb_name). Otherwise family entry without CAS.
"""
from __future__ import annotations

import html
import json
import re
from pathlib import Path

from intl_common import clean, entry, fetch, file_info, split_entries
from parse_cn_hazchem import _word_text, read_catalog

PROJECT = Path(__file__).resolve().parents[3]
NUM = "一二三"


def norm(text: str) -> str:
    table = str.maketrans({"－": "-", "，": ",", "（": "(", "）": ")", "［": "[", "］": "]", "—": "-", "―": "-"})
    return re.sub(r"\s+", "", str(text or "")).translate(table)


def parse_annex(doc_text: str) -> list[dict]:
    """附表 items: {category, no, name} in order."""
    start = doc_text.find("易制毒化学品的分类和品种目录", doc_text.find("附表："))
    end = doc_text.find("说明：", start)
    rows, cat = [], ""
    for part in re.split(r"[\x0b\r]", doc_text[start:end]):
        part = clean(part.replace("　", " "))
        if re.fullmatch(r"第[一二三]类", part):
            cat = part
            continue
        m = re.match(r"(\d+)．(.+)", part)
        if cat and m:
            rows.append({"category": cat, "no": int(m.group(1)), "name": m.group(2).strip()})
    return rows


def _pdf_text(path: Path) -> str:
    import pdfplumber  # S: venv only

    with pdfplumber.open(str(path)) as pdf:
        return "\n".join(page.extract_text() or "" for page in pdf.pages)


def _html_text(path: Path) -> str:
    return html.unescape(re.sub(r"<[^>]+>", " ", path.read_text(encoding="utf-8", errors="replace")))


def _mofcom_pdf(spec: dict, raw_dir: Path, offline: bool) -> tuple[Path, list[dict]]:
    d = spec["downloads"]["mofcom_2026"]
    page = fetch(d["url"], raw_dir / d["page_file"], offline)
    link = re.search(r'href="(/api-gateway/[^"]+\.pdf)"', page.read_text(encoding="utf-8", errors="replace"))
    if not link and not offline:
        raise ValueError("MOFCOM catalogue PDF link not found")
    pdf_url = "https://www.mofcom.gov.cn" + html.unescape(link.group(1)) if link else d["url"]
    pdf = fetch(pdf_url, raw_dir / d["file"], offline)
    return pdf, [file_info(page, d["url"]), file_info(pdf, pdf_url)]


def _hazchem_index(path: Path) -> dict[str, list[tuple[int, str, list[str]]]]:
    idx: dict[str, list] = {}
    for pos, r in enumerate(read_catalog(path), start=1):
        for n in [r["name"], *(a.strip() for a in re.split(r"[；;]", r["alias"]) if a.strip())]:
            idx.setdefault(norm(n), []).append((pos, r["name"], r["cas_all"]))
    return idx


def _resolve(names: list[str], printed: str, hazchem: dict, alias: dict, incb_cas: dict) -> tuple[str, str, str]:
    """(cas, match_method, basis)."""
    if printed:
        return printed, "law_cas", "CAS printed in the announcement"
    for n in names:
        hits = hazchem.get(norm(n), [])
        cas_sets = {tuple(h[2]) for h in hits if h[2]}
        if len(cas_sets) == 1 and len(next(iter(cas_sets))) == 1:
            pos, hname, cas = hits[0]
            return cas[0], "cn_hazchem_name", f"危险化学品目录(2015) 序号 {pos} '{hname}' (品名/别名 '{n}')"
    for n in names:
        if norm(n) in alias:
            incb_name, why = alias[norm(n)]
            if incb_name in incb_cas:
                return incb_cas[incb_name], "incb_name", f"INCB Red List '{incb_name}' ({why})"
    return "", "no_cas", ""


def collect(spec: dict, raw_dir: Path, offline: bool) -> dict:
    d = spec["downloads"]
    files, problems, notes = [], [], []

    def get(key: str) -> Path:
        p = fetch(d[key]["url"], raw_dir / d[key]["file"], offline)
        files.append(file_info(p, d[key]["url"]))
        return p

    reg = get("regulation_2018")
    texts = {"ann_2021": norm(_pdf_text(get("ann_2021"))), "ann_2024": norm(_html_text(get("ann_2024"))),
             "ann_2025": norm(_word_text(get("ann_2025")))}
    mof_pdf, mof_files = _mofcom_pdf(spec, raw_dir, offline)
    files.extend(mof_files)
    texts["mofcom_2026"] = norm(_pdf_text(mof_pdf))
    hazchem = _hazchem_index(get("hazchem_catalog"))
    incb = json.loads((PROJECT / spec["incb_source"]).read_text(encoding="utf-8"))
    incb_cas = {e["name"]: e["cas"] for e in incb["entries"] if e.get("cas_source") == "INCB Red List" and e.get("cas")}
    alias = {norm(k): v for k, v in spec["incb_alias"].items() if not k.startswith("_")}
    synonyms = {k: v for k, v in spec["base_synonyms"].items() if not k.startswith("_")}

    base = parse_annex(_word_text(reg))
    for cat, n in spec["base_expected"].items():
        got = [r["no"] for r in base if r["category"] == cat]
        if got != list(range(1, n + 1)):
            problems.append(f"附表 {cat}: parsed numbers {got}, expected 1..{n}")

    rows, counts, methods = [], {}, {}

    def add(name: str, names: list[str], printed: str, cat: str, detail: str) -> None:
        cas, method, basis = _resolve(names, printed, hazchem, alias, incb_cas)
        methods[method] = methods.get(method, 0) + 1
        rows.append(entry("", name, detail, cas_all=[cas] if cas else [], category=cat, match_method=method, cas_source=basis))

    members = {k: v for k, v in spec["base_members"].items() if not k.startswith("_")}
    for r in base:
        counts[r["category"]] = counts.get(r["category"], 0) + 1
        drug = r["name"].endswith("*")
        name = r["name"].rstrip("*").replace("，", ",")
        detail = f"附表 {r['category']} {r['no']}" + ("; 药品类易制毒化学品(*)" if drug else "")
        group = members.get(f"{r['category']} {r['no']}")
        if group:
            for m in group:
                add(m, [m], "", r["category"], f"{detail}; 麻黄素类物质: {name}")
        else:
            add(name, [name, *synonyms.get(name, [])], "", r["category"], detail)

    for a in spec["additions"]:
        counts[a["category"]] = counts.get(a["category"], 0) + 1
        text = texts[a["ann"]]
        if norm(a.get("check_name") or a["name"]) not in text:
            problems.append(f"{a['year']} '{a['name']}' not found in {a['ann']} text")
        if a["cas"] and norm(a["cas"]) not in text:
            problems.append(f"{a['year']} '{a['name']}' CAS {a['cas']} not found in {a['ann']} text")
        if a["ann"] != "mofcom_2026" and norm(a.get("check_name") or a["name"]) not in texts["mofcom_2026"]:
            notes.append(f"'{a['name']}' 는 상무부 2026 목록 본문에서 같은 표기로 찾지 못함(줄바꿈·표기 차이 가능)")
        detail = f"{a['category']} ({a['year']} 증보)"
        if a.get("category_basis"):
            detail += f"; {a['category_basis']}"
        if a.get("family_note"):
            detail += f"; {a['family_note']}"
        add(a["name"], [a["name"], *a["synonyms"]], a["cas"], a["category"], detail)
        if a.get("family_note") and a["cas"]:
            rows.append(entry("", a["name"] + " (酯类)", detail, category=a["category"], match_method="no_cas"))

    expected = spec["expected_total"]
    for cat, n in expected.items():
        if counts.get(cat) != n:
            problems.append(f"{cat}: {counts.get(cat)} items, expected {n}")
    entries, families, bad = split_entries(rows)
    if bad:
        problems.append(f"invalid CAS: {bad}")
    notes.append(f"items per category: {counts}; CAS match_method counts: {methods}")
    notes.append("no CAS: " + ", ".join(f["name"] for f in families))
    notes.append("条例 附表 说明: 第一类·第二类所列物质可能存在的盐类也纳入管制; *표 = 第一类 药品类易制毒化学品(原料药及其单方制剂).")
    return {"precursors": {
        "entries": entries, "family_entries": families, "problems": problems,
        "official_count": sum(expected.values()),
        "official_count_basis": "附表 23 + 증보 2008(1)·2012(1)·2014(2)·2017(5)·2021(6)·2024(7)·2025(2) = 第一类19·第二类20·第三类8",
        "counted": sum(counts.values()),
        "source_version": "易制毒化学品管理条例 附表(2018 修订) + 2025-07-20 시행 증보까지; 상무부 2026년도 两用物项 목록 대조",
        "notes": notes, "files": files,
    }}
