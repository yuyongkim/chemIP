"""TCEQ 배출사건 오염물질 이름 매핑 보고서: reports/tceq_name_mapping_v1.md + .csv.

이름(고유값)마다 행 수·총 배출량(lbs)·상태·CAS·방법을 적고, 검토 이름표·정규화 규칙 적용 전(이름 색인 완전 일치만)과
후의 적용률(고유 이름 / 행)을 비교한다. 검토 이름표 aliases 의 name → CAS 가 출처에서 실제로 성립하는지도 다시 확인한다.

실행: python -B scripts/tceq_event_name_report.py   (원천 CSV 는 읽기만 한다)
"""
from __future__ import annotations

import csv
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import tceq_event_mapping as m  # noqa: E402

ENV = Path(r"C:\Users\USER\Desktop\Environment\Environment_1\data\processed")
EVENTS_CSV = ENV / "track_11_events" / "contaminants.csv"
EER_CSV = ENV / "p1p" / "cache" / "eer_point_contaminants.csv"
PUBCHEM_CACHE = Path(r"E:\dev-cache\pubchem")
OUT_DIR = m.ROOT / "reports"
OUT_STEM = "tceq_name_mapping_v1"
TOP_UNMAPPED = 60


def _f(x: str) -> float:
    try:
        return float(x)
    except (TypeError, ValueError):
        return 0.0


def load_counts() -> tuple[dict[str, dict], int, int]:
    """이름 → {rows, lbs, eer_rows}. lbs 는 unit=POUNDS 행만 더한다(% OPACITY·LBS/HR 은 양이 아님)."""
    stats: dict[str, dict] = defaultdict(lambda: {"rows": 0, "lbs": 0.0, "eer_rows": 0})
    n_events = n_eer = 0
    with open(EVENTS_CSV, encoding="utf-8", errors="replace", newline="") as fh:
        for r in csv.DictReader(fh):
            s = stats[r["name"]]
            s["rows"] += 1
            n_events += 1
            if (r.get("unit") or "").strip().upper() == "POUNDS":
                s["lbs"] += _f(r.get("qty"))
    if EER_CSV.exists():
        with open(EER_CSV, encoding="utf-8", errors="replace", newline="") as fh:
            for r in csv.DictReader(fh):
                stats[r["contaminant"]]["eer_rows"] += 1
                n_eer += 1
    stats.pop("", None)
    return dict(stats), n_events, n_eer


def verify_aliases() -> list[str]:
    """aliases 의 name → cas 가 출처에서 성립하는지. 실패한 항목 설명 목록."""
    t = m._tables()
    bad: list[str] = []
    for raw, v in m._entries(t.cfg["aliases"]):
        cas, name, src = v.get("cas", ""), v.get("name", ""), v.get("source", "")
        if not (cas and name and src):
            bad.append(f"{raw}: cas/name/source 누락")
            continue
        if src.startswith("PubChem CID"):
            cid = int(src.split()[2])
            f = PUBCHEM_CACHE / "tceq_name" / f"cid_{cid}.json"
            f2 = PUBCHEM_CACHE / f"{cas}.json"
            ok = False
            for path in (f, f2):
                if path.exists():
                    d = json.loads(path.read_text(encoding="utf-8"))
                    syns = {s.casefold() for s in d.get("synonyms", [])} | {str(d.get(x, "")).casefold() for x in ("title", "formula")}
                    ok = ok or (int(d.get("cid", 0)) == cid and cas.casefold() in syns and name.casefold() in syns)
            if not ok:
                bad.append(f"{raw}: PubChem 캐시에서 CID {cid} ↔ {cas} ↔ '{name}' 확인 안 됨")
            continue
        k = m.lookup_key(m.base_key(name))
        if cas not in t.registry.get(k, set()) | t.synonym.get(k, set()):
            bad.append(f"{raw}: 색인에서 '{name}' → {cas} 확인 안 됨")
    known = _known_cas(t)
    for raw, v in m._entries(t.cfg.get("ambiguous", {})):
        for cas in v.get("candidates", []):
            if cas not in known:
                bad.append(f"ambiguous {raw}: 후보 {cas} 가 색인·PubChem 캐시에 없음")
    return bad


def _known_cas(t) -> set[str]:
    """색인(registry·synonym)과 PubChem 캐시(CAS 파일 이름, tceq_name 의 cas_in_synonyms)에 나오는 CAS."""
    known = {c for idx in (t.registry, t.synonym) for cs in idx.values() for c in cs}
    known |= {p.stem for p in PUBCHEM_CACHE.glob("*.json")}
    for p in (PUBCHEM_CACHE / "tceq_name").glob("cid_*.json"):
        known |= set(json.loads(p.read_text(encoding="utf-8")).get("cas_in_synonyms", []))
    return known


def coverage(rows: list[dict], col: str) -> dict[str, tuple[int, int]]:
    out: dict[str, list[int]] = {s: [0, 0] for s in m.STATUSES}
    for r in rows:
        out[r[col]][0] += 1
        out[r[col]][1] += r["rows"]
    return {k: (v[0], v[1]) for k, v in out.items()}


def main() -> None:
    stats, n_events, n_eer = load_counts()
    rows = []
    for name, s in stats.items():
        r, p = m.resolve(name), m.resolve_plain(name)
        rows.append({"name": name, "rows": s["rows"], "eer_rows": s["eer_rows"], "lbs": round(s["lbs"], 3),
                     "status": r.status, "cas": r.cas, "group": r.group, "method": r.method, "key": r.key,
                     "candidates": ";".join(m.candidates(name)) if r.status == "ambiguous" else "",
                     "plain_status": p.status, "plain_cas": p.cas})
    rows.sort(key=lambda x: (-x["rows"], x["name"]))
    OUT_DIR.mkdir(exist_ok=True)
    cols = ["name", "rows", "eer_rows", "lbs", "status", "cas", "group", "method", "key", "candidates", "plain_status", "plain_cas"]
    with open(OUT_DIR / f"{OUT_STEM}.csv", "w", encoding="utf-8-sig", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=cols)
        w.writeheader()
        w.writerows(rows)

    n_names, n_rows = len(rows), sum(r["rows"] for r in rows)
    before, after = coverage(rows, "plain_status"), coverage(rows, "status")
    methods = Counter(r["method"].split("+")[0] for r in rows if r["status"] in ("cas", "group"))
    groups = Counter()
    for r in rows:
        if r["status"] == "group":
            groups[r["group"]] += r["rows"]
    bad = verify_aliases()
    changed = [r for r in rows if r["plain_status"] == "cas" and r["status"] == "cas" and r["plain_cas"] != r["cas"]]
    demoted = [r for r in rows if r["plain_status"] == "cas" and r["status"] != "cas"]   # 기준선에서 CAS 였으나 검토 후 group/ambiguous

    def pct(a: int, b: int) -> str:
        return f"{100 * a / b:.1f}%" if b else "-"

    L = [f"# TCEQ 배출사건 오염물질 이름 → CAS 매핑 v1", "",
         f"- 원천: `{EVENTS_CSV}` ({n_events:,}행) · `{EER_CSV.name}` ({n_eer:,}행, 같은 이름 체계; 행 수 열 `eer_rows`)",
         f"- 고유 이름 {n_names:,}개 (두 파일 합집합) · 행 수·배출량은 contaminants.csv 기준 · lbs 는 unit=POUNDS 행만 합산",
         f"- 매핑: `scripts/tceq_event_mapping.py` + 검토 이름표 `scripts/tceq_event_names.json` (reviewed_on {m._tables().cfg['reviewed_on']})",
         "- 기준선(전): 검토 이름표·정규화 규칙 없이 이름 색인(registry → synonym 층) 완전 일치만", "",
         "## 적용률", "", "| 상태 | 고유 이름(전) | 고유 이름(후) | 행(전) | 행(후) |", "|---|---:|---:|---:|---:|"]
    for s in m.STATUSES:
        b, a = before[s], after[s]
        L.append(f"| {s} | {b[0]:,} ({pct(b[0], n_names)}) | {a[0]:,} ({pct(a[0], n_names)}) | {b[1]:,} ({pct(b[1], n_rows)}) | {a[1]:,} ({pct(a[1], n_rows)}) |")
    rb = before["cas"][1] + before["group"][1]
    ra = after["cas"][1] + after["group"][1]
    nb = before["cas"][0] + before["group"][0]
    na = after["cas"][0] + after["group"][0]
    L += ["", f"- 해결(cas + group): 고유 이름 {nb:,} → {na:,} ({pct(na, n_names)}), 행 {rb:,} → {ra:,} ({pct(ra, n_rows)})",
          f"- 방법별(해결된 고유 이름): " + ", ".join(f"{k} {v}" for k, v in methods.most_common()),
          f"- 기준선과 CAS 가 달라진 이름: {len(changed)}개" + ("" if not changed else " — " + ", ".join(f"{r['name']} {r['plain_cas']}→{r['cas']}" for r in changed)),
          f"- 기준선에서 CAS 였으나 검토 후 CAS 를 거둔 이름: {len(demoted)}개" + ("" if not demoted else " — " + ", ".join(f"{r['name']}({r['plain_cas']} → {r['status']} {r['group']})".replace(" )", ")") for r in demoted)),
          f"- aliases 출처 재확인 실패: {len(bad)}건" + ("" if not bad else "\n" + "\n".join(f"  - {b}" for b in bad)), "",
          "## 물질군(행 수)", "", "| group | 이름 | 행 |", "|---|---|---:|"]
    for g, c in groups.most_common():
        L.append(f"| {g} | {m.GROUPS[g]['ko']} / {m.GROUPS[g]['en']} | {c:,} |")
    L += ["", "## ambiguous (행 수 순)", "", "| 이름 | 행 | 후보 CAS | 방법 |", "|---|---:|---|---|"]
    for r in [r for r in rows if r["status"] == "ambiguous"]:
        L.append(f"| {r['name']} | {r['rows']:,} | {r['candidates']} | {r['method']} |")
    unm = [r for r in rows if r["status"] == "unmapped"]
    L += ["", f"## 남은 unmapped 상위 {TOP_UNMAPPED} (행 수 순, 전체 {len(unm)}개 · {sum(r['rows'] for r in unm):,}행)", "",
          "| 이름 | 행 | lbs |", "|---|---:|---:|"]
    for r in unm[:TOP_UNMAPPED]:
        L.append(f"| {r['name']} | {r['rows']:,} | {r['lbs']:,.1f} |")
    L += ["", f"전체 표: `reports/{OUT_STEM}.csv`", ""]
    (OUT_DIR / f"{OUT_STEM}.md").write_text("\n".join(L), encoding="utf-8")
    print(f"names {n_names} rows {n_rows} | resolved names {nb}->{na} rows {rb}->{ra} | unmapped {len(unm)} | alias check fails {len(bad)}")


if __name__ == "__main__":
    main()
