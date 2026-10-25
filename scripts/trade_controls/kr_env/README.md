# kr_env — 한국 환경법령 물질 목록 · 인허가 수집기

현행 법령 원문(law.go.kr DRF API)을 내려받아 물질 목록별 JSON과 인허가 파일을 만든다.

```
python -I G:\MSDS\scripts\trade_controls\kr_env\run_all.py
```

- 원문 다운로드(신뢰하지 않는 데이터): `S:\chemip_trade_controls_raw\kr_env\` (`law/`, `admrul/`, `search/`, `voc_hwp/`). 있으면 재사용한다.
- 출력: `G:\MSDS\backend\data\trade_controls\kr_lists\<LIST_ID>.json`, `kr_lists\_index.json`(요약·교차검증·미확인 항목), `G:\MSDS\backend\data\trade_controls\kr_permits_env.json`
- 이름→CAS 매칭은 `G:\MSDS\data\terminology.db`를 읽기 전용으로 연다. 표준 라이브러리만 쓴다.

## 파일별 역할

| 파일 | 맡는 일 |
|---|---|
| `run_all.py` | 진입점. 파서를 순서대로 돌리고 목록·인덱스·인허가 파일을 쓴다 |
| `config.py` | 경로, 조회일, law.go.kr 설정, 파서 실행 순서(`PARSERS`) |
| `lawgo.py` | law.go.kr 검색·법령/행정규칙 XML 다운로드, 별표·조문 텍스트 추출 |
| `hwp_text.py` | HWP 5 (OLE2) 본문 텍스트 추출 — 표가 이미지로만 게시된 VOC 고시용 |
| `textutil.py` | 별표 텍스트의 번호 목록·상자 표 파서 |
| `cas.py` | CAS 정규화(앞자리 0 제거)·검증 숫자 확인 |
| `termdb.py` | terminology.db 이름 색인, 국문/영문 교차 확인 매칭 |
| `entries.py` | 법령 항목 1건 → entries / family_entries / unmatched 분류 |
| `listfile.py` | 목록 JSON 조립·건수 대조·CAS 검증·저장 |
| `common.py` | 법령 메타데이터, 별표 개정일 추출 |
| `law_clean_air.py` | 대기환경보전법: 대기오염물질, 유해성대기감시물질, 특정대기유해물질(+별표 8의2 기준농도), VOC 고시 |
| `law_water.py` | 물환경보전법: 수질오염물질, 특정수질유해물질(+별표 13의2 기준농도) |
| `law_soil.py` | 토양환경보전법: 토양오염물질(+우려·대책기준) |
| `law_waste.py` | 폐기물관리법: 지정폐기물 종류, 함유 유해물질, 할로겐족 폐유기용제 |
| `law_odor.py` | 악취방지법: 지정악취물질 |
| `law_chem_prtr.py` | 화학물질관리법: 배출량조사 대상(고시 별표 2), 배출저감계획서 대상(고시 별표 1) |
| `law_ippc.py` | 환경오염시설통합관리법: 배출부과금 부과대상 오염물질(시행령 별표 9) |
| `law_drinking_water.py` | 먹는물 수질기준(화학 항목) |
| `law_indoor_air.py` | 실내공기질 관리법 오염물질 |
| `law_ozone.py` | 오존층 보호법 제1종·제2종 특정물질 |
| `permits_env.py` | `data/permits_env_spec.json` → `kr_permits_env.json` (인용문은 내려받은 조문에서 찾아 넣음) |
| `crosscheck.py` | KOSHA MSDS 15번(캐시)·NCIS 분류와의 교차 확인, 기준 물질 소속 조회 |
| `data/name_variants.json` | 표기 변형(구/신 명명법, 영문명) — CAS를 직접 주지 않음 |
| `data/elements.json` | 'X 및 그 화합물'의 원소 X 자체 CAS(DB 영문명 일치 확인 후 채택) |
| `data/families.json` | 그룹(물질군) 이름, 원소 기호 힌트 |
| `data/permits_env_spec.json` | 인허가 정의(근거 조문과 인용 구절) |

## 매칭 규칙

- `match_method = "law_cas"`: 법령 표에 CAS가 인쇄됨(VOC 고시, PRTR·배출저감 고시). 검증 숫자 확인.
- `match_method = "name_match"`: 법령에 이름만 있음. terminology.db에서 **전체 이름 완전 일치**만 쓴다. 국문·영문 양쪽 결과가 있으면 하나의 CAS로 일치해야 한다(`matched_via`: `ko+en`, `ko_only`, `en_only`, `element_table+db_en`, 오존층 물질의 `montreal_code_table+systematic_name`).
- 'X 및 그 화합물'은 `family_entries`(원소 기호 포함) + 원소 X 자체 엔트리(`role: group_parent`).
- 물질군·성상 항목(질소산화물, 다이옥신, 페놀류 등)은 `family_entries`로만 둔다. 이성질체가 지정되지 않은 이름(예: 디클로로에탄)도 같다.
- 일치하지 않거나 후보가 여럿이면 `unmatched`에 후보와 함께 남긴다. 추측하지 않는다.
- `detail` 에는 법령이 그 물질에 대해 말하는 내용(사용자에게 보이는 글)만 쓴다. 수집기가 CAS를 어떻게 연결했는지에 대한 메모는 `match_note` 에 따로 둔다(없으면 키 없음). `entries.py` 의 `add_item(..., match_note=)` 로 넘긴다(kr_product 도 같은 함수를 쓴다).
