# kr_safety — 한국 안전·노동·화재·고압가스·중대재해 법령 물질 목록 수집기

법령 원문(law.go.kr DRF XML)을 내려받아 물질 목록(CAS 연결)과 인허가·신고 의무를 만든다.
환경법(대기·물·토양·폐기물·악취·PRTR)과 화관법·화평법·수출입·CWC는 다른 수집기 범위다.

## 실행

```
python -I G:\MSDS\scripts\trade_controls\kr_safety\run.py fetch   # 현행 법령 XML 다운로드 → S:\chemip_trade_controls_raw\kr_safety\<날짜>\
python -I G:\MSDS\scripts\trade_controls\kr_safety\run.py build   # 파싱 → 출력 3종
```

표준 라이브러리만 쓴다. `data\terminology.db` 는 읽기 전용(`mode=ro`)으로만 연다.

## 출력

| 파일 | 내용 |
|---|---|
| `backend\data\trade_controls\kr_lists\KR_OSH_*.json`, `KR_HAZMAT_*`, `KR_GAS_*`, `KR_FIRE_*`, `KR_SAPA_*` | 목록 1개 = 파일 1개 (공통 형식, `list_model.py` 참조) |
| `backend\data\trade_controls\kr_permits_safety.json` | 인허가·신고·의무 19건, 각 건에 법령 원문 인용(verified_text). 항목 형식은 `kr_permits_env.json`·`kr_permits_product.json` 과 같다: `permit_id, name, law, kind(한국어: 허가·승인·신고·제출·심사·준수의무·실시·보고), trigger, authority, legal_basis, source_url, verified_text` + `when_required`(시기) |
| `backend\data\trade_controls\kr_safety_qa.json` | 건수 검증, CAS 체크섬 거부, 명칭 미매칭, KOSHA MSDS 15번 항목 대조, 확인용 물질 소속 |

## 모듈

| 파일 | 맡은 일 |
|---|---|
| `config.py` | 경로·법령명·상수 (한 곳에서만 정의) |
| `law_fetch.py` | law.go.kr DRF 검색·본문 XML 다운로드, `manifest.json`(MST·공포·시행일) 기록 |
| `law_xml.py` | 법령 XML에서 조문·별표 텍스트 추출 |
| `text_list.py` | 번호 목록형 별표(1. / 가. / 1) / 가)) 파싱, 물질 항목 → 국문·영문·CAS·단서 분리 |
| `box_table.py` | 상자 문자 표(┌─┬─┐) 파싱 |
| `cas.py` | CAS 추출·정규화·체크디지트 검증 |
| `name_match.py` | 명칭 → CAS: terminology.db 정확 일치 + 법령표(노출기준·별표 12/21/22) 동일명칭 대조 |
| `name_hints.json` | terminology.db에 국문명이 없는 법령 명칭의 영문 대조명 (데이터) |
| `law_names.py` | 법령표에 명칭·CAS가 나란히 적힌 쌍 수집 (명칭 매칭 대조용) |
| `named.py` | CAS 없이 명칭만 적힌 물질 추가 (단일 확정 시 entry, 아니면 family) |
| `list_model.py` | kr_lists JSON 형식: 목록 생성·entry·family 추가·저장 |
| `outline_list.py` | 번호 목록형 별표 → 목록 채우기 + 법정 종수 대조 |
| `context.py` | 다운로드 XML 캐시·버전 정보·명칭 색인 공유 |
| `p_osh_decree.py` | 산안법 시행령 제87조 제조등금지, 제88조 허가대상, 별표 26 허용기준(+시행규칙 별표 19 값) |
| `p_osh_rule.py` | 산안법 시행규칙 별표 21 작업환경측정, 별표 22 특수건강진단 |
| `p_osh_std.py` | 안전보건규칙 별표 12 관리대상·특별관리물질, 별표 1·9 위험물질·기준량 |
| `p_osh_oel.py` | 고용노동부 고시 노출기준 별표 1 |
| `p_osh_msds.py` | MSDS 대상 범위(시행령 제86조 제외), 대체자료 기재 제외물질(고시 제16조, 위 목록에서 파생) |
| `p_hazmat.py` | 위험물안전관리법 시행령 별표 1 위험물 및 지정수량 |
| `p_gas.py` | 고압가스법 시행규칙 제2조 가연성·독성·특수고압가스, 법 제20조·시행령 제16조 특정고압가스 |
| `p_fire.py` | 화재예방법 시행령 별표 2 특수가연물 (재료 범주라 family만) |
| `p_sapa.py` | 중대재해처벌법 시행령 별표 1 직업성 질병 원인물질, 별표 5 원료·제조물 (위 목록 인용분 파생) |
| `permits_spec.py` | 인허가·신고 정의 (데이터; 인용 위치 포함). `kind` 는 짧은 코드(permit·report …) |
| `permit_kinds.py` | `kind` 코드 → 출력용 한국어 낱말 (한 곳에서만 정의; 모르는 코드는 빌드 실패) |
| `permits.py` | permits_spec → kr_permits_safety.json, 인용문을 XML에서 직접 추출(없으면 실패) |
| `qa.py` | QA 보고서 작성 |
| `build_all.py` | 모듈 조립·실행 (진입점) |
| `run.py` | `python -I` 실행기 |

## 규칙

- `match_method`: `law_cas` = 법령 표에 CAS가 적혀 있음 / `name_match` = 명칭만 있어 CAS를 매칭함.
- `detail` 은 법령 내용(사용자에게 보이는 글)만 담는다. 명칭 매칭 메모(`법령 명칭 '…'`, `CAS 명칭 매칭: …`)는 `match_note` 에 따로 둔다(없으면 키 없음). 같은 CAS가 여러 번 들어오면 두 키 모두 ` | ` 로 잇는다.
- 명칭 매칭은 정확 일치만 쓰고, 후보가 여럿이거나 terminology.db와 법령표가 어긋나면 `family_entries` 로 보낸다(추정 금지).
- `X[CAS] 및 그 화합물` → 대표 CAS는 entry, 물질군은 family. `X[CAS] 화합물`(예: 니켈 화합물) → 원소 자체는 대상이 아니므로 family만.
- 위험물안전관리법은 유별·품명(성상) 기준이다. 표·비고가 이름을 든 물질만 entry로 넣고, 성상으로만 분류되는 물질(예: 벤젠=제1석유류)은 넣지 않는다.
- 산안법 시행령 별표 13(PSM 규정량)은 `terminology.db intl_regulatory` 의 `KR_OSHA_PSM` 을 재사용한다(여기서 재작성하지 않음).
