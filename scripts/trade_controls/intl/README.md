# intl — 상대국(수입국) 법령별 화학물질 목록 수집기

한국 수출자 관점에서 상대국(EU·미국·중국·일본)이 물질을 들여올 때(또는 그 나라에서 내보낼 때) 적용하는 목록을
CAS 기준으로 모은다. `intl_regulatory`(EU CLP·Seveso, US EPCRA·CERCLA·CWA·CAA·OSHA·TSCA SNUR, MX·PK·IN·NL·VN,
몬트리올·로테르담·스톡홀름)와 `controlled_lists`(CWC·호주그룹·INCB)에 이미 있는 것은 다시 만들지 않는다.

진입점: `scripts/trade_controls/collect_intl_lists.py`

```
S:\chemip_trade_controls_venv\Scripts\python.exe -I scripts\trade_controls\collect_intl_lists.py [--offline] [--only eu_echa,cn_toxic]
```

- 원본: `S:\chemip_trade_controls_raw\intl\` (echa / eurlex / epa / cn / jp / us)
- 출력: `backend/data/trade_controls/intl_lists/<LIST_ID>.json` (목록 하나당 파일 하나). 백엔드는 폴더를 통째로 읽는다.
- 패키지: `pdfplumber`·`openpyxl`·`olefile` 은 S: venv 에만 설치(`PIP_CACHE_DIR=E:\dev-cache\pip`).
- 종료코드 1 = 어느 목록이든 `validation_problems`(건수 불일치·CAS 체크디지트 오류) 또는 수집 오류.
- 원문 자체의 CAS 오식은 `sources/*.json` 의 `known_source_errors` 에 근거와 함께 적으면 문제 대신 notes 로 간다(값은 고치지 않는다).

| 파일 | 맡는 일 |
|---|---|
| `sources/*.json` | 출처별 다운로드 URL, 목록 메타데이터(제목·방향·한국 수출자 의무·법적 근거·이용조건). 출처 하나 = 파일 하나 |
| `intl_common.py` | 헤더 지정 다운로드, 원본 파일 출처 기록, CAS 토큰 추출, 항목 분리(CAS 있음/없음/체크디지트 오류). CAS 검증·JSON 쓰기는 `controlled_lists/common.py` 재사용 |
| `build.py` | 파서 결과 + 메타데이터 → 출력 JSON, 건수·체크디지트 검증 |
| `pipeline.py` | `sources/*.json` 을 돌며 파서 호출 → 저장 (출처 추가 시 수정 불필요) |
| `parse_echa.py` | ECHA CHEM API: SVHC 후보물질, REACH 부속서 XIV·XVII, POPs 규정 (그룹 구성 물질 포함) |
| `parse_eu_pic.py` | EU PIC 규정 649/2012 통합본(Cellar): 부속서 I 제1·2·3부, 부속서 V |
| `parse_tsca.py` | EPA TSCA Inventory(비CBI), §12(b) 수출통보 목록, §6 위해관리 대상(Inventory R 플래그 + 12(b) §6 행) |
| `parse_cn_hazchem.py` | 중국 危险化学品目录(2015版) .doc(조각 테이블 직접 해석) + 2026年第3号 추가 5종 |
| `parse_cn_toxic.py` | 중국 严格限制的有毒化学品名录(2023年) PDF |
| `parse_cn_precursors.py` | 중국 易制毒化学品 1·2·3류(조례 附表 + 증보 공고). CAS 는 원문·危险化学品目录 명칭·INCB 명칭 대응만(`match_method`) |
| `parse_cn_monitored.py` | 중국 各类监控化学品名录(工业和信息化部令第52号) 1~3류, 4류는 정의 항목(family) |
| `parse_us_dea.py` | 미국 DEA List I/II (eCFR 21 CFR 1310.02). CAS 는 INCB·TSCA Inventory 명칭 대응만 |
| `parse_jp_cscl.py` | 일본 化審法 第一種·第二種特定化学物質, 監視化学物質 (METI 목록 + NITE J-CHECK CAS) |
| `jp_meti_pdf.py` / `jp_jcheck.py` | `parse_jp_cscl.py` 보조: METI 목록 PDF 읽기 / J-CHECK 조회 |
| `parse_jp_poison.py` | 일본 毒物及び劇物取締法 毒物·劇物 (NIHS 毒劇物 검색용 파일; CAS 는 예시) |

## 출력 형식

```
{"list_id","jurisdiction","law","title","directions","obligation_for_kr_exporter","legal_basis","source_url",
 "source_version","retrieved","license","absence_note"?,"entries":[{"cas","name","detail"}],"family_entries":[...],
 "stats":{...},"validation_problems":[...],"notes":[...],"raw_files":[...]}
```

`directions` 는 그 나라 기준이다. `import` = 물품이 그 나라에 들어갈 때(한국 수출 시 확인), `export` = 그 나라에서
나갈 때(한국 수입 시 상대국 수출자 의무). CAS 가 없는 그룹 항목은 `family_entries`(cas "") 로 둔다.
