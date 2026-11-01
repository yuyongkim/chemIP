#!/usr/bin/env python
"""KOSHA 등재 화학물질을 위키백과 '실제 조회수'로 순위 매긴다 — 시드 선정용.

신호: Wikimedia Pageviews API(ko.wikipedia). 등재 언어 수(유명도)가 아니라 실제 월별 조회수.
Wikidata SPARQL 과 별개 엔드포인트라 지금 막힘 없이 동작한다.

재개 가능: 처리한 제목을 data/_pageviews_ckpt.jsonl 에 바로 적는다. 중간에 죽어도 다시 실행하면 이어간다.
병렬: 스레드풀로 동시에 여러 건 조회(기본 10). 완료분만 ko.json 으로 정렬 저장.

    python scripts/rank_pageviews.py            # 전부(이어서)
    python scripts/rank_pageviews.py --limit 200
"""
from __future__ import annotations
import argparse, json, sqlite3, sys, threading, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TERM_DB = ROOT / "data" / "terminology.db"
CKPT = ROOT / "data" / "_pageviews_ckpt.jsonl"
OUT = ROOT / "data" / "_pageviews_ko.json"
UA = "ChemIP-seed-ranker/1.0 (contact: yuyongkim@gmail.com)"

END = date.today().replace(day=1)
START = (END - timedelta(days=365)).replace(day=1)
REST = ("https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/"
        "ko.wikipedia/all-access/all-agents/{title}/monthly/{s}/{e}")

_lock = threading.Lock()


def candidates(limit):
    con = sqlite3.connect(TERM_DB)
    rows = con.execute(
        "SELECT external_id, cas_no, name, name_en FROM chemical_terms "
        "WHERE external_id GLOB '[0-9][0-9][0-9][0-9][0-9][0-9]' AND name GLOB '*[가-힣]*'"
    ).fetchall()
    con.close()
    seen, out = set(), []
    for ext, cas, ko, en in rows:
        title = (ko or "").split("(")[0].strip()
        if not title or title in seen:
            continue
        seen.add(title)
        out.append({"ext": ext, "cas": cas or "", "ko": title, "en": en or ""})
    return out[:limit] if limit else out


def load_done():
    done = {}
    if CKPT.exists():
        for line in CKPT.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                r = json.loads(line)
                done[r["ko"]] = r
            except Exception:
                pass
    return done


def views(title):
    url = REST.format(title=urllib.parse.quote(title.replace(" ", "_"), safe=""),
                      s=START.strftime("%Y%m01"), e=END.strftime("%Y%m01"))
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            data = json.load(r)
        return sum(it.get("views", 0) for it in data.get("items", []))
    except urllib.error.HTTPError as e:
        return -1 if e.code == 404 else -2
    except Exception:
        return -2


def work(c):
    rec = dict(c)
    rec["views"] = views(c["ko"])
    with _lock:
        with CKPT.open("a", encoding="utf-8") as f:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    return rec


def rebuild():
    done = load_done()
    hits = [r for r in done.values() if r.get("views", -1) >= 0]
    hits.sort(key=lambda x: x["views"], reverse=True)
    OUT.write_text(json.dumps(hits, ensure_ascii=False, indent=1), encoding="utf-8")
    return done, hits


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--workers", type=int, default=10)
    a = ap.parse_args()

    cands = candidates(a.limit or None)
    done = load_done()
    todo = [c for c in cands if c["ko"] not in done]
    print(f"후보 {len(cands)} · 완료 {len(done)} · 남음 {len(todo)}", flush=True)

    n = 0
    with ThreadPoolExecutor(max_workers=a.workers) as ex:
        futs = [ex.submit(work, c) for c in todo]
        for _ in as_completed(futs):
            n += 1
            if n % 500 == 0:
                print(f"  {n}/{len(todo)} 처리", flush=True)

    done, hits = rebuild()
    print(f"완료: 처리총 {len(done)} · 위키문서 보유 {len(hits)} → {OUT}", flush=True)
    print("상위 25:")
    for r in hits[:25]:
        print(f"  {r['views']:>9,}  {r['ko']}  ({r['cas']})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
