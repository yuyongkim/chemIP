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
| `intl_xlsx.py` | 공식 .xlsx 읽기 보조(시트 행, 셀 정리, CAS 칸의 공백·소프트하이픈 제거). CA·GB·CH 수집기가 사용 |
| `parse_ca_eccc.py` | 캐나다 ECCC Substances Search 'Export to Excel': DSL·NDSL(등재 여부), CEPA 부속서 1, 특정 독성물질 금지 규정 2025, SNAc, 석면 금지 규정. 공식 건수는 검색 페이지 목록 선택란 |
| `parse_ca_ecl.py` | 캐나다 CEPA 부속서 3 수출통제목록 제1~3부 (Justice Laws 통합 XML) |
| `parse_gb_hse.py` | 영국 HSE: UK REACH 후보물질·부속서 XVII 제한, GB MCL(강제 분류), GB PIC 제1~5부 |
| `parse_ch_fedlex.py` | 스위스 Fedlex 독일어 공식본: PIC-V 부속서 1·2, ChemRRV 부속서 1·2(절별, 본문 속 CAS 포함), ChemV 부속서 3 후보목록 xlsx |
| `parse_tr_kkdik.py` | 튀르키예 KKDİK 부속서 17 제한 + 부속 목록(Ek-I~IX), mevzuat.gov.tr 부속서 묶음(zip 안 .docx) |
| `parse_sa_sfda.py` | 사우디 SFDA 화장품 금지·제한 원료(쪽 나눔 HTML 표 전체). 화장품 한정 |
| `parse_au_aiic.py` | 호주 AICIS 산업화학물질 목록(AIIC) 내려받기 .xlsx(검색 페이지의 다운로드 링크를 매번 읽음). 등재 여부(`absence_note`)·등재 조건 |
| `parse_au_legislation.py` | 호주 연방법령(legislation.gov.au 최신 통합본 HTML): 수입금지규정 1956 부속서 9 유기염소계, 산업화학물질 일반규칙 2019 제6장(로테르담 대상 도입·수출 승인, 수은) |
| `parse_tw_tcscca.py` | 대만 毒性及關注化學物質管理法: 環境部 개방데이터 毒性化學物質(toxic_p_23, 禁止運作事項·許可用途 결합)·關注化學物質(txmg_p_76), 登錄辦法 附表九 기존화학물질 표준등록 106종 |
| `parse_sg_nea.py` | 싱가포르 NEA PCD(HS) 제품코드 목록(EPMA 통제 유해물질, HS·제품코드·CAS) PDF |

## 출력 형식

```
{"list_id","jurisdiction","law","title","directions","obligation_for_kr_exporter","legal_basis","source_url",
 "source_version","retrieved","license","absence_note"?,"entries":[{"cas","name","detail"}],"family_entries":[...],
 "stats":{...},"validation_problems":[...],"notes":[...],"raw_files":[...]}
```

`directions` 는 그 나라 기준이다. `import` = 물품이 그 나라에 들어갈 때(한국 수출 시 확인), `export` = 그 나라에서
나갈 때(한국 수입 시 상대국 수출자 의무). CAS 가 없는 그룹 항목은 `family_entries`(cas "") 로 둔다.

## 아시아·태평양 — 수집하지 않은 목록(2026-10-25 확인)

공식 출처에서 CAS 가 붙은 목록을 내려받을 수 없거나, 이미 다른 데이터에 있는 것. CAS 를 추정하거나 손으로 옮기지 않았다.

| 나라 | 목록 | 사유 | 확인한 URL |
|---|---|---|---|
| AU | Poisons Standard(SUSMP) 부록·Schedule 10 | 물질명만 있고 CAS 가 없다 | https://www.legislation.gov.au (Poisons Standard) |
| AU | 수입금지규정 부속서 11(CWC), 오존·합성온실가스(OPSGGM Act) | CWC 는 `controlled_lists`, 몬트리올은 `intl_regulatory` 에 이미 있음 | https://www.legislation.gov.au/F1996B03651/latest/text |
| AU | AICIS 'international agreements' 안내 페이지 | www.industrialchemicals.gov.au 접속 시간 초과 — 법령 본문(일반규칙 제6장)으로 대신 수집 | https://www.industrialchemicals.gov.au/ |
| TW | 既有化學物質清單(TCSI) 전체 | 化學物質登錄平台 로그인 검색만 제공, 일괄 내려받기 없음 | https://data.gov.tw (MOENV 데이터셋 목록 확인) |
| TW | 勞動部 優先管理化學品·管制性化學品 | 부표가 유해성 분류·물질명만 있고 CAS 없음 | https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=N0060064 , pcode=N0060068 |
| TH | 유해물질법(พ.ร.บ.วัตถุอันตราย พ.ศ. 2535) บัญชีรายชื่อวัตถุอันตราย(DIW 등) | DIW 사이트 Incapsula 차단, 관보(ratchakitcha) Cloudflare 챌린지, data.go.th 403 — 이 서버에서 원문을 받을 수 없음. 또 2556 고시 + 개정 고시 통합본이 공식 배포되지 않음 | https://www.diw.go.th/webdiw/ , https://ratchakitcha.soc.go.th/ , https://data.go.th/ |
| VN | 법령 24/2026 부록 I~IV 외 목록 | 부록 I~IV 는 `intl_regulatory`(VN_DECREE24_*)에 이미 있음. 법령 26/2026 은 법령 24 목록을 인용할 뿐 별도 CAS 부록 없음. 국가화학물질목록은 일괄 공개본 없음 | https://vbpl.moj.gov.vn |
| IN | MSIHC 규칙 1989 부속서 1 제2부(684종) | India Code 통합본(msihc_rules_ameded_upto_date.pdf)은 물질명만 있고 CAS 없음(이 서버에서 indiacode 는 504) | https://www.indiacode.nic.in/ViewFileUploaded?path=AC_CEN_16_18_00011_198629_1517807327582/rulesindividualfile/&file=msihc_rules_ameded_upto_date.pdf |
| IN | DGFT ITC(HS) 수입 제한 화학물질 | HS 코드 기준이며 CAS 대응표가 없음 | https://www.dgft.gov.in |
| MY | DOE MyEHS 'Scheduled EHS'(79건) | 공식 API 로 받을 수 있으나 CAS 가 물질명과 어긋나 있음(예: 'DIOCTYLTIN COMPOUNDS' 84-69-5, 'CADMIUM AND ITS COMPOUNDS' 1163-19-5, 'BENZIDINE…' 71-43-2). 잘못된 일치를 만들 수 있어 쓰지 않음 | https://myehs.doe.gov.my/scheduled-ehs |
| MY | DOSH ICOP 분류 화학물질 목록(Part 1) | www.dosh.gov.my 502 | https://www.dosh.gov.my/ |
| ID | PP 74/2001 부록 I(B3 사용 가능·제한·금지) | BPK 공식 PDF 에 부록이 없음, KLHK SIB3POP 호스트 이름 해석 불가 | https://peraturan.bpk.go.id/Download/42458/PP%20NO%2074%20TH%202001.pdf |
| PH | PICCS, Priority Chemical List, CCO | PICCS 는 로그인 검색만(opms.emb.gov.ph), chemical.emb.gov.ph 403/TLS 오류, emb.gov.ph 403 | https://opms.emb.gov.ph/piccs_search/ , https://chemical.emb.gov.ph/ |
| SG | EPMA 제2부속서 Table 1 | 물질명·제외 기준만 있음 — CAS 는 같은 NEA 의 제품코드 목록으로 수집(원본은 출처 기록으로 보관) | https://www.nea.gov.sg/docs/default-source/hs/hs--table-1-(27022026).pdf |
| SG | 화학무기(금지)법 통제 화학물질 | CWC 는 `controlled_lists` 에 이미 있음. SSO(sso.agc.gov.sg)는 이 서버에서 403 | https://sso.agc.gov.sg/Act/EPMA1999 |

## 아시아·태평양 외 — 수집하지 않은 목록(2026-10-25 확인)

공식 내려받기 파일에 CAS 가 없거나 받을 수 없어 만들지 않은 목록. CAS 를 추정하거나 손으로 옮기지 않는다.

| 국가 | 목록 | 사유 | 확인한 URL |
|---|---|---|---|
| BR | 연방경찰 통제 화학물질(Portaria MJSP 204/2022, 이전 240/2019) 목록 I–VII | 공식 PDF 는 코드·물질명만 있고 CAS 없음(141건). DOU 의 Portaria 204 페이지는 403 | https://www.gov.br/pf/pt-br/assuntos/produtos-quimicos/legislacao/listas.pdf |
| BR | 육군 통제품(PCE, Portaria 118-COLOG/2019 부속서 I) | 표에 CAS 열 없음. DFPC 공식 파일은 연결 끊김 | https://www.dfpc.eb.mil.br/phocadownload/Portarias_EB_COLOG/Portarian118.pdf |
| BR | Lei 15.022/2024 화학물질 인벤토리 | 시행령·우선관리 목록 미공포(초안 의견수렴 단계) | https://www.gov.br/mma |
| MX | CICOPLAFEST·SEMARNAT·Salud 수출입 규제 Acuerdo(DOF 2020-12-26) | 관세 세번(fracción) 기준. CAS 는 일부 품목에만 드문드문(오식 포함) 있어 CAS 목록이 아님 | https://www.dof.gob.mx/nota_detalle.php?codigo=5608827&fecha=26/12/2020 (5608831, 5608830) |
| MX | 화학 전구물질법(Ley Federal para el Control de Precursores Químicos) 제4조 | 물질명만 있고 CAS 없음 | https://www.diputados.gob.mx/LeyesBiblio/ |
| RU/EAEU | EAEU 위원회 결정 제30호 부속서 2 단일 제한품목 목록 | 2.1(오존층)·2.3(유해폐기물)·2.12(마약·전구물질)·2.13(독성물질)은 CAS 없음. 2.30(실험용 POPs, 31행 16 CAS)만 CAS 가 있어 범위가 너무 좁아 보류 | https://eec.eaeunion.org/comission/department/catr/nontariff/Pr2_30.php |
| RU/EAEU | TR EAEU 041/2017 화학물질 등록부 | 기술규정 미시행, 등록부 미구축 | https://eec.eaeunion.org |
| SA | NCEC 화학물질관리법 시행규칙 목록 1–9 | 목록 4–6 은 NCEC 지침으로 미루어져 미공표. ncec.gov.sa 자료실은 동적 로딩으로 파일 없음 | https://ncec.gov.sa |
| GCC | 걸프 통합 금지·제한 화학물질 목록 | 찾지 못함 | — |
| TR | KKDİK SVHC 후보목록 | 공식 내려받기 목록 없음(kkdik.csb.gov.tr 없음, kimyasallar.csb.gov.tr·cygm.csb.gov.tr 접속 불가) | https://kimyasallar.csb.gov.tr/mevzuat/54 |
| TR | PIC 규정(Bazı Zararlı Kimyasalların İhracatı ve İthalatı, RG 28/1/2023 No 32087) 부속서 | 부속서 PDF 가 스캔 이미지(텍스트 층 없음). OCR 결과는 공식 기계판독본이 아니라 쓰지 않음 | https://www.resmigazete.gov.tr/eskiler/2023/01/20230128-1-1.pdf |
| CA | — | DSL·NDSL 의 기밀 물질(CAN, masked name)은 CAS 비공개라 목록에 없음(행 수만 notes 에 기록) | https://pollution-waste.canada.ca/substances-search/ |
