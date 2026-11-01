# backend/data/search — 물질 검색 순위 자료

물질 검색(`GET /api/chemicals`, `backend/core/terminology/search.py`)과 정적 검색(`scripts/static_export`, `frontend/public/chemip/static_search.jsx`)이 같이 읽는 자료다. 코드가 아니라 자료만 둔다.

| 파일 | 맡는 일 |
|---|---|
| `ranking.json` | 점수 규칙 값(경로별 기본점, 정확 CAS·정확 이름·동의어 등급·기본명 가점, KOSHA, 유도체 감점과 그 단어 목록). `backend/core/terminology/ranking.py` 가 읽고, 정적 내보내기가 `search/manifest.json` 의 `ranking` 으로 복사한다 |
| `synonym_sources.json` | 동의어를 어디서 읽는지: DB 표·열(NCIS 국·영문명과 이명, K-REACH 영문명, KISCHEM 국·영문명, ECHA 등록 IUPAC 명, ECHA CLP·EPA 목록명, msds_english), law.go.kr 법령 목록 규칙, 보충 목록 파일, 차단 목록. 출처마다 등급(`registry`/`synonym`)과 인용, PubChem 유래 표시(`derived_from`) |
| `curated_synonyms.json` | DB 에 없는 KCIA 제품 표기(제품정보·제품통계, 2026-10-28 조회). 항목마다 출처와 URL |
| `element_names.json` | 원소 한글 이름(대한화학회 이름 + 관용 이름). 항목마다 출처, 같은 표기가 나오는 국내 공식 자료(`corroborated_by`), CAS 확인용 영문명(`expect_en`) |
| `pubchem_synonyms.json` | 생성물(`scripts/search_synonyms/fetch_pubchem_synonyms.py`). 벤치마크 물질 + SEO tier1 만의 PubChem IUPAC 명과 앞쪽 동의어, 항목마다 `PubChem CID n` |
| `synonym_blocklist.json` | 출처가 다른 CAS 에 잘못 붙인 이름(예: KISCHEM data_no 4219 가 cyclohexene 110-83-8 에 붙인 사이클로헥산). 항목마다 근거 |
| `synonyms.jsonl` | 생성물(직접 고치지 않는다). 1행 머리(출처 표), 이후 한 줄에 `[cas, [[이름, 출처코드], ...]]` |

재생성: `python -B scripts/search_synonyms/build_synonyms.py` (terminology.db 는 읽기 전용, 구조는 `scripts/search_synonyms/README.md`). 다시 만든 뒤에는 백엔드 재시작과 정적 검색 색인 재생성(`scripts/static_export/run_all.py --steps search`)이 필요하다.
