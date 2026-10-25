"""요청 게시판(중소기업 기능 요청·자료 오류 제보).

| 파일 | 책임 |
|---|---|
| `schema.py` | 허용 값(분류·회사 규모·상태)·길이 제한·입력 검증(순수 함수) |
| `store.py` | SQLite 저장소 `data/feedback.db` (공개 조회에서 연락처 제외, 관리자 목록만 포함) |
| `guard.py` | 접속 주소별 글쓰기 횟수 제한, 관리자 토큰(`CHEMIP_ADMIN_TOKEN`) 확인 |

라우트는 `backend/api/routes/feedback.py` (`/api/feedback`).
"""
