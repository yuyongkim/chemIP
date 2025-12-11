# 📝 Product Requirements Document (PRD)

## Standardized High-Performance Data Processing Protocol

**Project:** 고성능 병렬 처리 표준 가이드라인  
**Author:** Technical Director Kim Yuyong  
**Version:** 1.0 (Resource-Unconstrained Edition)  
**Hardware:** Ryzen 5900X (12C/24T) + 64GB RAM

---

## 1. 개요 (Overview)

### 목표

보유 중인 고성능 하드웨어(Ryzen 5900X, 64GB RAM)의 자원을 극한까지 활용하여 데이터 처리 시간을 최소화한다.

### 원칙
>
> **"CPU가 노는 꼴을 보지 않는다."**

모든 대량 데이터 처리 로직은 기본적으로 **병렬 처리(Parallel Processing)**를 전제로 설계한다.

---

## 2. 기능 요구사항 (Functional Requirements)

### REQ-01: 멀티프로세싱 기본 적용 (Multiprocessing by Default)

**적용 조건:**

- 반복문(`for` loop)으로 처리되는 데이터 건수가 **1,000건 이상**
- 또는 개별 처리 시간이 **0.1초 이상**

**구현 표준:**

- `Pool`의 프로세스 개수는 `cpu_count()` (12~24개)로 설정
- CPU 점유율 **100%**를 목표로 함
- 순차 처리 코드는 오직 **디버깅(Debugging)** 용도로만 허용

---

### REQ-02: 메모리 기반 고속 처리 (Memory-First Strategy)

**목표:** 64GB RAM의 이점을 활용하여, I/O(디스크 읽기/쓰기) 병목을 제거

**구현 표준:**

- 모든 참조 데이터(단어사전, 매핑 테이블)는 **메모리에 통째로 로딩(In-Memory)**
- 프로세스 복제 시 메모리 오버헤드 고려
- 공유 메모리(`multiprocessing.Manager` 또는 `SharedMemory`) 적극 활용

---

### REQ-03: 비동기 크롤링 필수 (Async I/O Enforcement)

**목표:** 네트워크 요청 시 CPU 코어 낭비 방지

**구현 표준:**

- ❌ `requests` 라이브러리 사용 금지
- ✅ **`aiohttp`** 또는 **`httpx`** 사용 의무화
- 동시 연결 수(Concurrency)는 서버가 차단하지 않는 한도 내 **최대치**로 설정

---

## 3. 성능 목표 (Performance Goals)

| 지표 | 목표 |
|------|------|
| **CPU Utilization** | 배치 작업 시 **90% 이상** 유지 |
| **Speed-up** | 순차 처리 대비 **최소 5배 이상** |

> 작업 관리자 그래프가 꽉 차야 성공!

---

## 4. 예외 처리 (Error Handling)

- 병렬 처리 중 하나의 프로세스에서 에러 발생 시
- 전체 작업 중단 ❌
- **로그만 남기고 계속 진행** ✅
- `try-except` 필수

---

## 5. 마스터 템플릿 코드

```python
"""
High-Performance Parallel Processing Template
PRD v1.0 - Resource-Unconstrained Edition
Hardware: Ryzen 5900X (12C/24T) + 64GB RAM
"""

import multiprocessing as mp
from concurrent.futures import ProcessPoolExecutor, as_completed
from functools import partial
import logging

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def process_single_item(item, shared_data=None):
    """
    단일 아이템 처리 로직 (워커 함수)
    
    Args:
        item: 처리할 데이터 단위
        shared_data: 모든 워커가 공유하는 참조 데이터 (In-Memory)
    
    Returns:
        처리 결과
    """
    try:
        # ========================================
        # 여기에 실제 처리 로직 작성
        # ========================================
        result = item  # 예시
        return {"status": "success", "data": result}
    except Exception as e:
        # REQ-04: 에러 발생해도 전체 중단 없이 로그만 남김
        logger.error(f"Error processing {item}: {e}")
        return {"status": "error", "item": item, "error": str(e)}


def run_parallel_processing(items: list, shared_data: dict = None):
    """
    PRD REQ-01 준수: 멀티프로세싱 기본 적용
    
    Args:
        items: 처리할 데이터 리스트
        shared_data: 메모리에 로드된 참조 데이터
    
    Returns:
        처리 결과 리스트
    """
    # CPU 코어 수만큼 워커 생성 (REQ-01)
    num_workers = mp.cpu_count()
    logger.info(f"Starting parallel processing with {num_workers} workers")
    logger.info(f"Total items to process: {len(items):,}")
    
    results = []
    errors = []
    
    # ProcessPoolExecutor로 병렬 처리
    with ProcessPoolExecutor(max_workers=num_workers) as executor:
        # partial로 shared_data 바인딩
        worker_func = partial(process_single_item, shared_data=shared_data)
        
        # 모든 작업 제출
        future_to_item = {
            executor.submit(worker_func, item): item 
            for item in items
        }
        
        # 결과 수집 (완료되는 순서대로)
        for i, future in enumerate(as_completed(future_to_item)):
            result = future.result()
            
            if result["status"] == "success":
                results.append(result["data"])
            else:
                errors.append(result)
            
            # 진행률 출력 (1000건마다)
            if (i + 1) % 1000 == 0:
                logger.info(f"Progress: {i + 1:,}/{len(items):,}")
    
    logger.info(f"Completed: {len(results):,} success, {len(errors):,} errors")
    return results, errors


# ========================================
# 사용 예시
# ========================================
if __name__ == "__main__":
    # REQ-02: 참조 데이터 메모리에 로드
    shared_data = {
        "dictionary": {"key": "value"},  # 예시 데이터
        # 실제로는 여기에 단어사전, 매핑 테이블 등 로드
    }
    
    # 처리할 데이터 준비
    items = list(range(10000))  # 예시: 10,000건
    
    # 병렬 처리 실행
    results, errors = run_parallel_processing(items, shared_data)
    
    print(f"Results: {len(results)}, Errors: {len(errors)}")
```

---

## 6. 비동기 네트워크 요청 템플릿

```python
"""
Async Network Request Template
PRD REQ-03: requests 금지, aiohttp/httpx 사용
"""

import asyncio
import aiohttp
from aiohttp import ClientTimeout
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def fetch_single(session: aiohttp.ClientSession, url: str):
    """단일 URL 비동기 요청"""
    try:
        async with session.get(url) as response:
            return await response.json()
    except Exception as e:
        logger.error(f"Error fetching {url}: {e}")
        return None


async def fetch_all(urls: list, max_concurrent: int = 100):
    """
    다수 URL 동시 요청
    
    Args:
        urls: 요청할 URL 리스트
        max_concurrent: 동시 연결 수 (서버 차단 안 되는 선에서 최대)
    """
    timeout = ClientTimeout(total=30)
    connector = aiohttp.TCPConnector(limit=max_concurrent)
    
    async with aiohttp.ClientSession(
        timeout=timeout, 
        connector=connector
    ) as session:
        tasks = [fetch_single(session, url) for url in urls]
        results = await asyncio.gather(*tasks, return_exceptions=True)
    
    return results


# 사용 예시
if __name__ == "__main__":
    urls = [f"https://api.example.com/data/{i}" for i in range(1000)]
    results = asyncio.run(fetch_all(urls, max_concurrent=50))
    print(f"Fetched {len(results)} responses")
```

---

## 7. 체크리스트

코드 작성 전 확인:

- [ ] 처리 건수 1,000건 이상? → `multiprocessing` 적용
- [ ] 네트워크 요청 포함? → `aiohttp` 사용
- [ ] 참조 데이터 필요? → 메모리에 미리 로드
- [ ] `try-except`로 에러 처리 → 로그 남기고 계속 진행

---

> **"이제 '고민'은 끝났습니다. '규칙'이 생겼으니까요."**  
> — Technical Director Kim Yuyong
