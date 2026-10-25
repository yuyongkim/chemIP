# 한국 수출입 의무 규칙(kr_rules) — 파일 구성

진입점: `python -m scripts.trade_controls.build_kr_rules` (프로젝트 루트에서). 결과는 `backend/data/trade_controls/kr_rules.json`.
`--cas 71-43-2` 를 주면 그 물질에 걸리는 규칙만 출력하고 파일은 쓰지 않는다. `--refresh` 는 law.go.kr 를 다시 받는다.

| 파일 | 책임 |
|---|---|
| `kr_rules_source.json` | 손으로 관리하는 원천 데이터: 법령 목록(현행 lsiSeq), 규칙, 인용문, 세관 별표 URL, 미검증 목록 |
| `build_kr_rules.py` | 진입점. 인자 해석, 재료 수집, 결과 쓰기·요약 출력 |
| `kr_rules_builder.py` | 규칙 대조·매칭 결과를 kr_rules.json 구조로 조립(입출력 없음). 대조 실패 규칙은 unverified 로 이동 |
| `citation_check.py` | 인용문이 실제 조문에 있는지, 세관장확인 근거가 별표 xlsx 에 있는지 대조 |
| `law_text.py` | law.go.kr 본문·첨부 다운로드(캐시: `%TEMP%/chemip_trade_controls_cache`), 조문·부칙 조문 추출 |
| `customs_annex.py` | 세관장확인고시 별표 1의2·2의2 xlsx 를 표준 라이브러리로 읽어 법령별 행·CAS 집합 생성 |
| `ncis_index.py` | `data/terminology.db` 를 읽기 전용으로 열어 NCIS 분류별·국제목록별 CAS 집합 생성 |
| `rule_matcher.py` | 규칙의 `when` 조건(ncis_category / list / any_substance / any_of)을 CAS 집합으로 계산 |

규칙 추가: `kr_rules_source.json` 의 `rules` 에 항목을 더하고, 실제로 읽은 조문의 문장을 `citations[].verified_text` 에 그대로 넣는다(300자 이하). 법이 개정되면 `laws` 의 `fetch_url`(lsiSeq·efYd)을 새 판으로 바꾸고 `--refresh` 로 다시 돌린다. 인용문이 새 본문에 없으면 그 규칙은 자동으로 `unverified` 로 빠진다.
