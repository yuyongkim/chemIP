"""Taiwan 毒性及關注化學物質管理法 (Toxic and Concerned Chemical Substances Control Act, MOENV).

- 公告毒性化學物質及其毒性分類: MOENV open data toxic_p_23 (列管編號 toxic_no-no, 中英文名, CAS reg_no,
  管制濃度 qty_lower, 分級運作量 altqty, 毒性分類 class '1,3', 公告日 a_date in ROC years).
  Each row may hold several CAS ('72-43-5,30667-99-3,...'); every valid one becomes an entry.
  toxic_p_02 (禁止運作事項) and toxic_p_01 (許可用途) are joined on 列管編號 into the detail.
- 公告關注化學物質及其關注分類: open data txmg_p_76 (listed_no., names, cas_no., 管制濃度, 分級運作量, state).
- 新化學物質及既有化學物質資料登錄辦法 附表九: 指定應完成既有化學物質標準登錄之名單 (PDF, 期別/序號/CAS/英文/中文).
The open-data API key is the public key printed in the data.gov.tw dataset distribution URLs.
"""
from __future__ import annotations

import json
import os
import re
from pathlib import Path

from intl_common import cas_tokens, clean, entry, fetch, file_info, split_entries

CLASS = {"1": "第一類(難分解)", "2": "第二類(慢毒性)", "3": "第三類(急毒性)", "4": "第四類(疑似毒化物)"}


def roc_date(v: str) -> str:
    v = (v or "").strip()
    if not re.fullmatch(r"\d{6,7}", v):
        return v
    y, m, d = int(v[:-4]) + 1911, v[-4:-2], v[-2:]
    return f"{y}-{m}-{d}"


def _json(path: Path) -> list[dict]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise ValueError(f"{path.name}: expected a JSON list")
    return data


def toxic(rows: list[dict], prohibit: dict, uses: dict) -> list[dict]:
    out = []
    for r in rows:
        no = f"{r['toxic_no']}-{r['no']}"
        classes = [CLASS.get(c.strip(), c.strip()) for c in (r.get("class") or "").split(",") if c.strip()]
        parts = [f"列管編號 {no}", "毒性分類 " + "·".join(classes),
                 f"管制濃度 {r.get('qty_lower')} %(w/w)" if r.get("qty_lower") else "",
                 f"分級運作量 {r.get('altqty')} kg" if r.get("altqty") else "",
                 f"公告/生效 {roc_date(r.get('a_date', ''))}" if r.get("a_date") else ""]
        if no in prohibit:
            parts.append(f"禁止運作事項: {clean(prohibit[no])[:200]}")
        if no in uses:
            parts.append(f"許可用途: {clean(uses[no])[:200]}")
        name = clean(r.get("cname_u", ""))
        if r.get("ename"):
            name = f"{name} ({clean(r['ename'])[:160]})"
        out.append(entry("", name, "; ".join(p for p in parts if p), cas_all=cas_tokens(r.get("reg_no", "")),
                         match_method="official CAS", toxic_class=[c.strip() for c in (r.get("class") or "").split(",") if c.strip()]))
    return out


def concerned(rows: list[dict]) -> list[dict]:
    out = []
    for r in rows:
        parts = [f"列管編號 {r.get('listed_no.')}", f"關注性質 {r.get('state')}" if r.get("state") else "",
                 f"管制濃度 {r.get('control_concentration_standard')} %(w/w)" if r.get("control_concentration_standard") else "",
                 f"分級運作量 {r.get('classified_handling_quantity')} kg" if r.get("classified_handling_quantity") else "",
                 f"公告/生效 {roc_date(r.get('a_date', ''))}" if r.get("a_date") else ""]
        name = f"{clean(r.get('cname', ''))} ({clean(r.get('ename', ''))[:160]})"
        out.append(entry("", name, "; ".join(p for p in parts if p), cas_all=cas_tokens(r.get("cas_no.", "")),
                         match_method="official CAS"))
    return out


def pec_annex9(path: Path) -> tuple[list[dict], int, str]:
    import pdfplumber  # S: venv only

    rows, text = [], []
    with pdfplumber.open(str(path)) as pdf:
        for page in pdf.pages:
            text.append(page.extract_text() or "")
            for table in page.extract_tables():
                rows.extend([clean(re.sub(r"-\s*\n\s*", "-", c or "")) for c in r] for r in table)  # English names wrap after '-'
    out, nos = [], set()
    for r in rows:
        if len(r) < 5 or not r[1].isdigit():
            continue
        batch, no, cas, en, zh = r[:5]
        nos.add(int(no))
        out.append(entry("", f"{re.sub(r'(?<=[^\x00-\x7f]) (?=[^\x00-\x7f])', '', zh)} ({en})",
                         f"附表九 期別 {batch} 序號 {no}; 既有化學物質 標準登錄 지정 물질", cas_all=cas_tokens(cas),
                         match_method="official CAS"))
    return out, len(nos), "\n".join(text)


def page_text(path: Path) -> str:
    raw = path.read_text(encoding="utf-8", errors="replace")
    raw = re.sub(r"(?s)<script.*?</script>|<style.*?</style>", " ", raw)
    return clean(re.sub(r"<[^>]+>", " ", raw).replace("&nbsp;", " "))


def page_number(path: Path, pattern: str) -> int | None:
    m = re.search(pattern, page_text(path))
    return int(m.group(1)) if m else None


def amended(path: Path) -> str:
    m = re.search(r"修正日期：\s*民國\s*(\d+)\s*年\s*(\d+)\s*月\s*(\d+)\s*日", page_text(path))
    return f"{int(m.group(1)) + 1911}-{m.group(2)}-{m.group(3)}" if m else ""


TW_KEY_ENV = "TW_MOENV_API_KEY"


def collect(spec: dict, raw_dir: Path, offline: bool) -> dict:
    d = spec["downloads"]
    # 대만 환경부 개방데이터 api_key 는 저장소에 두지 않는다(환경변수 TW_MOENV_API_KEY). 기록에는 키를 뺀 주소를 남긴다.
    key = os.getenv(TW_KEY_ENV, "")
    if not offline and any("{api_key}" in v["url"] for v in d.values()) and not key:
        raise RuntimeError(f"{TW_KEY_ENV} 가 없습니다. data.moenv.gov.tw 에서 받은 api_key 를 환경변수로 지정하십시오(--offline 은 키 불필요).")
    paths = {k: fetch(v["url"].replace("{api_key}", key), raw_dir / v["file"], offline) for k, v in d.items()}
    files = {k: file_info(p, d[k]["url"].replace("api_key={api_key}&", "")) for k, p in paths.items()}
    out = {}

    tox = _json(paths["toxic_list"])
    prohibit = {r["listedno"]: r.get("prohibit_operation", "") for r in _json(paths["toxic_prohibited"])}
    uses = {r["listedno"]: r.get("use_goal", "") for r in _json(paths["toxic_uses"])}
    entries, families, bad = split_entries(toxic(tox, prohibit, uses))
    cha_total = page_number(paths["cha_toxic_intro"], r"列管物質達\s*(\d+)\s*種")
    out["toxic"] = {
        "entries": entries, "family_entries": families, "problems": [f"invalid CAS in source: {bad}"] if bad else [],
        "official_count": None,
        "official_count_basis": f"化學物質管理署 毒性化學物質簡介: '已公告列管物質達{cha_total}種' — 산정 기준(물질·CAS·列管編號)이 공표되지 않아 행 수와 직접 비교하지 않음",
        "counted": len(tox),
        "source_version": f"環境部 開放資料 toxic_p_23 公告毒性化學物質及其毒性分類 ({len(tox)}행, 列管編號 {len({r['toxic_no'] for r in tox})}개, 최신 公告·生效 {max(roc_date(r.get('a_date', '')) for r in tox)})",
        "notes": [f"禁止運作事項 {len(prohibit)}건(toxic_p_02)·許可用途 {len(uses)}건(toxic_p_01)을 列管編號로 붙임",
                  f"행 {len(tox)}개에 CAS {sum(len(cas_tokens(r.get('reg_no', ''))) for r in tox)}개(중복 제외 {len({c for r in tox for c in cas_tokens(r.get('reg_no', ''))})}개)"],
        "files": [files["toxic_list"], files["toxic_prohibited"], files["toxic_uses"], files["cha_toxic_intro"]],
    }

    con = _json(paths["concerned_list"])
    entries, families, bad = split_entries(concerned(con))
    out["concerned"] = {
        "entries": entries, "family_entries": families, "problems": [f"invalid CAS in source: {bad}"] if bad else [],
        "official_count": page_number(paths["cha_concerned_intro"], r"現已公告列管\s*(\d+)\s*種"),
        "official_count_basis": "化學物質管理署 關注化學物質簡介 페이지 '現已公告列管N種'",
        "counted": len(con),
        "source_version": f"環境部 開放資料 txmg_p_76 公告關注化學物質及其關注分類 ({len(con)}행)",
        "notes": [], "files": [files["concerned_list"], files["cha_concerned_intro"]],
    }

    rows, n, text = pec_annex9(paths["pec_annex9"])
    entries, families, bad = split_entries(rows)
    problems = [f"invalid CAS in source: {bad}"] if bad else []
    missing = sorted(set(cas_tokens(text)) - {e["cas"] for e in entries})
    if missing:
        problems.append(f"CAS printed in the PDF but not parsed: {missing}")
    out["pec"] = {
        "entries": entries, "family_entries": families, "problems": problems,
        "official_count": 106, "official_count_basis": "附表九 序號 1–106", "counted": n,
        "source_version": f"新化學物質及既有化學物質資料登錄辦法 附表九 (修正 {amended(paths['pec_regulation'])})",
        "notes": [], "files": [files["pec_annex9"], files["pec_regulation"]],
    }
    return out
