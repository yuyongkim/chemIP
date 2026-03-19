from __future__ import annotations

import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "dist" / "chemIP-backend"


MIT_LICENSE = """MIT License

Copyright (c) 2026 ChemIP contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
"""


README_EN = """# ChemIP Backend Review Repository

**English** | [한국어](README.ko.md)

This repository contains the backend/API implementation used for academic review of ChemIP.

Scope note: the frontend prototype is intentionally omitted here. This review repository focuses on backend integration logic, retrieval adapters, local index access, and API-level smoke tests.

## Included Components

- `backend/`: FastAPI application, routers, adapters, shared HTTP client, and core logic
- `tests/test_api_smoke.py`: smoke test suite for backend routes
- `scripts/test_kipris_live.py`: optional live KIPRIS integration check
- `scripts/build_uspto_index.py`: USPTO local index build script
- `scripts/build_global_index.py`: global patent index build script
- `scripts/verify_backend_submission.py`: backend-only verification runner

## What This Review Repo Covers

- KOSHA MSDS retrieval adapter and section-level detail access
- KIPRIS patent search and detail retrieval
- local SQLite-based patent index access
- shared HTTP client with retry/backoff and session pooling
- backend middleware for request IDs, security headers, rate limiting, and health endpoints

## What Is Not Included

- the Next.js frontend review UI
- local SQLite database files
- `.env` secrets or runtime API keys
- large guide/patent datasets

## Important Docs

- [Quick Start](docs/QUICKSTART.md)
- [API Scope](docs/API_SCOPE.md)
- [Reproducibility](docs/REPRODUCIBILITY.md)

## Quick Start

```bash
pip install -r requirements.txt
uvicorn backend.main:app --reload --host 127.0.0.1 --port 7010
```

## Verification

```bash
python -m pytest tests/test_api_smoke.py -q
python scripts/verify_backend_submission.py
```
"""


README_KO = """# ChemIP Backend Review Repository

[English](README.md) | **한국어**

이 저장소는 ChemIP 논문 심사를 위한 백엔드/API 구현만 분리한 리뷰용 코드 저장소입니다.

범위 설명: 프론트엔드 프로토타입은 의도적으로 제외했습니다. 이 저장소는 백엔드 통합 로직, 검색 어댑터, 로컬 인덱스 접근, API 수준 smoke test 검증에 초점을 둡니다.

## 포함된 구성

- `backend/`: FastAPI 애플리케이션, 라우터, 어댑터, 공통 HTTP client, 핵심 로직
- `tests/test_api_smoke.py`: 백엔드 라우트 smoke test
- `scripts/test_kipris_live.py`: 선택적 KIPRIS 실연동 점검
- `scripts/build_uspto_index.py`: USPTO 로컬 인덱스 구축 스크립트
- `scripts/build_global_index.py`: 글로벌 특허 인덱스 구축 스크립트
- `scripts/verify_backend_submission.py`: 백엔드 전용 검증 스크립트

## 이 저장소가 다루는 범위

- KOSHA MSDS 조회 어댑터와 섹션별 상세 조회
- KIPRIS 특허 검색 및 상세 조회
- 로컬 SQLite 특허 인덱스 접근
- retry/backoff 및 세션 풀링이 적용된 공통 HTTP client
- request ID, 보안 헤더, rate limit, health endpoint를 포함한 백엔드 미들웨어

## 포함하지 않는 것

- Next.js 프론트엔드 UI
- 로컬 SQLite DB 파일
- `.env` 비밀값 및 실제 API 키
- 대용량 가이드/특허 데이터셋

## 중요 문서

- [빠른 시작](docs/QUICKSTART.ko.md)
- [API 범위](docs/API_SCOPE.ko.md)
- [재현성 안내](docs/REPRODUCIBILITY.ko.md)

## 빠른 시작

```bash
pip install -r requirements.txt
uvicorn backend.main:app --reload --host 127.0.0.1 --port 7010
```

## 검증

```bash
python -m pytest tests/test_api_smoke.py -q
python scripts/verify_backend_submission.py
```
"""


DOCS = {
    "docs/QUICKSTART.md": """# Quick Start

**English** | [한국어](QUICKSTART.ko.md)

This guide covers the minimum steps needed to inspect or run the public backend release.

## 1. Install

```bash
pip install -r requirements.txt
```

## 2. Configure

Create `.env` from `.env.example`.

Required for live upstream checks:
- `KOSHA_SERVICE_KEY_DECODED`
- `KIPRIS_API_KEY`

Optional:
- local patent DB paths
- rate limit values
- LLM settings

## 3. Run

```bash
uvicorn backend.main:app --reload --host 127.0.0.1 --port 7010
```

## 4. Check

- `GET /health`
- `GET /ready`
- `GET /api/chemicals?q=benzene`
- `GET /api/patents?q=benzene`

## 5. Verify

```bash
python scripts/verify_backend_submission.py
```

## Notes

- SQLite data files are not shipped in this public release.
- Without local DB files, local index routes may return empty results.
- Live KIPRIS checks require network access and a valid key.
""",
    "docs/QUICKSTART.ko.md": """# 빠른 시작

[English](QUICKSTART.md) | **한국어**

이 문서는 공개된 백엔드 번들을 가장 짧은 절차로 실행하거나 점검하는 방법만 설명합니다.

## 1. 설치

```bash
pip install -r requirements.txt
```

## 2. 설정

`.env.example`를 복사해서 `.env`를 만듭니다.

실연동 점검에 필요한 값:
- `KOSHA_SERVICE_KEY_DECODED`
- `KIPRIS_API_KEY`

선택 설정:
- 로컬 특허 DB 경로
- rate limit 값
- LLM 관련 값

## 3. 실행

```bash
uvicorn backend.main:app --reload --host 127.0.0.1 --port 7010
```

## 4. 점검

- `GET /health`
- `GET /ready`
- `GET /api/chemicals?q=benzene`
- `GET /api/patents?q=benzene`

## 5. 검증

```bash
python scripts/verify_backend_submission.py
```

## 참고

- SQLite 데이터 파일은 공개 번들에 포함되지 않습니다.
- 로컬 DB 파일이 없으면 로컬 인덱스 기반 경로는 빈 결과를 반환할 수 있습니다.
- live KIPRIS 검증은 외부 네트워크와 유효한 키가 필요합니다.
""",
    "docs/API_SCOPE.md": """# API Scope

**English** | [한국어](API_SCOPE.ko.md)

This repository is published for paper review of the ChemIP backend.

## Primary scope for the paper

- `/api/chemicals`
- `/api/patents`
- `/health`
- `/ready`

## What the paper discusses

- KOSHA MSDS search/detail retrieval path
- KIPRIS patent search/detail retrieval path
- local SQLite patent index access
- shared HTTP client behavior
- backend middleware and health endpoints

## What to treat as secondary

Some additional backend modules remain in the codebase for runtime completeness.
They are not the focus of the SoftwareX manuscript and should not be interpreted as the main contribution of the paper.
""",
    "docs/API_SCOPE.ko.md": """# API 범위

[English](API_SCOPE.md) | **한국어**

이 저장소는 ChemIP 백엔드의 논문 심사용 공개 버전입니다.

## 논문 기준 핵심 범위

- `/api/chemicals`
- `/api/patents`
- `/health`
- `/ready`

## 논문에서 다루는 내용

- KOSHA MSDS 검색 및 상세 조회 경로
- KIPRIS 특허 검색 및 상세 조회 경로
- SQLite 기반 로컬 특허 인덱스 접근
- 공통 HTTP client 동작
- 백엔드 미들웨어와 health endpoint

## 보조 범위로 봐야 하는 것

일부 추가 모듈은 런타임 완결성을 위해 코드베이스에 남아 있습니다.
하지만 SoftwareX 논문의 핵심 기여는 아니며, 주평가 대상도 아닙니다.
""",
    "docs/REPRODUCIBILITY.md": """# Reproducibility

**English** | [한국어](REPRODUCIBILITY.ko.md)

## Included for reproducibility

- backend source code
- backend smoke test suite
- optional live KIPRIS integration check
- local patent index build scripts
- pinned Python dependencies

## Excluded on purpose

- `.env` secrets
- SQLite databases
- large patent corpora
- local guide datasets

## Validation commands

```bash
python -m pytest tests/test_api_smoke.py -q
python scripts/verify_backend_submission.py
```

## Interpretation

Passing smoke tests confirms that the public code package is internally consistent.
Live upstream availability still depends on external APIs, credentials, and network conditions.
""",
    "docs/REPRODUCIBILITY.ko.md": """# 재현성 안내

[English](REPRODUCIBILITY.md) | **한국어**

## 재현성을 위해 포함한 것

- 백엔드 소스 코드
- 백엔드 smoke test
- 선택적 KIPRIS 실연동 점검 스크립트
- 로컬 특허 인덱스 구축 스크립트
- 버전 고정 Python 의존성

## 의도적으로 제외한 것

- `.env` 비밀값
- SQLite 데이터베이스
- 대용량 특허 원천 데이터
- 로컬 가이드 데이터셋

## 검증 명령

```bash
python -m pytest tests/test_api_smoke.py -q
python scripts/verify_backend_submission.py
```

## 해석

Smoke test 통과는 공개 코드 묶음이 내부적으로 일관되다는 뜻입니다.
실제 외부 API 응답은 네트워크 상태, 자격 증명, upstream 가용성에 따라 달라질 수 있습니다.
""",
}


FILES_TO_COPY = [
    ".env.example",
    ".gitignore",
    "requirements.txt",
    "pytest.ini",
]

SCRIPT_FILES_TO_COPY = [
    "build_uspto_index.py",
    "build_global_index.py",
    "test_kipris_live.py",
    "verify_backend_submission.py",
]


def copy_file(relative_path: str) -> None:
    source = ROOT / relative_path
    if not source.exists():
        return

    destination = OUT_DIR / relative_path
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)


def copy_directory(relative_path: str) -> None:
    source = ROOT / relative_path
    destination = OUT_DIR / relative_path
    if not source.exists():
        return
    shutil.copytree(
        source,
        destination,
        ignore=shutil.ignore_patterns(
            "__pycache__",
            "*.pyc",
            ".pytest_cache",
            "node_modules",
            ".next",
            "out",
            "build",
        ),
    )


def write_file(relative_path: str, content: str) -> None:
    destination = OUT_DIR / relative_path
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(content, encoding="utf-8")


def main() -> None:
    if OUT_DIR.exists():
        shutil.rmtree(OUT_DIR)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    for relative_path in FILES_TO_COPY:
        copy_file(relative_path)

    copy_directory("backend")
    copy_directory("tests")

    scripts_dir = OUT_DIR / "scripts"
    scripts_dir.mkdir(parents=True, exist_ok=True)
    for script_name in SCRIPT_FILES_TO_COPY:
        copy_file(f"scripts/{script_name}")

    write_file("README.md", README_EN)
    write_file("README.ko.md", README_KO)
    write_file("LICENSE", MIT_LICENSE)
    for relative_path, content in DOCS.items():
        write_file(relative_path, content)

    print(f"Backend review bundle created at: {OUT_DIR}")


if __name__ == "__main__":
    main()
