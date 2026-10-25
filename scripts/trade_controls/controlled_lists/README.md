# controlled_lists — 수출입 통제 화학물질 목록 수집기

진입점: `scripts/trade_controls/collect_controlled_lists.py`

```
S:\chemip_trade_controls_venv\Scripts\python.exe -I scripts\trade_controls\collect_controlled_lists.py [--offline]
```

- 원본 다운로드: `S:\chemip_trade_controls_raw\` (opcw / australia_group / incb / kr_law / pubchem)
- 출력: `backend/data/trade_controls/cwc_schedules.json`, `australia_group.json`, `drug_precursors.json`
- `pdfplumber` 는 S: venv 에만 설치 (`PIP_CACHE_DIR=E:\dev-cache\pip`). 나머지는 표준 라이브러리.
- 종료코드 1 = 건수 불일치·CAS 체크디지트 오류 등 `validation.problems` 가 비어 있지 않음.
- law.go.kr OpenAPI OC 값은 환경변수 `LAW_GO_KR_OC` (없으면 공개 테스트값 `test`).

| 파일 | 맡는 일 |
|---|---|
| `sources.json` | 다운로드 URL, 목록별 제목·법적 근거·국내 의무 문구(데이터) |
| `name_aliases.json` | 별표 8 영문명 ↔ INCB 명칭 수동 대응(근거 포함) |
| `common.py` | 다운로드, CAS 체크디지트, 텍스트 정리, JSON 쓰기 |
| `kr_lawgo.py` | law.go.kr 현행 법령·행정규칙 검색/XML 저장, 별표 본문 추출 |
| `parse_opcw.py` | OPCW Schedule 1·2·3 웹페이지 표 파싱 (계열·예시·면제 구분) |
| `parse_australia_group.py` | AG CW 전구체 목록 PDF 파싱 |
| `parse_incb_red_list.py` | INCB Red List PDF Part One (Table I/II) 파싱 |
| `parse_kr_annexes.py` | 생화학무기법 [별표], 마약류관리법 시행령 [별표 8], 전략물자수출입고시 [별표 2] 1C350 파싱 |
| `pubchem_cas.py` | 별표 8 에만 있고 INCB 에 없는 물질의 CAS 를 PubChem 에서 조회(출처 표시) |
| `build_cwc.py` / `build_ag.py` / `build_drug.py` | 파싱 결과 결합·건수 검증 → 출력 JSON 구성 |
| `pipeline.py` | 다운로드→파싱→결합→저장 순서 조립 |
