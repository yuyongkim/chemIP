"""Environment 프로젝트의 한국 대기 인허가 가공본에서 물질(CAS)·물질군별 '실제 통합허가 사례' 요약 DB 를 만든다.

원본(읽기만 한다): Desktop/Environment/Environment_1/data/processed/intl/kr/
  kr_permit_limits.csv (배출구 × 물질 허가배출기준), kr_permits.csv · ieps_posts.csv (업종·사업장·허가일),
  kr_duration_summary.csv (처리기간 요약), cleansys_annual.csv (TMS 연간 배출량)
이름 → CAS 는 scripts/kr_permit_context_mapping.py (검토 이름표 scripts/kr_permit_context_names.json).
결과: data/kr_permit_context.db — 매번 새로 만든다.

    python scripts/build_kr_permit_context.py
"""
from __future__ import annotations

import csv
import json
import sqlite3
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parent))
from backend.integrations.sources import ENV_KR_PROCESSED_DIR, IEPS_POST_URL, KR_PERMIT_CONTEXT_DB  # noqa: E402
from kr_permit_context_mapping import NameResolver  # noqa: E402

SAMPLES_PER_ENTITY = 8
DURATION_GROUPINGS = ("post_type", "post_type+industry", "post_type+pre_consult", "post_type+permit_year")
DURATION_METRIC = "days_start_to_permit"

SCHEMA = """
CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE name_map (substance_raw TEXT PRIMARY KEY, n_rows INTEGER, status TEXT, cas TEXT, group_key TEXT,
                       method TEXT, name_key TEXT, qualifier TEXT);
CREATE TABLE groups (group_key TEXT PRIMARY KEY, parent_cas TEXT, related_cas TEXT, expressed_as TEXT, basis TEXT);
CREATE TABLE cas_links (cas TEXT, entity TEXT, relation TEXT, PRIMARY KEY (cas, entity));
CREATE TABLE entity_summary (entity TEXT PRIMARY KEY, kind TEXT, label TEXT, n_sites INTEGER, n_posts INTEGER,
                             n_outlets INTEGER, n_rows INTEGER, first_year TEXT, latest_year TEXT,
                             primary_unit TEXT, primary_o2 TEXT, names_seen TEXT);
CREATE TABLE limit_stats (entity TEXT, unit TEXT, o2_ref TEXT, n_rows INTEGER, n_sites INTEGER, n_outlets INTEGER,
                          min REAL, p25 REAL, median REAL, p75 REAL, max REAL, PRIMARY KEY (entity, unit, o2_ref));
CREATE TABLE entity_industry (entity TEXT, industry TEXT, n_sites INTEGER, n_rows INTEGER, median REAL,
                              PRIMARY KEY (entity, industry));
CREATE TABLE entity_samples (entity TEXT, rank INTEGER, post_id TEXT, decision_no TEXT, site_name TEXT, industry TEXT,
                             post_type TEXT, permit_date TEXT, post_date TEXT, url TEXT, limits TEXT, PRIMARY KEY (entity, rank));
CREATE TABLE durations (post_type TEXT, grouping TEXT, industry TEXT, permit_year TEXT, pre_consult TEXT,
                        n INTEGER, median REAL, p25 REAL, p75 REAL, mean REAL);
CREATE TABLE emissions (entity TEXT, year TEXT, label TEXT, n_sites INTEGER, total_kg REAL, subtotal_kg REAL, PRIMARY KEY (entity, year));
"""


def read_csv(src: Path, name: str) -> list[dict[str, str]]:
    with open(src / name, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def num(v: str) -> float | None:
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def quantile(sorted_vals: list[float], q: float) -> float:
    pos = (len(sorted_vals) - 1) * q
    lo = int(pos)
    hi = min(lo + 1, len(sorted_vals) - 1)
    return sorted_vals[lo] + (sorted_vals[hi] - sorted_vals[lo]) * (pos - lo)


def fmt_o2(v: str) -> str:
    x = num(v)
    return "" if x is None else f"{x:g}"


# ── 게시물(허가) 정보 ──────────────────────────────

def post_index(permits: list[dict], posts: list[dict]) -> dict[str, dict]:
    """post_id → 업종·사업장·결정번호·허가일·유형. kr_permits 대표 문서 우선, 없으면 게시판 목록."""
    out: dict[str, dict] = {}
    for p in posts:
        out[p["post_id"]] = {"industry": p.get("board_industry") or p.get("title_industry") or "", "site_name": p.get("site_name", ""),
                             "decision_no": p.get("decision_no", ""), "permit_date": "", "post_date": p.get("post_date", ""),
                             "post_type": p.get("post_type", "")}
    for p in permits:
        if p.get("is_primary") != "True":
            continue
        cur = out.setdefault(p["post_id"], {})
        for k in ("industry", "site_name", "decision_no", "permit_date", "post_date", "post_type"):
            if p.get(k):
                cur[k] = p[k]
    return out


def site_key(decision_no: str, post_id: str) -> str:
    """사업장 = 결정번호 앞 4자리(Environment kr_linkage 와 같은 규칙). 결정번호가 없으면 게시물 단위."""
    d = (decision_no or "").strip()
    return d[:4] if len(d) >= 4 else f"post:{post_id}"


def permit_year(info: dict) -> str:
    """허가일 연도. 허가일을 읽지 못한 문서(대표 문서의 4%)는 연도 집계에서 뺀다(게시일은 허가일이 아니다)."""
    return (info.get("permit_date") or "")[:4]


# ── 배출기준 집계 ──────────────────────────────────

def classify_rows(limits: list[dict], resolver: NameResolver, posts: dict[str, dict]):
    names = Counter(r["substance"] for r in limits)
    resolved = {n: resolver.resolve(n) for n in names}
    rows = []
    dropped = Counter()
    for r in limits:
        res = resolved[r["substance"]]
        if res.status not in ("cas", "group"):
            continue
        unit = resolver.unit(r["unit"])
        value = num(r["permit_limit"])
        if not unit or value is None or value < 0:
            dropped["unit_unclear" if not unit else "value_missing"] += 1
            continue
        info = posts.get(r["post_id"], {})
        decision = r.get("decision_no") or info.get("decision_no", "")
        rows.append({
            "entity": f"cas:{res.cas}" if res.status == "cas" else f"group:{res.group}",
            "raw": r["substance"], "unit": unit, "o2": fmt_o2(r.get("o2_ref_pct", "")), "value": value,
            "post_id": r["post_id"], "decision_no": decision, "site": site_key(decision, r["post_id"]),
            "outlet": (r["post_id"], r.get("outlet", "")), "industry": info.get("industry", ""),
            "year": permit_year(info), "info": info,
        })
    return names, resolved, rows, dropped


def stats_block(vals: list[float]) -> tuple[float, float, float, float, float]:
    v = sorted(vals)
    return v[0], quantile(v, 0.25), quantile(v, 0.5), quantile(v, 0.75), v[-1]


def entity_tables(rows: list[dict], resolver: NameResolver):
    by_entity: dict[str, list[dict]] = defaultdict(list)
    for r in rows:
        by_entity[r["entity"]].append(r)
    summary, stats, industries, samples = [], [], [], []
    for ent, rs in by_entity.items():
        combos: dict[tuple[str, str], list[dict]] = defaultdict(list)
        for r in rs:
            combos[(r["unit"], r["o2"])].append(r)
        (p_unit, p_o2), _ = max(combos.items(), key=lambda kv: len(kv[1]))
        for (unit, o2), cr in combos.items():
            stats.append((ent, unit, o2, len(cr), len({r["site"] for r in cr}), len({r["outlet"] for r in cr}), *stats_block([r["value"] for r in cr])))
        years = sorted(y for y in {r["year"] for r in rs} if y)
        kind, label = ent.split(":", 1)
        if kind == "cas":
            label = resolver.cas_label(label) or Counter(r["raw"] for r in rs).most_common(1)[0][0]
        summary.append((ent, kind, label, len({r["site"] for r in rs}), len({r["post_id"] for r in rs}), len({r["outlet"] for r in rs}),
                        len(rs), years[0] if years else "", years[-1] if years else "", p_unit, p_o2,
                        json.dumps([n for n, _ in Counter(r["raw"] for r in rs).most_common(6)], ensure_ascii=False)))
        industries += industry_rows(ent, rs, p_unit, p_o2)
        samples += sample_rows(ent, rs)
    return summary, stats, industries, samples


def industry_rows(ent: str, rs: list[dict], unit: str, o2: str) -> list[tuple]:
    by_ind: dict[str, list[dict]] = defaultdict(list)
    for r in rs:
        by_ind[r["industry"] or "미상"].append(r)
    out = []
    for ind, ir in by_ind.items():
        vals = sorted(r["value"] for r in ir if r["unit"] == unit and r["o2"] == o2)
        out.append((ent, ind, len({r["site"] for r in ir}), len(ir), quantile(vals, 0.5) if vals else None))
    return out


def sample_rows(ent: str, rs: list[dict]) -> list[tuple]:
    by_post: dict[str, list[dict]] = defaultdict(list)
    for r in rs:
        by_post[r["post_id"]].append(r)
    ordered = sorted(by_post.items(), key=lambda kv: (kv[1][0]["info"].get("permit_date") or kv[1][0]["info"].get("post_date") or ""), reverse=True)
    out, seen_sites = [], set()
    for post_id, pr in ordered:
        site = pr[0]["site"]
        if site in seen_sites:
            continue
        seen_sites.add(site)
        info = pr[0]["info"]
        limits = sorted({(r["value"], r["unit"], r["o2"]) for r in pr})[:4]
        text = ", ".join(f"{v:g} {u}" + (f" (O2 {o}%)" if o else "") for v, u, o in limits)
        out.append((ent, len(out) + 1, post_id, pr[0]["decision_no"], info.get("site_name", ""), info.get("industry", ""),
                    info.get("post_type", ""), info.get("permit_date", ""), info.get("post_date", ""), IEPS_POST_URL.format(post_id=post_id), text))
        if len(out) >= SAMPLES_PER_ENTITY:
            break
    return out


# ── 물질군 · 처리기간 · 배출량 ───────────────────────

def group_tables(resolver: NameResolver, entities: set[str]):
    groups, links = [], []
    for g, v in resolver.groups.items():
        groups.append((g, v.get("parent_cas", ""), json.dumps(v.get("related_cas", [])), v.get("expressed_as", ""), v.get("basis", "")))
        ent = f"group:{g}"
        if v.get("parent_cas"):
            links.append((v["parent_cas"], ent, "family_parent"))
        links += [(c, ent, "related") for c in v.get("related_cas", [])]
    links += [(e.split(":", 1)[1], e, "direct") for e in entities if e.startswith("cas:")]
    return groups, links


def duration_rows(summary: list[dict]) -> list[tuple]:
    return [(r["post_type"], r["grouping"], r.get("industry", ""), r.get("permit_year", ""), r.get("pre_consult", ""),
             int(float(r["n"])), num(r["median"]), num(r["p25"]), num(r["p75"]), num(r["mean"]))
            for r in summary if r["metric"] == DURATION_METRIC and r["grouping"] in DURATION_GROUPINGS]


def emission_rows(annual: list[dict], columns: dict[str, dict]) -> list[tuple]:
    """연도 × 열 → 배출이 0 보다 큰 사업장 수와 합계(kg/년). '소계' 행은 따로 subtotal 로 남긴다."""
    cols = {c: v for c, v in columns.items() if not c.startswith("_")}
    sums: dict[tuple[str, str], float] = defaultdict(float)
    sites: dict[tuple[str, str], set] = defaultdict(set)
    subtotal: dict[tuple[str, str], float] = {}
    for r in annual:
        for col, spec in cols.items():
            v = num(r.get(col, ""))
            key = (col, r["examin_year"])
            if r.get("fact_code") == "0" or r.get("fact_manage_nm") == "소계":
                subtotal[key] = v or 0.0
            elif v and v > 0:
                sums[key] += v
                sites[key].add(r["fact_code"])
    keys = set(sums) | set(subtotal)
    return [(cols[c]["entity"], y, cols[c]["label"], len(sites[(c, y)]), round(sums[(c, y)], 1), subtotal.get((c, y)))
            for c, y in sorted(keys)]


# ── 쓰기 ──────────────────────────────────────────

def meta_rows(src: Path, counts: dict, coverage: dict, dropped: Counter) -> list[tuple]:
    meta = {
        "built_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source_dir": str(src),
        "source_readme": str(src / "README.md"),
        "retrieved": "2026-10-17~18 (Environment 프로젝트 수집, scripts/intl/kr/)",
        "source_ieps": "국립환경과학원 통합환경허가시스템(IEPS) 정보공개 게시판 — 배출시설등 설치·운영허가 검토결과서 PDF 1,315개(게시물 1,074건)에서 추출. https://ieps.nier.go.kr",
        "source_cleansys": "한국환경공단 CleanSYS 굴뚝자동측정(TMS) 연간 배출량(kg/년) 2015–2025, TMS 부착 굴뚝만이라 사업장 전체 배출량이 아님. https://www.cleansys.or.kr",
        "duration_note": "처리기간 = 본신청 접수일(없으면 신청일) → 허가일, 날짜 순서 검사를 통과한 건만. 사전협의 기간은 빠져 있다.",
        "limits_note": "허가배출기준은 검토결과서 표에서 읽은 값이다. 단위·표준산소농도(O2)가 다르면 섞지 않고 따로 집계한다. 단위를 확정할 수 없는 행은 뺐다.",
        "ieps_post_url": IEPS_POST_URL,
        "row_counts": counts, "mapping_coverage": coverage, "dropped_rows": dict(dropped),
    }
    return [(k, v if isinstance(v, str) else json.dumps(v, ensure_ascii=False)) for k, v in meta.items()]


def coverage_of(names: Counter, resolved: dict) -> dict:
    by_status = Counter(res.status for res in resolved.values())
    rows_by_status = Counter()
    for n, c in names.items():
        rows_by_status[resolved[n].status] += c
    return {
        "distinct_names": len(names), "names_by_status": dict(by_status), "rows_by_status": dict(rows_by_status),
        "distinct_cas": len({r.cas for r in resolved.values() if r.status == "cas"}),
        "distinct_groups": len({r.group for r in resolved.values() if r.status == "group"}),
        "unmapped": sorted((n for n, r in resolved.items() if r.status in ("unmapped", "ambiguous")), key=lambda n: -names[n]),
    }


def build(src: Path = ENV_KR_PROCESSED_DIR, out: Path = KR_PERMIT_CONTEXT_DB, resolver: NameResolver | None = None) -> dict:
    resolver = resolver or NameResolver()
    limits, permits, posts = (read_csv(src, n) for n in ("kr_permit_limits.csv", "kr_permits.csv", "ieps_posts.csv"))
    summary_csv, annual = read_csv(src, "kr_duration_summary.csv"), read_csv(src, "cleansys_annual.csv")
    pinfo = post_index(permits, posts)
    names, resolved, rows, dropped = classify_rows(limits, resolver, pinfo)
    summary, stats, industries, samples = entity_tables(rows, resolver)
    columns = resolver.cfg["cleansys_columns"]
    emissions = emission_rows(annual, columns)
    entities = {s[0] for s in summary} | {e[0] for e in emissions}
    groups, links = group_tables(resolver, entities)
    coverage = coverage_of(names, resolved)
    counts = {"kr_permit_limits.csv": len(limits), "kr_permits.csv": len(permits), "ieps_posts.csv": len(posts),
              "kr_duration_summary.csv": len(summary_csv), "cleansys_annual.csv": len(annual), "rows_used": len(rows)}

    out.parent.mkdir(parents=True, exist_ok=True)
    tmp = out.with_suffix(".tmp")
    tmp.unlink(missing_ok=True)
    conn = sqlite3.connect(tmp)
    conn.executescript(SCHEMA)
    conn.executemany("INSERT INTO meta VALUES (?,?)", meta_rows(src, counts, coverage, dropped))
    conn.executemany("INSERT INTO name_map VALUES (?,?,?,?,?,?,?,?)",
                     [(n, c, resolved[n].status, resolved[n].cas, resolved[n].group, resolved[n].method, resolved[n].key, resolved[n].qualifier)
                      for n, c in names.items()])
    conn.executemany("INSERT INTO groups VALUES (?,?,?,?,?)", groups)
    conn.executemany("INSERT OR IGNORE INTO cas_links VALUES (?,?,?)", links)
    conn.executemany("INSERT INTO entity_summary VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", summary)
    conn.executemany("INSERT INTO limit_stats VALUES (?,?,?,?,?,?,?,?,?,?,?)", stats)
    conn.executemany("INSERT INTO entity_industry VALUES (?,?,?,?,?)", industries)
    conn.executemany("INSERT INTO entity_samples VALUES (?,?,?,?,?,?,?,?,?,?,?)", samples)
    conn.executemany("INSERT INTO durations VALUES (?,?,?,?,?,?,?,?,?,?)", duration_rows(summary_csv))
    conn.executemany("INSERT INTO emissions VALUES (?,?,?,?,?,?)", emissions)
    conn.commit()
    conn.close()
    tmp.replace(out)
    return {"db": str(out), **counts, "dropped": dict(dropped), **coverage}


if __name__ == "__main__":
    print(json.dumps(build(), ensure_ascii=False, indent=1))
