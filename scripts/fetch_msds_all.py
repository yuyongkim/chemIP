"""
MSDS 전체 수집 스크립트 — 미수집/부분수집 화학물질의 모든 16섹션을 수집한다.
- 기존 수집 데이터 스킵 (중복 호출 방지)
- 진행상황 실시간 표시
- 에러 발생 시 건너뛰고 계속 진행
- Ctrl+C로 안전 중단 가능 (이미 수집된 데이터는 보존)
"""

import os
import sys
import time
import signal
import sqlite3
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.api.kosha_msds_adapter import KoshaMsdsAdapter
from backend.config.settings import settings

DB_PATH = settings.TERMINOLOGY_DB_PATH
FULL_SECTIONS = set(range(1, 17))
WORKERS = 4  # parallel threads
DELAY = 0.05  # seconds between API calls per thread

# Graceful shutdown
shutdown_requested = False


def signal_handler(sig, frame):
    global shutdown_requested
    print("\n[!] 중단 요청됨 — 현재 작업 완료 후 종료합니다...")
    shutdown_requested = True


signal.signal(signal.SIGINT, signal_handler)


def get_work_items():
    """수집해야 할 (chem_id, section_no) 쌍 목록을 반환."""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # All KOSHA IDs
    cur.execute("SELECT description FROM chemical_terms WHERE description LIKE 'KOSHA_ID:%'")
    all_ids = [r[0].split(":")[1] for r in cur.fetchall()]

    # Already collected sections per chem_id
    cur.execute("SELECT chem_id, GROUP_CONCAT(section_no) FROM msds_details GROUP BY chem_id")
    existing = {}
    for row in cur.fetchall():
        if row[1]:
            existing[row[0]] = set(int(s) for s in row[1].split(",") if s.isdigit())

    conn.close()

    work = []
    for cid in all_ids:
        have = existing.get(cid, set())
        missing = FULL_SECTIONS - have
        for sec in sorted(missing):
            work.append((cid, sec))

    return work


def fetch_and_store(chem_id: str, section_no: int, adapter: KoshaMsdsAdapter):
    """단일 섹션 수집 후 DB에 저장."""
    try:
        resp = adapter.get_msds_detail(chem_id, section_seq=section_no)
        if resp["status"] == "success" and resp["data"]:
            conn = sqlite3.connect(DB_PATH)
            conn.execute("PRAGMA busy_timeout=10000")
            try:
                conn.execute(
                    "INSERT OR REPLACE INTO msds_details (chem_id, section_no, xml_data) VALUES (?, ?, ?)",
                    (chem_id, section_no, resp["data"]),
                )
                conn.commit()
                return "ok"
            finally:
                conn.close()
        else:
            return "empty"
    except Exception as e:
        return f"error:{e}"


def worker(items, thread_id):
    """Worker thread: processes a slice of work items."""
    adapter = KoshaMsdsAdapter()
    results = {"ok": 0, "empty": 0, "error": 0}

    for chem_id, section_no in items:
        if shutdown_requested:
            break
        status = fetch_and_store(chem_id, section_no, adapter)
        if status == "ok":
            results["ok"] += 1
        elif status == "empty":
            results["empty"] += 1
        else:
            results["error"] += 1
        time.sleep(DELAY)

    return results


def main():
    print("=" * 60)
    print("  MSDS 전체 수집 시작")
    print(f"  시작 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  DB: {DB_PATH}")
    print("=" * 60)

    work = get_work_items()
    total = len(work)

    if total == 0:
        print("\n모든 섹션이 이미 수집되었습니다!")
        return

    print(f"\n수집 대상: {total:,}건 (API 호출)")
    print(f"병렬 스레드: {WORKERS}개")
    print(f"예상 소요: ~{total * (DELAY + 0.1) / WORKERS / 3600:.1f}시간")
    print(f"Ctrl+C로 안전 중단 가능\n")

    # Split work across threads
    chunks = [[] for _ in range(WORKERS)]
    for i, item in enumerate(work):
        chunks[i % WORKERS].append(item)

    start_time = time.time()
    total_results = {"ok": 0, "empty": 0, "error": 0}

    # Progress monitor thread
    def monitor():
        while not shutdown_requested:
            elapsed = time.time() - start_time
            done = total_results["ok"] + total_results["empty"] + total_results["error"]
            if done > 0:
                rate = done / elapsed
                remaining = (total - done) / rate if rate > 0 else 0
                pct = done / total * 100
                print(
                    f"\r  [{pct:5.1f}%] {done:,}/{total:,} | "
                    f"OK:{total_results['ok']:,} Empty:{total_results['empty']:,} Err:{total_results['error']:,} | "
                    f"{rate:.1f}/s | 남은시간: {remaining/60:.0f}분   ",
                    end="",
                    flush=True,
                )
            time.sleep(2)

    import threading
    monitor_thread = threading.Thread(target=monitor, daemon=True)
    monitor_thread.start()

    with ThreadPoolExecutor(max_workers=WORKERS) as executor:
        futures = {executor.submit(worker, chunk, i): i for i, chunk in enumerate(chunks)}
        for future in as_completed(futures):
            result = future.result()
            for key in total_results:
                total_results[key] += result[key]

    elapsed = time.time() - start_time
    done = total_results["ok"] + total_results["empty"] + total_results["error"]

    print(f"\n\n{'=' * 60}")
    print(f"  수집 완료!")
    print(f"  소요 시간: {elapsed/3600:.1f}시간 ({elapsed:.0f}초)")
    print(f"  성공: {total_results['ok']:,}건")
    print(f"  빈 응답: {total_results['empty']:,}건")
    print(f"  에러: {total_results['error']:,}건")
    print(f"  총 처리: {done:,}/{total:,}건")
    print(f"{'=' * 60}")

    # Final DB stats
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT COUNT(DISTINCT chem_id) FROM msds_details")
    with_msds = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM msds_details")
    total_records = cur.fetchone()[0]
    cur.execute("""
        SELECT COUNT(*) FROM (
            SELECT chem_id FROM msds_details GROUP BY chem_id HAVING COUNT(DISTINCT section_no) = 16
        )
    """)
    complete = cur.fetchone()[0]
    conn.close()

    print(f"\n  DB 최종 현황:")
    print(f"  MSDS 보유 화학물질: {with_msds:,}건")
    print(f"  16섹션 완전: {complete:,}건")
    print(f"  총 섹션 레코드: {total_records:,}건")


if __name__ == "__main__":
    main()
