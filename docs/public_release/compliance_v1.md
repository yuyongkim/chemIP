# ChemIP 공개 배포 전 자료 출처 이용조건 점검 v1 (2026-10-25)

중소기업 대상 공개 배포 전 라이선스 검토(2026-10-25)에서 나온 지적 사항과 코드 조치 결과,
운영자(사장님)가 직접 해야 할 일을 정리했다. 이용조건 문구의 근거는
`frontend/public/chemip/sources_data.jsx` 의 `license`·`note`(2026-10-25 확인)이다.
API 키 값은 이 문서에 적지 않는다. 변수 이름만 쓴다.

## 1. 출처별 표

| 출처 | 이용조건(요지) | ChemIP가 하는 일 | 조치 후 상태 | 운영자 할 일 |
|---|---|---|---|---|
| KOSHA 물질안전보건자료 OpenAPI (data.go.kr 15157612) | 공공데이터포털 이용허락범위 "제한 없음". 제공처 고지: MSDS 작성·검토 참고용, 작성·제공 의무는 제조·수입자 | 물질 검색, MSDS 16개 항목 조회 후 `data/terminology.db` `msds_details` 에 저장 | **기본 경로를 15157612(`apis.data.go.kr/B552468/msdschem1`)로 바꿨다.** 예전 경로(구 `msdschem`, `msds.kosha.or.kr`)는 첫 경로가 실패할 때만 쓰는 대체 경로로 남겼다(`KOSHA_MSDS_ROUTES`). 키 변수: `KOSHA_SERVICE_KEY_DECODED`(같은 키로 동작) | 운영계정 신청(아래 3절). 이용허락이 확인된 경로만 쓰려면 `.env` 에 `KOSHA_MSDS_ROUTES=datagokr` |
| NAVER 뉴스 검색 API | 검색 API 약관 2.1~2.4: "네이버 검색결과" 표시, 가공 없이 독립 노출, 원본 출처·링크 제공. 복사·저장·캐싱(서비스 연속성용 임시 보관 최대 21일 제외)·제3자 제공·AI 입력·학습·수익화 금지 | 시장 탭에서 물질 이름으로 뉴스 검색 | **조치 완료.** API가 NAVER 필드(title·originallink·link·description·pubDate)를 받은 그대로 돌려주고 각 항목에 `source="naver"`, `source_label="네이버 검색결과"` 를 붙인다. 화면은 "네이버 검색결과" 별도 블록에 원문 링크와 함께 보인다(자체 강조 없이 NAVER의 `<b>` 강조만 표시). `/api/trade/news` 의 KOTRA 실패 대체 응답도 `data` 가 아니라 별도 `naver` 블록에 담는다. AI·근거 경로(evidence_collector·report_builder·ai·llm_client)는 NAVER를 쓰지 않는다(테스트로 고정). DB 저장 없음, 메모리 캐시 10분 | 없음. 단 옛 Next.js `/trade` 화면(`frontend/app/trade`)은 소스에서 NAVER 섞기를 뺐지만 **`next build` 를 다시 해야 반영된다**(4절) |
| KIPRIS Plus 특허·실용신안 검색 | 이용약관 제19조 제1항: 원본 정보의 제3자 제공·재판매, 목적 외 복사·가공·전시·배포 금지(서면 허락 시 예외). 허락 게재 시 출처 "한국특허정보원" 명시 | 특허 탭에서 KIPRIS 키워드 검색 결과 목록·연도별·출원인 집계 표시, AI 분석 근거로 상위 3건 사용 | **스위치 추가.** `KIPRIS_PUBLIC_DISPLAY`(기본 true=현행)를 false 로 두면 KIPRIS Plus를 부르지 않고 "KIPRIS에서 보기" 링크(`https://www.kipris.or.kr/khome/search/searchResult.do?queryText=…`)만 보인다. `KIPRIS_IN_AI`(기본 true) 를 false 로 두면 AI 근거에서 KIPRIS를 빼고, KIPRIS 근거가 담긴 AI 캐시도 쓰지 않는다. `/api/patents/policy` 가 현재 설정을 알려 준다. 키 변수: `KIPRIS_API_KEY` | 서면 허락 요청(3절). 허락 전 공개 배포라면 `.env` 에 `KIPRIS_PUBLIC_DISPLAY=false`, `KIPRIS_IN_AI=false` 후 백엔드만 재시작 |
| ECHA CLP 부록 VI 조화 분류 · ECHA CHEM | ECHA Legal Notice 5.1.1: 출처 표시 조건으로 복제·배포 허용. 데이터베이스 전체·상당 부분 복제와 체계적 자동 수집은 사전 서면 허가 없이 금지 | (가) Annex VI 엑셀(`echa_annex_vi_clp.xlsx`)을 `scripts/import_intl_regulatory.py` 로 `intl_regulatory` 에 적재(source='ECHA' 4,197행). (나) `scripts/discover_echa_chemicals.py` 가 ECHA CHEM 검색을 A–Z 시드로 훑어 `chemical_terms` 에 적재(source='ECHA' 80,534행). (다) 물질 상세에서 ECHA CHEM API 실시간 조회 | **이번에는 데이터를 바꾸지 않았다.** 아래 4절의 선택지를 문서로만 남긴다 | 4절 중 하나를 고른다 |
| MFDS 의약품 제품 허가정보 (data.go.kr 15095677) | 이용허락범위 "제한 없음" | 의약품 화면·물질별 의약품 탭 | **08판 우선으로 바꿨다**(`MFDS_APPROVAL_URLS`). 2026-10-25 실측: 목록 조회(`getDrugPrdtPrmsnInq07`·`Inq08`)는 둘 다 HTTP 200·resultCode 00이지만 어떤 검색어(검색어 없음 포함)에도 0건. 상세 조회 `DrugPrdtPrmsnInfoService08/getDrugPrdtPrmsnDtlInq08` 은 "타이레놀" 7건을 돌려준다. 그래서 08 목록 → 08 상세 → 07 목록 순으로 부르고, 오류나 0건이면 다음 주소로 넘어간다. 상세 응답의 큰 문서 필드(`*_DOC_DATA`)는 뺀다. 키 변수: `DRUG_API_KEY_DECODED` | 운영계정 신청(3절) |
| MFDS e약은요 (15075057) | 이용허락범위 "제한 없음" | 물질별 의약품 탭 | 변경 없음(2026-10-25 "타이레놀" 0건 — 별도 확인 필요) | — |
| KOTRA 해외시장뉴스·수입규제 등 (B410001) | 해외시장뉴스·수입규제·무역사기: 공공누리 제4유형(출처표시·상업적 이용금지·변경금지). 국가정보·성공사례: 제1유형. 진출전략·물가: 제한 없음 | 시장 탭, 수출입 탭 | 변경 없음. NAVER 결과와 더 이상 섞이지 않는다 | 서비스가 무료·비상업인지 유지 확인 |
| NCIS·KISChem·PRTR (data.go.kr 15149420·15072442·15024756) | 제한 없음 | 국내 분류, 물질 정보, 취급 사업장 | 변경 없음. 키 변수: `KOSHA_SERVICE_KEY_DECODED`(공용), `PRTR_ACCESS_KEY`, `HAZMAT_FACILITY_API_KEY` | 운영계정 신청(3절) |
| EPA CompTox · NIOSH · openFDA · PubMed · eMARS · CSB · EPA RMP | 퍼블릭 도메인 또는 CC BY 4.0 (출처 표시) | 해외 독성·노출기준·사고 사례 | 변경 없음 | — |

## 2. 코드 변경 요약

| 파일 | 내용 |
|---|---|
| `backend/api/kosha_msds_routes.py` (신규) | KOSHA 경로 정의(datagokr=15157612, datagokr_legacy, kosha_direct)와 조작명(getChemList001 / getChemDetailNN1) |
| `backend/api/kosha_msds_adapter.py` | 설정 순서대로 경로 시도, resultCode 00 아닌 응답은 실패 처리, 실패 경로 5분 쉬기. 예전 msds.kosha.or.kr 소켓 검사 삭제 |
| `backend/api/naver_adapter.py` | NAVER 필드 그대로 + `source`·`source_label`, 메모리 캐시 10분 |
| `backend/api/routes/trade.py` | KOTRA 실패 시 `data=[]` + 별도 `naver` 블록 |
| `backend/api/kipris_policy.py` (신규) | `KIPRIS_PUBLIC_DISPLAY`·`KIPRIS_IN_AI` 판정, KIPRIS 링크, 링크 전용 응답 |
| `backend/api/routes/patents.py` | 링크 전용 모드, `/api/patents/policy`, 응답에 `display_mode`·`kipris_link` |
| `backend/core/evidence_collector.py`, `backend/api/routes/ai.py` | `KIPRIS_IN_AI=false` 이면 KIPRIS 근거 제외, KIPRIS 근거가 든 캐시 무시 |
| `backend/api/mfds_client.py` | 08 → 08 상세 → 07 순 대체 |
| `backend/config/settings.py` | `KOSHA_MSDS_ROUTES`, `KIPRIS_PUBLIC_DISPLAY`, `KIPRIS_IN_AI`, `MFDS_APPROVAL_URLS` |
| `frontend/public/chemip/naver_results.jsx` (신규) | "네이버 검색결과" 블록 |
| `frontend/public/chemip/kipris_link_only.jsx` (신규) | "KIPRIS에서 보기" 링크 전용 표시 |
| `frontend/public/chemip/product_tabs.jsx`, `product_labels.jsx`, `data.jsx`, `sources_data.jsx`, `index.html` | 위 블록 연결, 문구, 자료 출처 화면 주석 |
| `frontend/app/trade/useTradeData.ts` | 옛 Next.js 화면에서 NAVER 결과를 KOTRA 표에 섞던 코드 삭제(재빌드 필요) |
| `.env.example` | 새 설정 이름과 설명 |
| `tests/test_source_compliance.py` (신규), `tests/test_api_smoke.py` | 회귀 테스트 |

## 3. 운영자 할 일

### 3.1 KIPRIS Plus 서면 허락 요청

- 받는 곳: kiprisplus@kipi.or.kr (한국특허정보원 KIPRIS Plus)
- 요청 내용: 무료·비영리 공개 웹서비스(https://chemip.yule.pics/chemip/)에서 KIPRIS Plus 특허·실용신안 키워드 검색 결과(출원번호·발명의 명칭·출원인·출원일·요약 일부)를 이용자 화면에 표시하는 것, 연도별·출원인별 건수 집계를 표시하는 것, 로컬 AI 분석 근거로 상위 3건의 제목·출원인·요약 일부를 쓰는 것에 대한 제19조 제1항 단서의 서면 허락. 출처 "한국특허정보원 KIPRIS Plus" 표시 방식 확인.
- 허락 전 공개 배포: `.env` 에 `KIPRIS_PUBLIC_DISPLAY=false`, `KIPRIS_IN_AI=false` → `pm2 restart T3-ChemIP-Backend`. 화면은 자동으로 링크 전용으로 바뀐다(프론트 재시작 불필요).

### 3.2 data.go.kr 운영계정 신청 목록

개발계정은 트래픽이 작다(KOSHA MSDS 개발계정 2,000건/일). 공개 전 다음 API를 운영계정으로 올린다. 활용사례 등록(`docs/public_release/datagokr_use_case_v1.md`)을 함께 내면 트래픽 상향에 유리하다.

| 데이터셋 | 번호 | 쓰는 키 변수 |
|---|---|---|
| 한국산업안전보건공단 물질안전보건자료 조회 서비스 | 15157612 | `KOSHA_SERVICE_KEY_DECODED` |
| 한국환경공단 화학물질 정보 조회 서비스(NCIS) | 15149420 | `KOSHA_SERVICE_KEY_DECODED` |
| 화학물질안전원 화학물질안전관리정보(KISChem) | 15072442 | `KOSHA_SERVICE_KEY_DECODED` |
| 화학물질 배출 및 이동량 정보(PRTR) | 15024756 | `PRTR_ACCESS_KEY` |
| 식품의약품안전처 의약품 제품 허가정보 | 15095677 | `DRUG_API_KEY_DECODED` |
| 식품의약품안전처 의약품개요정보(e약은요) | 15075057 | `DRUG_API_KEY_DECODED` |
| KOTRA 해외시장뉴스 / 수입규제품목 / 무역사기사례 | 15034831 / 15088467 / 15034754 | `KOTRA_API_KEY_DECODED` |
| KOTRA 국가정보 / 기업성공사례 / 진출전략 / 국가별 물가정보 | 15034830 / 15034755 / 15116867 / 15122665 | `KOTRA_API_KEY_DECODED` |
| 한국산업안전보건공단 국내재해사례 | 15121001 | (사고 사례 적재 스크립트) |

### 3.3 ECHA 자료 — 선택지 (`ECHA_BULK_SOURCES`, 문서상의 결정 항목)

코드에는 아직 스위치를 넣지 않았다. 결정 후 같은 이름(`ECHA_BULK_SOURCES`)으로 설정을 추가한다.

| 선택지 | 내용 | 장단점 |
|---|---|---|
| A. EUR-Lex 원문으로 교체 (권장) | CLP 부록 VI 표 3(조화 분류)은 Regulation (EC) No 1272/2008 및 ATP 개정 규정의 일부로 EUR-Lex에 실린다. EUR-Lex 재사용 조건(Commission Decision 2011/833/EU, CC BY 4.0)으로 쓸 수 있다. `intl_regulatory` 의 source='ECHA' 4,197행을 EUR-Lex 통합본(consolidated text) 표에서 다시 만든다 | 법적 근거가 명확. ATP마다 통합본 갱신을 따라가야 한다 |
| B. ECHA에 허가 요청 | ECHA Legal Notice의 사전 서면 허가 절차(ECHA 문의 양식)로 Annex VI 엑셀 적재·ECHA CHEM 검색 결과 저장을 허가받는다 | 현 구조 유지. 답을 받기까지 시간이 걸린다 |
| C. 대량 적재 중단, 실시간 조회만 | `chemical_terms` 의 source='ECHA' 80,534행(ECHA CHEM 체계적 수집분)과 Annex VI 적재분을 공개 서비스에서 빼고, 물질 상세의 실시간 ECHA 조회(출처 표시)만 남긴다 | 가장 보수적. 검색 범위가 줄어든다 |

특히 `scripts/discover_echa_chemicals.py` 의 A–Z 시드 수집은 Legal Notice가 금지하는 "체계적 자동 수집"에 가깝다. A·B·C 어느 쪽이든 이 스크립트는 다시 돌리지 않는다.

## 4. 남은 일·주의

- 옛 Next.js `/trade` 화면: 소스는 고쳤으나 운영 중인 `next start` 는 이전 빌드를 내보낸다. 라이브 UI(`/chemip/`)에는 영향이 없다. 반영하려면 `frontend` 에서 `npm run build` 후 `pm2 restart T3-ChemIP-Frontend`(빌드 중에는 화면이 깨질 수 있으므로 한가한 시간에).
- KOSHA 대체 경로(datagokr_legacy·kosha_direct)는 기본으로 켜져 있다. 2026-10-25 실측: msds.kosha.or.kr 직접 경로는 HTTP 400, 구 data.go.kr `msdschem` 은 항목 조회만 되고 목록 조회는 폐기(NO_OPENAPI_SERVICE_ERROR).
- MFDS 목록 조회(Inq07·Inq08)가 0건만 돌려주는 현상은 제공처 쪽 문제로 보인다. 상세 조회로 대체 중이다.

## 5. 점검 결과 (2026-10-25)

- `pytest tests -q`: 전부 통과(신규 `tests/test_source_compliance.py` 포함).
- KOSHA 경로 비교(벤젠 001008, 메탄에티올 000047, 에틸벤젠 001089): 새 경로(msdschem1)와 구 경로(msdschem)의 16개 항목 파싱 결과가 3물질 모두 16/16 동일, 항목 수 146 = 146.
- DB 저장: DB에 없던 365342 를 `/api/chemicals/365342` 로 열자 `msds_details` 0행 → 16행.
- 라이브 화면(Playwright): 벤젠 MSDS 16/16 표시, 무역 동향의 "네이버 검색결과" 블록(10건, 원문 링크), 특허 탭 KIPRIS 표(10건), 링크 전용 응답일 때 "KIPRIS에서 보기" 버튼만 표시, 자료 출처 화면 주석 반영. 페이지 오류 없음.
