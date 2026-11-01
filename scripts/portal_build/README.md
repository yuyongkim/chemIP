# scripts/portal_build — `data/portal_facts.db` 만들기

포털 서비스(`docs/portal/PORTAL_SERVICES_v1.md` 4.3)의 새 DB `G:\MSDS\data\portal_facts.db` 를 채우는 스크립트들.
원본 DB(`terminology.db` 등)는 읽기 전용(`mode=ro`)으로만 연다. 스키마·연결·쓰기 도우미는 `portal_db.py` 한 곳에 있고,
스크립트마다 **자기 `source_id` 의 행만** 지우고 다시 넣는다(다른 서비스 행은 건드리지 않는다). 정적 파일은
`scripts/static_export/` 의 단계가 이 DB 를 읽어 만든다(형식 `scripts/static_export/CONTRACT.md`).
서비스마다 파일을 더하면 아래 표에 줄을 더한다.

## 서비스 2–4 (물성·식별자·UN 운송)

```
python -B G:\MSDS\scripts\portal_build\msds_facts.py          # properties · transport · oel(KR, MSDS 인용값) · oel_text, 약 20초
python -B G:\MSDS\scripts\portal_build\wikidata_dump.py       # Wikidata(CC0) 덤프 받기 — 이어 받기, 처음 약 25분
python -B G:\MSDS\scripts\portal_build\identifiers.py         # identifiers (덤프 파일만 읽음, 네트워크 없음), 약 20초
python -I -B G:\MSDS\scripts\static_export\run_all.py --steps facts_portal   # → v1/f/, v1/g/un_index.json
```

| 파일 | 맡는 일 |
|---|---|
| `portal_db.py` | 스키마(`CREATE TABLE IF NOT EXISTS`, 문서 4.3 + `oel_text`), 원본 읽기 전용 연결, `put_sources`·`replace_rows`(자기 source_id 행만 바꿈) |
| `msds_xml.py` | MSDS 항목 XML → `{항목 코드: 글자}` (두 번 이스케이프된 글자 풀기). 항목 코드 표는 머리 주석 |
| `msds_values.py` | §9 글자 → 물성 행: 원문 유지, "※출처" → origin, 숫자·SI 단위는 한 값·아는 단위일 때만(°C·Pa·g/L·mPa·s·g/mol·%) |
| `msds_transport.py` | §14 → 운송 행(UN 4자리·등급·용기 등급 I/II/III·해양오염 yes/no·EmS) |
| `msds_oel.py` | §8 H0202(MSDS 가 인용한 국내 노출기준) → TWA/STEL/C 행, 뒤 글자는 notation |
| `cas_utils.py` | CAS 모양·검사 숫자, §3 의 엑셀 손상 CAS 고치기(검사 숫자가 맞을 때만) |
| `msds_facts.py` | 위 파서로 `terminology.db` → properties·transport·oel(source `kosha_msds_s8`)·oel_text. 기록 CAS: 목록의 KOSHA 행, 없으면 §3 |
| `wikidata_dump.py` | CAS 목록으로 Wikidata SPARQL(P231→EC P232·UN P695·InChIKey P235·Q id·한/영 이름) → `data/wikidata/wikidata_cas_identifiers.jsonl` |
| `identifiers.py` | 이름(목록·NCIS·별칭·Wikidata)·KOSHA MSDS 번호·NCIS KE·PubChem CID·Wikidata·MSDS UN → identifiers |

source_id: `kosha_msds_s9` · `kosha_msds_s14` · `kosha_msds_s8` · `kosha_msds` · `chemip_terms` · `chemip_aliases` · `ncis` · `pubchem` · `wikidata`
(이름·주소·라이선스는 `sources` 표). 시험: `python -B -m pytest -q tests/test_portal_build.py`.

## 서비스 5 (노출기준 비교, oel)

공식 공개 자료 원본을 받아 `data/portal_raw/oel/<source_id>/`(받은 날짜·sha256 은 `manifest.json`)에 두고, 출처마다 파서가 `oel` 행을 만든다.
KOSHA MSDS 8항 인용값(`kosha_msds_s8`, `msds_facts.py`)과는 다른 출처로 따로 둔다. ACGIH TLV·GESTIS 는 `sources` 행(링크)만, 값은 넣지 않는다.

```
python -I -B G:\MSDS\scripts\portal_build\oel_fetch.py              # 법제처 별표1(.hwp)·eCFR(OSHA) 받기, 이어 받기
node G:\MSDS\scripts\portal_build\oel_fetch_browser.cjs             # CDC NIOSH NPG 약 650쪽·EUR-Lex(봇 확인 화면 때문에 headless Chromium), 이어 받기, 처음 약 40분
python -I -B G:\MSDS\scripts\portal_build\oel_build.py              # → oel·sources (출처마다 자기 행만 바꿈), 보고서 data/portal_raw/oel/build_report.json
python -I -B G:\MSDS\scripts\static_export\run_all.py --steps oel   # → v1/oel/<CAS>.json, v1/g/oel_summary.json
```

| 파일 | 맡는 일 |
|---|---|
| `oel_sources.json` | 출처 등록(한 곳): source_id·관할·이름·주소·라이선스·기준일·받는 방법(http / browser / link_only)·원본 파일 |
| `oel_raw.py` | 원본 보관 경로·`manifest.json`(주소·받은 날짜·sha256)·등록 읽기 |
| `oel_fetch.py` · `oel_fetch_browser.cjs` | 원본 받기: HTTP(법제처·eCFR) / headless Chromium(CDC·EUR-Lex) |
| `hwp5_tables.py` | HWP 5 파일(OLE 복합 문서)의 표를 표준 라이브러리만으로 읽기(셀 주소대로 행·열) |
| `oel_values.py` | 공용 순수 함수: 숫자(소수점 쉼표·천 단위)·단위 맞추기(µg→mg, ppb→ppm, f/ml=f/cc)·CAS 찾기·행 모양·같은 CAS 여러 항목 구분 |
| `oel_kr_moel.py` | 고용노동부 고시 별표1 → KR 행(C 표시=최고, "참조" 행 제외, 비고=표시) |
| `oel_us_osha.py` · `oel_osha_map.json` | eCFR 1910.1000 Z-1·Z-2·Z-3 + 개별 기준(1910.1001–1053) → US 행. 개별 기준 값은 원문 문장 확인 후에만 |
| `oel_us_niosh.py` | NIOSH Pocket Guide 쪽 → REL(TWA/ST/C)·IDLH 행 |
| `oel_eu.py` | EUR-Lex 지침 본문 → EU IOELV(나중 지침이 앞 지침을 대신)·BOELV(아직 남은 경과 규정만 표시) 행 |
| `oel_build.py` | 진입점: 위 파서 → `oel`·`sources` |

source_id: `kr_moel_notice` · `us_osha_z` · `us_osha_specific` · `us_niosh_npg` · `eu_ioelv` · `eu_boelv` · `acgih_tlv`(링크만) · `gestis_ilv`(링크만).
시험: `python -B -m pytest -q tests/test_oel.py`(원본이 있으면 벤젠·톨루엔·포름알데히드·암모니아·불화수소 대조 포함).

## 서비스 6 (규제 목록 탐색 + 변경 알림·RSS, reg_changes)

ChemIP 가 아는 목록 전부(국내 법령별 52 · NCIS 분류 10 · 통제 3 · 상대국 법령별 51 · 국가별 규제 DB 26 = 142개, 등재 285,775건)를
한 모양으로 모으고(`reg_lists.py`, 읽기만), 지난 스냅숏과 비교한 차이와 공식 개정 소식을 `reg_changes` 에 **덧붙인다**(지우지 않음).
스냅숏: `G:\MSDS\data\portal_snapshots\reg\<날짜>.json.gz` + `latest.json.gz`(기준선 2026-10-31).

```
python -I -B G:\MSDS\scripts\portal_build\reg_diff.py                 # 비교·공식 출처·reg_changes 덧붙이기·스냅숏, 약 1분(--no-official, --dry-run)
python -I -B G:\MSDS\scripts\static_export\run_all.py --steps reg      # → v1/reg/ (lists·list/<id>[.<k>]·changes.json·changes.xml), 약 5초
E:/dev-cache/r2-venv/Scripts/python -B G:\MSDS\scripts\portal_build\reg_publish.py   # 바뀐 파일만 R2 로(.xml = application/rss+xml)
```

| 파일 | 맡는 일 |
|---|---|
| `reg_config.py` | 경로·묶음·출처(`SOURCES`, sources 표 행)·NCIS 분류 id·Federal Register 질의와 목록 연결 규칙·ECHA·법제처 주소·내보내기 건수 |
| `reg_lists.py` | 목록 모으기 → `{id, group, jurisdiction, law, title, …, rows: [cas, name, name_en, detail]}`. 계열(CAS 없음) 행은 cas "" |
| `reg_snapshot.py` | 스냅숏 만들기·저장·읽기, 두 스냅숏 차이(순수 함수) → added / removed / modified 행 |
| `reg_http.py` | 공식 출처 GET(User-Agent·시간 제한·재시도·크기 상한) |
| `reg_official.py` | 공식 출처 → 행(메타데이터만): 목록 원문 개정일·법제처 OPEN API(OC 키 필요)·Federal Register(EPA·OSHA)·ECHA 후보물질 포함일 |
| `reg_diff.py` | 진입점: 모으기 → 비교 → 공식 출처 → `reg_changes`(같은 행은 건너뜀)·`sources` → 스냅숏 저장. 보고서 `E:\dev-cache\chemip-static\reports\reg_diff.json` |
| `reg_publish.py` | `v1/reg/` 를 R2 로: 내용 해시가 바뀐 파일만, `.xml` 은 RSS 형식. 기록 `reports/r2_publish_v1_reg.json` |

source_id: `chemip_kr_lists` · `chemip_ncis` · `chemip_controlled` · `chemip_intl_lists` · `chemip_intl_regulatory`(목록) ·
`chemip_export_diff` · `law_go_kr_listmeta` · `law_go_kr_api` · `federal_register` · `echa_candidate_list`(변경).
법제처 OPEN API 는 이 PC 의 IP 를 등록한 OC 값이 있어야 한다(공개 시험값 `test` 는 거절됨). `.env` 에 `LAW_GO_KR_OC=` 를 넣으면 다음 실행부터 쓴다(없으면 건너뛰고 보고서에 적음).
시험: `python -B -m pytest -q tests/test_reg_changes.py`, `node frontend/scripts/tests/test_reg_lists.cjs`.

**갱신(지금): 집 PC 정기 실행.** 위 세 줄을 순서대로 하루 한 번(예: 작업 스케줄러 03:30, 콘솔 창 없이 `pythonw` 또는
"사용자가 로그온했는지 여부에 관계없이 실행"). 목록 파일(`backend/data/trade_controls/*`)·`terminology.db` 가 바뀐 날에만 비교 행이
생기고, 공식 출처는 매번 새 소식만 덧붙는다. 화면은 R2 의 `v1/reg/` 만 읽으므로 PC 가 꺼져 있어도 마지막으로 올린 내용이 보인다
(Worker 캐시: `reg/` 1시간, `reg/list/` 1일).

## 서비스 9 (화학사고 소식, feed_items)

Chem_Eng 사고 DB(읽기 전용)·CSB RSS·언론 보도 제목을 `feed_items` 에 모은다. 자료원·라이선스·스키마·Worker 정기 갱신: `docs/portal/INCIDENT_FEED_v1.md`.

```
python -I -B G:\MSDS\scripts\portal_build\incident_feed.py            # [--offline] [--no-press], 약 10초
python -I -B G:\MSDS\scripts\static_export\run_all.py --steps feed     # → v1/feed/latest.json, v1/feed/by-cas/<CAS>.json
```

| 파일 | 맡는 일 |
|---|---|
| `feed_config.py` | 자료원·라이선스·RSS 주소·보도 검색어·보관 기간·내보내기 개수, `feed_items` 스키마 |
| `feed_parse.py` | 순수 함수(글자·날짜·KOSHA 날짜·eMARS 나라·RSS 읽기·물질 이름 찾기) |
| `feed_chemeng.py` | Chem_Eng `incidents.db` → 소식 행·출처 행·이름 사전 |
| `feed_fetch.py` | CSB RSS·Google News RSS → 소식 행(보도는 제목·링크만) |
| `feed_db.py` | `feed_items` 쓰기·읽기(짧은 트랜잭션) |
| `incident_feed.py` | 진입점 |

source_id: `chemeng_csb` · `chemeng_rmp` · `chemeng_emars` · `chemeng_kosha` · `chemeng_nics` · `csb_rss` · `press_gnews`.
시험: `python -B -m pytest -q tests/test_incident_feed.py`.

## 적용 법규 판정기(화관법 규정수량, 2026-10-31)

```
python -I -B G:\MSDS\scripts\portal_build\hazchem_quantity.py [--refresh]   # law.go.kr 고시 별표 2·3(.hwp) → v1/g/hazchem_quantity.json
```

| 파일 | 맡는 일 |
|---|---|
| `hazchem_quantity.py` | 화학물질안전원고시 「유해화학물질의 규정수량에 관한 규정」 별표 2·3 (.hwp, `hwp5_tables.read_tables`) → CAS 별 최하위·하위·상위 규정수량. 원본·sha256 `data/portal_raw/hazchem_quantity/`, 형식 `scripts/static_export/CONTRACT.md` "g/hazchem_quantity.json" |

## 온도별 물성(tp)

R2(`docs/portal/research/R2_data_sources.md`) 허용 목록의 자료만 쓴다(`tp_sources.json`, 차단 목록 포함). `chemicals` 패키지의 CRC·Perry·Yaws·VDI·Landolt·JANAF 표는 읽지 않는다.

```
python -I -B G:\MSDS\scripts\portal_build\tp_fetch.py            # ChemSep lite.zip(XML·라이선스만 꺼냄)·NASA CEA thermo.inp(고정 커밋)·Wikidata·CoolProp 상수
python -I -B G:\MSDS\scripts\portal_build\thermo_props.py        # → data/portal_raw/tp/build/tp_records.json + build_report.json
python -I -B G:\MSDS\scripts\static_export\run_all.py --steps tp # → v1/tp/<CAS>.json, index.json, licenses.json
E:/dev-cache/tp-venv/Scripts/python -B G:\MSDS\scripts\portal_build\tp_crosscheck.py      # 시험 기준값(chemicals 구현) → frontend/scripts/tests/fixtures/
E:/dev-cache/tp-venv/Scripts/python -B G:\MSDS\scripts\portal_build\joback_crosscheck.py  # Joback 시험 기준값(thermo + RDKit)
```

| 파일 | 맡는 일 |
|---|---|
| `tp_sources.json` | 출처 등록·허용 목록(한 곳): 라이선스·인용·1차 출처 확인 기록·Artistic-2.0 변경판 안내, 차단(red/amber) id |
| `tp_raw.py` · `tp_fetch.py` | 원본 보관(`data/portal_raw/tp/<source>/manifest.json`: 주소·날짜·sha256) / 받기 |
| `tp_chemsep.py` | ChemSep XML → 상수·상관식(계수 그대로, kmol→mol 배수 `f`) |
| `tp_nasa.py` · `tp_nasa_cas.json` · `tp_nasa_map.py` | NASA-9 thermo.inp 읽기 / 종 → CAS(손으로 검토한 224쌍) / 그 후보 만들기(chemicals 식별자 찾기만) |
| `tp_constants.py` | Wikidata 임계점·CoolProp 상수 → 상수 행 |
| `tp_licence.py` | 허용 목록 밖 출처면 빌드 실패 |
| `thermo_props.py` | 진입점: CAS 별 묶기·정렬·출처 블록 |
| `tp_crosscheck.py` · `joback_crosscheck.py` | 시험 기준값 만들기(E:/dev-cache/tp-venv: chemicals·thermo·rdkit) |

## 비상대응 기준(el) · 독성 probit 상수

EPA AEGL 값 페이지(약 270쪽), DOE PAC Rev. 29 엑셀(edms3.energy.gov 가 국외 접속을 끊어 같은 DOE 주소의 Internet Archive 사본),
RIVM probitrelaties 페이지(65쪽)를 `data/portal_raw/el/<source_id>/`(받은 날짜·sha256 은 `manifest.json`)에 두고, CAS 하나에 한 파일을 바로 쓴다
(DB 를 거치지 않는다). ERPG 는 DOE 가 PAC 근거로 다시 실은 값만 "ERPG via DOE PAC" 로 싣고 AIHA 문서 글은 싣지 않는다.

```
python -I -B G:\MSDS\scripts\portal_build\el_fetch.py              # 원본 받기(이어 받기, 처음 약 15분)
python -I -B G:\MSDS\scripts\portal_build\emergency_limits.py      # → E:\dev-cache\chemip-static\out\v1\el\<CAS>.json + index.json (약 10초)
python -I -B G:\MSDS\scripts\portal_build\gen_probit_data.py       # → frontend/public/chemip/calc_toxic_probit_data.jsx (RIVM 상수 62종)
E:/dev-cache/r2-venv/Scripts/python -B G:\MSDS\scripts\static_export\upload_r2_s3.py --src E:/dev-cache/chemip-static/out/v1/el --prefix v1/el --gzip-all
```

| 파일 | 맡는 일 |
|---|---|
| `el_config.py` | 경로·주소·출처 이름과 라이선스 글(한 곳), 출력 형식 번호 |
| `el_fetch.py` | 원본 받기(EPA 목록 → 물질 쪽, DOE 엑셀, RIVM 상태 목록 → 물질 쪽), manifest |
| `el_aegl.py` | EPA 쪽 표 → AEGL-1·2·3 × 5 시간, NR·ND·LEL 별표, 표 아래 주석의 `**`/`***` 값, LEL, TSD 링크 |
| `el_pac.py` | DOE PAC Rev. 29 Table 2(원문 단위·근거)·Table 4(mg/m³)·물질 자료(분자량) → PAC 행, 단계별 근거 계열(AEGL·ERPG·TEEL) |
| `el_rivm.py` | RIVM 쪽 → 현재 probit a·b·n·상태·확정일·근거 문서(관계가 없다고 적힌 쪽은 건너뜀) |
| `emergency_limits.py` | 진입점: 세 출처 → `el/<CAS>.json`·`el/index.json`(형식 CONTRACT.md "el/"), 보고서 `data/portal_raw/el/build_report.json` |
| `gen_probit_data.py` · `probit_names.json` | RIVM 상수 → 계산기 자료 파일, 화면 이름(identifiers 표, 고친 이름은 json) |

## 법령 말뭉치(law_*, 2026-10-31)

ChemIP 가 인용하는 국내 법령·행정규칙의 **현행 본문(조문·항·호·목, 별표 제목·링크)과 연혁**을 법제처 OPEN API 로 받아
`data/portal_facts.db` 의 `law_docs`·`law_articles`·`law_annexes`·`law_history` 에 둔다. 원본 답(OC 값을 가린 것)은
`data/portal_raw/law/`(`manifest.json`: 주소·sha256·받은 시각). 법령·고시 글은 저작권 보호 대상이 아니다(저작권법 제7조), 출처 표시.

```
python -I -B G:\MSDS\scripts\portal_build\law_refs.py [--write]     # 화면·데이터의 law.go.kr 링크 → law_set.json 에 빠진 이름(--write 면 추가)
python -I -B G:\MSDS\scripts\portal_build\law_corpus.py             # 현행 찾기 → 새 판만 본문 받기 → 조문 비교 → 연혁, 처음 약 5분(초당 1건)
     [--only <이름 일부>] [--history: 연혁 전부 다시] [--reparse: 저장한 원본으로 다시 파싱]
```

reg 파이프라인 순서: `reg_diff.py` 다음에 `law_corpus.py` 를 돌린다(둘 다 `reg_changes` 에 덧붙이기만 하고 같은 행은 건너뜀).
현행 판이 바뀐 법령은 이전 판과 조문 단위로 비교해 신설·삭제·개정 조문마다 `reg_changes` 행(source_id `law_go_kr_api`,
list_id = 그 법령·고시를 원문으로 하는 국내 목록, 없으면 비움)을 쓴다. 첫 실행은 기준선(비교 행 없음). 보고서 `data/portal_raw/law/build_report.json`.

| 파일 | 맡는 일 |
|---|---|
| `law_set.json` | 대상 목록(데이터): 이름·kind(law/admrul)·origin(core 핵심 법령군 / referenced 인용)·refs(인용 파일)·list_ids |
| `law_config.py` | 경로·API 주소·요청 간격·쪽 크기·출처 행·스캔 범위. 머리 주석에 쓰는 OPEN API 요청 6종 표 |
| `law_refs.py` | `law.go.kr/<법령\|행정규칙>/<이름>` 링크 찾기(퍼센트 인코딩 포함), law_set.json 과 합치기 |
| `law_api.py` | OPEN API 요청(약 1건/초, `reg_http` 재시도·시간 제한), JSON 풀기, 주소·답·오류 글의 OC 가리기 |
| `law_parse.py` | 순수 함수: 검색 답 → hit, 현행 고르기(이름 완전 일치, 띄어쓰기·가운뎃점 무시), 본문 → 조문·별표, 조문 비교 |
| `law_raw.py` | 원본 보관: `body/<kind>/<serial>`(한 번 받으면 다시 안 받음)·`search/`·`history/` + manifest |
| `law_store.py` | law_* 표 스키마·쓰기, 비교 → reg_changes 행, 표 크기 |
| `law_corpus.py` | 진입점 |

쓰는 요청: 현행 `lawSearch target=law|admrul`, 본문 `lawService target=law(MST)|admrul(ID) type=JSON`,
연혁 `lawSearch target=eflaw nw=1,2,3`(법령, 시행일 단위) / `target=admrul nw=2`(행정규칙). `target=lsHistory` 는 HTML 만 줘서 쓰지 않는다.
연혁은 지금 이름으로 검색해 법령ID 로 거른다 — 이름이 지금 이름을 포함하지 않는 옛 판(제명 변경 전)은 빠질 수 있다.
시험: `python -B -m pytest -q tests/test_law_corpus.py`(녹화한 답 `tests/fixtures/law/`, 네트워크 없음).

### 정적 법령 영역(law/, 2026-10-31)

말뭉치를 R2 `v1/law/` 로 내보낸다 — 국내 법령 보기(`?view=law`)와 물질 화면 「국내 근거 조문」이 집 PC 없이 읽는다.
형식: `scripts/static_export/CONTRACT.md` "law/". `law_corpus.py` 다음에 돌린다.

```
python -B G:\MSDS\scripts\portal_build\law_export.py [--out DIR]     # 약 10초, <out>/law/ 를 비우고 다시 씀(137개, gzip 약 2 MB)
E:/dev-cache/r2-venv/Scripts/python -B G:\MSDS\scripts\static_export\upload_r2_s3.py --src E:\dev-cache\chemip-static\out\v1\law --prefix v1/law --gzip-all
```

| 파일 | 맡는 일 |
|---|---|
| `law_export_config.py` | 출력 경로·파일 이름·CAS 조각 수(64)·언급 찾기 값(최소 글자·제외 낱말·조사)·출처·목록 순서 |
| `law_basis.json` | 근거 표기가 목록 파일에 없는 목록(NCIS 분류·국내 PSM)의 근거 조문(데이터) + 조문에 있어야 할 말(term) |
| `law_export_read.py` | 읽기: 현행 문서·조문·별표·연혁(portal_facts.db), 국내 목록과 물질 행(`reg_lists.py`), 목록별 근거 글 |
| `law_cite.py` | 순수: 근거 글("대기환경보전법 제2조제1호, 같은 법 시행규칙 제2조 및 별표 1") → 문서·조·별표, 현행 본문에 맞추기(호·목 발췌). 말뭉치에 없는 법은 추측하지 않는다 |
| `law_mentions.py` | 순수: 조문 글자에 물질 이름(국내 목록 표기)·CAS 가 한 낱말로 나오는 곳(앞뒤 한글·조사 규칙) |
| `law_export_shape.py` | 순수: DB 행 → index·문서·차례 모양(조문 머리 = 조문내용, 항/호/목) |
| `law_export_build.py` | 순수 조립: 모든 파일 + 보고서, CAS 조각(FNV-1a, 화면과 같은 값) |
| `law_export.py` | 진입점: 읽기 → 조립 → OC 키 검사 → 쓰기 → `data/portal_raw/law/export_report.json` |

시험: `python -B -m pytest -q tests/test_law_export.py`(합성 자료, DB·네트워크 없음), 화면 쪽 `node frontend/scripts/tests/test_law_viewer.cjs`.
