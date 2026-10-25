"""익명 이용 집계(논문 근거용). 개인 식별 정보 없이 날짜·지표·물질별 횟수만 센다.

| 파일 | 책임 |
|---|---|
| `store.py` | SQLite 저장소 `data/usage.db`, 지표 목록(`METRICS`), 요약 계산 |
| `matcher.py` | 요청 경로 → (지표, 물질 식별자) 규칙, 로봇 판별(순수 함수) |
| `middleware.py` | 200 응답만 세는 HTTP 미들웨어(`backend/main.py` 에 등록) |

조회 라우트는 `backend/api/routes/usage.py` (`GET /api/usage/summary`).
"""
