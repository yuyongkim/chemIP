# ChemIP 포털 서비스 조사 v2 — 보유 자료·벤치마크·후보 서비스·로드맵·DB 계획·진행 상태

v1 → v2 (2026-10-31): 1~5장은 v1 그대로 두고, 6장(13개 서비스의 진행 상태)과 7장(다음에 할 만한 것)을 더했다. v1 은 그대로 둔다.

작성 2026-10-30. 목표: ChemIP(https://chemip.yule.pics/chemip)를 화학물질·화학안전·화학공학 분야의 "네이버 같은" 포털로 키운다.
조건: 무료, Cloudflare(Pages + R2 + Worker) 위에서 거의 0원, **집 PC 가 꺼져도 동작**. 정적 자료는 R2 `/data/v1/<영역>`, 집 PC `/api` 는 보조.
1단계(이 문서와 같은 날): 통합 검색 v1 을 만들었다 — `?view=search&q=`(링크 규약 `docs/integration/LINK_CONTRACT_v5.md`), 화면 `frontend/public/chemip/usearch_*.jsx`.

## 1. 보유 자료

개수는 2026-10-30 에 DB 를 직접 세거나 업로드 기록으로 확인한 값이다. "PC-off" = 정적 파일(Pages·R2) 또는 화면 코드 안에 있어 집 PC 없이 동작.

### 1.1 정적 영역(이미 R2·Pages 에 있음, PC-off 가능)

| 영역 | 내용 | 개수 | 형식 |
|---|---|---|---|
| `search/` (Pages) | 물질 검색 색인(FTS5 흉내·별칭·미리 계산한 답) | 117,744 물질 행, 별칭·검색어 키 877,758 | `scripts/static_export/CONTRACT.md` |
| `p/<chem_id>.json` | 물질 상세(MSDS 16항)·수출입·국가별 규제·통합허가 사례 | 166,702 (KOSHA 13,448 · CAS 117,738 · MSDS 전용 35,516) | gzip JSON |
| `p/<chem_id>.x.json` | 안전 가이드 추천·취급 사업장(PRTR)·사고 사례·EPA 집행 | 166,702 | gzip JSON |
| `g/` | rulebook·trade_common·permit_common·trade_catalog·guides_status (+ 이번에 만든 guide_index) | 5 (+1) | gzip JSON |
| `tx/<CAS>.json` | 텍사스 TCEQ 배출사고 | 459 CAS | gzip JSON |
| `pv/<CAS>.json` | 근거 조문(EPC 법령 본문 검색 미리 받은 답) | 413 CAS, 답 1,458 | gzip JSON |
| `pat/<CAS>/` | 물질 → 특허 매핑(Lens.org 공개 특허) | 19,695 물질, 20.0M 건, 202,062 파일 | gzip JSON |

### 1.2 화면 코드 안의 자료(PC-off)

| 자료 | 개수 | 위치 |
|---|---|---|
| 공학 계산기 | 29개(묶음 6) | `frontend/public/chemip/calc_registry.jsx` `CALC_REGISTRY` |
| 계산기 용어 설명 | 107개(한·영) | `term_glossary.jsx` · `term_glossary_en.jsx` |
| 자료원·규제 약어 | 19개 | `data.jsx` `GLOSSARY_KO` · `data_en.jsx` |
| MSDS 16개 항목 이름 | 16 | `data.jsx` `MSDS_SECTIONS` |
| 나라·기구 이름 | — | `intl_regions.jsx` `INTL_JURISDICTIONS` |

### 1.3 집 PC 전용(원본 DB·서비스)

| 자료 | 위치 | 개수 | 비고 |
|---|---|---|---|
| `terminology.db` | `G:\MSDS\data` (2.57 GB) | msds_details 769,865 · chemical_aliases 495,809 · chemical_terms 117,744 · msds_english 56,176 · drug_mappings 48,619 · kreach_chemicals 47,344 · ncis_substance 42,088 · regulatory_cache 36,747 · intl_regulatory 12,496 · kischem_safety 7,189 · niosh_cache 73 | 메인 DB. MSDS 원문은 KOSHA XML(항목 코드 붙음, 아래 4.2) |
| 특허 옛 색인 | `global_patent_index.db` 144 GB(약 3.5억 행), `uspto_index.db` 6.3 GB(약 1,500만 행) | — | 쓰지 않음(정적 `pat/` 로 대체) |
| EPA ECHO 색인 | `echo_cas_index.db` | 사건 14,734 · CAS 연결 21,970 | 공공 자료 |
| TCEQ 사고 색인 | `tceq_event_cas_index.db` | 사고 4,730 · CAS 연결 49,299 | 공공 자료 |
| 통합허가 사례 | `kr_permit_context.db` | IEPS 검토결과서 1,315건 기반 | 공개 자료 |
| PRTR 사업장 | `prtr/prtr_facilities.sqlite` | 사업장 3,744 · 배출 9,661 | 환경부 PRTR |
| PubChem 캐시 | `pubchem_cache\` (1.4 GB) | CAS→CID 74,494 · GHS 52,705 · CID-Synonym·LCSS 원본 | PubChem(NCBI, 제한 없음) |
| Chem_Eng 사고 DB | `C:\Users\USER\Desktop\Chem_Eng\Chem_Eng\data\incidents.db` | 사고 10,354 · 원인 19,061 · 권고 9,024 · 물질 연결 14,224 | RMP 7,291(PD)·eMARS 1,254(CC BY 4.0)·NICS 1,142·KOSHA 528·CSB 139(PD). 물질별 요약은 `p/*.x.json` 에 있음 |
| EPC 조문 검색 | `127.0.0.1:15412` | — | 정적은 `pv/` 413 CAS 만 |
| KOSHA 기술지침 | `C:\Users\USER\Desktop\EPC engineering\datasets\kosha_guide` | 목록 1,039 · 본문 1,037(586 MB) | 목록은 이번에 `g/guide_index.json` 으로 내보냄(26 KB gzip) |
| Environment ECHO·IEPS·CleanSYS 가공본 | `...\Environment_1\data` | limits 116,983 · permits 1,315 · cleansys 8,259 | 물질별 결과는 `p/` 에 있음 |

## 2. 벤치마크

라이선스 판정은 각 사이트 이용약관·공공데이터포털 표기 기준이다. **[미확인]** 은 원문 페이지가 막혀(403·봇 차단) 2차 자료로 판단한 것이다. 수집 전에 다시 확인한다.

| 포털 | 주는 것 | 자료 재사용 | ChemIP 가 배울 점 |
|---|---|---|---|
| PubChem (NIH) | 물질·구조·물성, LCSS 안전 요약(GHS·NIOSH·ERG 모음), 특허 연결, 칸마다 출처 표시, REST API, FTP 대량 내려받기 | NCBI 정책상 제한 없음. 다만 제3자 기여 부분은 출처별 확인 | 칸마다 출처·날짜 배지(여러 라이선스를 섞어도 신뢰가 생김) |
| ChemSpider (RSC) | 구조 검색·정리된 동의어 | API 키 필요, 대량 저장 제한 | 가져오지 않고 링크만 |
| NCIS·K-REACH (국립환경과학원·화학물질안전원) | CAS·국문/영문명·KE 번호로 규제 분류, 등록·유해성 심사 공고, PRTR | data.go.kr API(공공누리 1유형 또는 제한 없음, 데이터셋마다 확인) | 국내 규제 분류의 정본 — 이미 일부 사용 |
| KOSHA MSDS | 16개 항목 MSDS, 이름·CAS·UN·KE 번호 검색 | data.go.kr "이용허락범위 제한 없음". 참고용 고지 필요 | 항목 코드가 붙은 구조 자료라 물성·운송·노출기준을 뽑아 쓸 수 있다(4.2) |
| CAMEO Chemicals (NOAA·EPA) | 물질 자료표 약 5,000종, 반응성 그룹, "MyChemicals" 혼합 반응성 예측, ERG 연결, 오프라인 앱 | 미 연방 저작물이지만 대량 내려받기 없음, 자료 변경 금지 문구 | 반응성 그룹 개념과 짝 비교 화면. 자료는 직접 만든다 |
| Chemical Reactivity Worksheet (CRW 4, CCPS) | 반응성 그룹 68개·물질 약 6,000·혼합 결과표 | CCPS/AIChE 약관 — 프로그램은 무료, 자료 추출은 불가 | 같은 방식(ASTM E2012)을 공개 규칙으로 다시 만든다 |
| NIOSH Pocket Guide | 약 677종의 REL·PEL·IDLH·보호구·혼촉 금지 물질·응급조치 | 미 연방 저작물(공공 영역) | 노출기준 비교·혼촉 문구의 공개 출처 |
| ECHA CHEM | REACH 등록 서류, C&L 목록, CLP 부속서 VI 조화 분류, SVHC 후보 목록(약 253종) | 출처 표시 조건. 서류 대량 복제는 저작권·DB 권리 [영문 약관 미확인] | 부속서 VI·SVHC 목록은 출처 표시하고 사용, 변경 감시(연 2회) |
| 위키백과 chembox / Wikidata | 물질 정보 상자, 식별자 | 위키백과 CC BY-SA 4.0. **Wikidata 는 CC0**: CAS(P231)·EC(P232)·UN(P695)·InChIKey·한/영/일/중 이름 | 식별자 변환기의 무료 바탕(SPARQL·덤프) |
| 네이버 지식백과(화학백과·두산백과) | 한 검색창 → 여러 백과 묶음, 위에 짧은 정의, 관련 용어 링크 | 사용 허락 받은 유료 콘텐츠 — **가져오지 않는다** | 화면 방식만: 묶음별 결과·정의 카드·"더 보기" (통합 검색 v1 에 반영) |

부수 출처(후보 서비스용)

| 필요 | 출처 | 판정 |
|---|---|---|
| UN 번호·ERG | PHMSA ERG 2024 | 미 연방 자료이나 캐나다·멕시코 공동 발간분 저작권 가능 [미확인]. 자료 파일은 요청 시 제공 |
| 노출기준(한국) | 고용노동부 고시 「화학물질 및 물리적 인자의 노출기준」 별표1 | 고시는 저작권 보호 대상 아님(저작권법 §7). 법제처 행정규칙 API |
| 노출기준(미국) | OSHA PEL(Z 표), NIOSH REL | 공공 영역 |
| 노출기준(미국 ACGIH TLV) | ACGIH | **저작권** — 값 저장 금지, 이름·링크만 |
| 노출기준(국제 모음) | GESTIS-ILV (IFA/DGUV) | **재게시·수집 금지** — 링크만 |
| 혼합물 GHS 분류 | GHS Rev.10·CLP 부속서 I 의 가산식(ATEmix)·합산법 | 식은 공개. 도구는 직접 만든다 |
| 화학사고 소식 | CSB RSS(공공), Google News RSS | CSB 는 사용 가능. Google News 는 개인 용도 약관 — 제목·링크만 |
| 규제 변경 | 법제처 OPEN API(OC 키, 무료), Federal Register API(공공, 키 없음), ECHA 후보 목록(출처 표시) | 모두 사용 가능 |

## 3. 후보 서비스

노력: S(하루 안팎) · M(며칠) · L(한두 주 이상). "정적" = 미리 만든 파일 + 브라우저 계산으로 PC-off 동작. "새 DB" = 지금 DB 에 없는 표를 새로 만들어야 함(4장).

| # | 서비스 | 사용자 가치 | 자료·라이선스 | 정적 | 노력 | 새 DB |
|---|---|---|---|---|---|---|
| 1 | **통합 검색** (v1 완료) | 물질·계산기·용어·MSDS 항목·기술지침·화면을 한 검색창에서. 포털의 입구 | 기존 색인·화면 자료, KOSHA 지침 목록(공공) | 예 | (완료) M | 아니오(지침 목록 파일 하나 추가) |
| 2 | **물성 답 카드** ("벤젠 인화점" → -11 °C, 출처 ICSC) | 네이버식 "바로 답". 실무자 질문의 대부분이 물성 한 값 | KOSHA MSDS 9항 항목 코드(I10 끓는점·I12 인화점·I18 폭발 범위·I32 자연발화·I36 분자량 …, 48,964 물질에 9항 있음). 제한 없음 | 예 | M | 예: `properties` |
| 3 | **식별자 변환기** (CAS ↔ 이름 ↔ EC ↔ UN ↔ KE ↔ InChIKey) | 서류·통관·SDS 작성 때 번호 맞추기. 검색창에 EC·UN·KE 번호를 넣어도 물질로 | 기존 별칭 495,809 + Wikidata(CC0) + PubChem CAS→CID 74,494 + NCIS KE 번호 | 예 | M | 예: `identifiers` (검색 동의어 파일에 더하면 검색은 바로 됨) |
| 4 | **UN 번호·운송 조회** (UN → 물질·운송 위험 등급·용기 등급·해양오염·EmS, ERG 지침 번호) | 운송·물류 담당자. 사고 초동 대응 | KOSHA MSDS 14항(N02 UN 번호·N04 등급·N06 용기 등급·N08 해양오염·N10 EmS), ERG(확인 후) | 예 | M | 예: `transport` |
| 5 | **국가별 노출기준 비교** (한국 고시·OSHA PEL·NIOSH REL·IDLH·EU IOELV) | 다국적 사업장·수출 업무, 산업위생 | 고용노동부 고시(저작권 없음)·MSDS 8항 H0202(국내 기준)·NIOSH(공공)·EU 지침. ACGIH·GESTIS 는 값 없이 링크 | 예 | M | 예: `oel` |
| 6 | **규제 목록 탐색 + 변경 알림(RSS)** | "이 법에 걸린 물질 목록", "지난달 새로 지정된 물질". 카테고리형 포털 탐색 | 이미 있는 `g/rulebook.json`·`trade_catalog`(목록 정의)·`p/` 의 목록 등재. 변경은 내보내기 사이 차이 + 법제처·Federal Register·ECHA | 예(Worker 정기 실행 또는 집 PC 내보내기) | M | 예: `reg_changes`(추가만) |
| 7 | **저장 혼촉 매트릭스** (두 물질 이상 → 같이 두면 위험한 짝) | 창고·실험실 저장 배치. 국내 포털에 없음 | 직접 만든 반응성 분류(공개 규칙: 위험물안전관리법 유별 혼재 기준·UN 격리표·GHS 분류) + NIOSH "혼촉 금지 물질" 글. CRW·CAMEO 자료는 가져오지 않는다 | 예 | L | 예: `reactive_class`, `class_pair_rules` |
| 8 | **혼합물 GHS 분류 도우미** (성분·함량 → 혼합물 분류·그림문자) | MSDS 작성 중소기업. 유료 도구 대체 | GHS 식(공개) + 성분 분류: MSDS 2항·ECHA 부속서 VI(출처 표시)·NCIS | 예(브라우저 계산) | L | 작음: 부속서 VI 특정 농도 한계 표 |
| 9 | **화학사고 소식 모음** | 최근 사고를 물질·설비별로. 사고 사례 패널과 이어짐 | Chem_Eng 사고 DB(10,354, 출처별 라이선스 표시)·CSB RSS(공공)·뉴스는 제목·링크만 | 예(Worker 정기 수집 → R2) | M | 예: `feed_items` |
| 10 | **시험 대비 용어집** (화공안전기술사·산업위생관리기사·위험물산업기사) | 학생·수험생 유입. 검색 노출(SEO) | 기존 용어 126개(107+19) + 직접 쓴 정의 + 법령 정의(저작권 없음) | 예 | S–M(내용 작업) | 작음: `glossary` |
| 11 | GHS 라벨 만들기 | MSDS 2항 → 인쇄용 경고 표지 | MSDS 2항(그림문자·신호어·H/P 문구) | 예 | M | 아니오 |
| 12 | KOSHA 기술지침 본문 검색 | 지침 1,037건 본문에서 찾기 | KOSHA 지침(공공) | 예(별도 FTS 색인, search/ 와 같은 방식) | M | 아니오(색인 파일) |
| 13 | 취급 사업장·배출량 지도 | 지역별 PRTR 사업장 | PRTR(환경부) | 예 | M | 아니오 |

넣지 않는 것: ChemSpider·GESTIS·ACGIH 값·네이버/두산 내용·CRW DB 추출·ECHA 등록 서류 대량 복제(2장 판정).

## 4. 순위·로드맵·DB 계획

### 4.1 순위

기준: 사용자 가치 × PC-off 가능 × 이미 가진 자료로 되는 정도 ÷ 노력. 라이선스 위험이 있으면 내린다.

1. **통합 검색** — 완료(v1). 다음은 2·3 을 묶음(provider)으로 붙여 "바로 답"을 주는 v2.
2. **물성 답 카드** — 자료가 이미 DB 에 있고(KOSHA 9항 코드), 통합 검색의 체감 품질을 가장 크게 올린다.
3. **식별자 변환기** — 검색 동의어 파일(`backend/data/search/synonyms.jsonl`)에 EC·UN·KE 를 더하면 검색은 다시 내보내기만으로 된다. 별도 화면은 그 뒤.
4. **UN 번호·운송 조회** — 2 와 같은 파이프라인(MSDS 14항). ERG 지침 번호는 PHMSA 자료 파일·재사용 조건 확인 뒤.
5. **국가별 노출기준 비교** — 한국 고시 + 미국 공공 자료만으로도 쓸모 있다. ACGIH 는 칸 이름과 링크만.
6. 규제 목록 탐색 + 변경 RSS → 7. 저장 혼촉 매트릭스 → 8. 혼합물 GHS 도우미 → 9. 사고 소식 → 10. 용어집(내용 작업은 병행 가능).

### 4.2 로드맵

| 단계 | 내용 | 결과물 |
|---|---|---|
| 0 (완료) | 통합 검색 v1, KOSHA 지침 목록 정적화 | `usearch_*.jsx`, `g/guide_index.json`, 링크 규약 v5 |
| 1 | `portal_facts.db` 1차(properties·identifiers·transport) + 정적 `f/<CAS>.json` | 물성 답 카드·UN 조회 묶음(통합 검색 provider 2개), 물질 상세 머리에 "주요 물성" |
| 2 | identifiers → 검색 동의어(EC·UN·KE·InChIKey), Wikidata CC0 보강 | 검색창에 어떤 번호를 넣어도 물질로 |
| 3 | oel 표(한국 고시 별표1 파싱 + NIOSH/OSHA) | 노출기준 비교 표(물질 상세 탭 1개 + 통합 검색 답) |
| 4 | reg_changes(내보내기 차이 + 법제처·Federal Register·ECHA) | 규제 목록 화면, `feed/changes.xml`(RSS) |
| 5 | reactive_class·class_pair_rules, 혼합물 GHS 표 | 혼촉 매트릭스 계산기, 혼합물 분류 계산기(계산기 등록 목록에 한 줄씩) |

### 4.3 DB 계획 — `portal_facts.db` → 정적 내보내기

원칙: 지금 방식 그대로. 원본 DB 는 읽기 전용(`mode=ro`)으로 열고, 새 DB 는 `G:\MSDS\data\portal_facts.db` 하나에 만든다.
정적 파일은 `scripts/static_export/` 의 새 단계로 쓰고, 형식은 `CONTRACT.md` 에 덧붙인다(추가만, 뿌리 `v1/` 그대로).

**스키마(SQLite)**

```sql
-- 출처 한 곳: 모든 행이 source_id 로 가리킨다(화면의 출처 배지·라이선스 표시)
CREATE TABLE sources (source_id TEXT PRIMARY KEY, name TEXT, url TEXT, license TEXT, retrieved_at TEXT);

CREATE TABLE identifiers (          -- CAS ↔ 다른 번호·이름
  cas TEXT NOT NULL, id_type TEXT NOT NULL,   -- ec | un | ke | inchikey | pubchem_cid | wikidata | kosha_id | name_ko | name_en
  value TEXT NOT NULL, source_id TEXT NOT NULL,
  PRIMARY KEY (cas, id_type, value));
CREATE INDEX identifiers_value ON identifiers (id_type, value);

CREATE TABLE properties (           -- MSDS 9항 등 물성 한 값
  cas TEXT NOT NULL, prop TEXT NOT NULL,      -- flash_point | boiling_point | melting_point | vapor_pressure | density | relative_density
                                              -- | solubility | autoignition | lfl | ufl | molar_mass | ph | viscosity | log_kow
  value_text TEXT NOT NULL,                   -- 원문 그대로(예: "-11 ℃")
  value_num REAL, unit TEXT, condition TEXT,  -- 읽을 수 있을 때만 숫자·SI 단위·조건(20 ℃ 등)
  origin TEXT,                                -- 원문이 적은 1차 출처(ICSC·ECHA·HSDB …)
  chem_id TEXT, source_id TEXT NOT NULL,      -- 어느 MSDS 에서(KOSHA chem_id)
  PRIMARY KEY (cas, prop, chem_id));

CREATE TABLE transport (            -- MSDS 14항 + ERG
  cas TEXT NOT NULL, un_number TEXT, proper_name TEXT, hazard_class TEXT, packing_group TEXT,
  marine_pollutant TEXT, ems TEXT, erg_guide TEXT, chem_id TEXT, source_id TEXT NOT NULL);
CREATE INDEX transport_un ON transport (un_number);

CREATE TABLE oel (                  -- 노출기준
  cas TEXT NOT NULL, jurisdiction TEXT NOT NULL,  -- KR | US-OSHA | US-NIOSH | EU …  (INTL_JURISDICTIONS 키)
  kind TEXT NOT NULL,                             -- TWA | STEL | C | IDLH
  value REAL, unit TEXT, notation TEXT,           -- 피부·발암성 표시 등
  as_of TEXT, source_id TEXT NOT NULL);

CREATE TABLE reg_changes (          -- 규제 변경 기록(추가만)
  changed_on TEXT NOT NULL, jurisdiction TEXT, list_id TEXT, cas TEXT,
  change TEXT NOT NULL,             -- added | removed | modified
  detail TEXT, source_url TEXT, source_id TEXT NOT NULL);

CREATE TABLE reactive_class (cas TEXT NOT NULL, system TEXT NOT NULL, class_code TEXT NOT NULL, basis TEXT, source_id TEXT NOT NULL);
CREATE TABLE class_pair_rules (system TEXT, class_a TEXT, class_b TEXT, outcome TEXT, note TEXT, source_id TEXT NOT NULL);
```

**만드는 과정**

| 단계 | 스크립트(새로) | 입력 | 출력 |
|---|---|---|---|
| 1 | `scripts/portal_build/msds_facts.py` | `terminology.db` `msds_details` 9·14·8항 XML(항목 코드: 9항 I10·I12·I18·I20·I22·I26·I32·I36, 14항 N02·N04·N06·N08·N10, 8항 H0202) | properties·transport·oel(KR) |
| 2 | `scripts/portal_build/identifiers.py` | `chemical_aliases`·`ncis_substance`(KE)·`pubchem_cache/cas_cid_map.json`·Wikidata SPARQL 덤프(CC0, 파일로 받아 둠) | identifiers |
| 3 | `scripts/portal_build/oel_public.py` | 고용노동부 고시 별표1(법제처 행정규칙 API)·NIOSH NPG·OSHA Z 표 | oel |
| 4 | `scripts/portal_build/reg_diff.py` | 이전·현재 내보내기의 `g/rulebook.json`·`p/` 목록 등재 + 법제처·Federal Register·ECHA | reg_changes |
| 5 | `scripts/static_export/portal_facts.py` (run_all 단계 `facts_portal`) | `portal_facts.db` (읽기 전용) | `v1/f/<CAS>.json`(gzip: identifiers·properties·transport·oel 한 덩어리, 물질 상세 1회 요청), `v1/g/un_index.json`(UN → CAS 목록), `v1/g/reg_lists.json`, `v1/feed/changes.json`·`changes.xml` |

- Worker 는 `cloudflare/worker/src/config.js` `STATIC_DATA.AREAS` 에 `"f"`(와 `"feed"`)만 더하면 된다(지금 `["p","g","tx","pv"]`). Pages `_routes.json` 포함 목록도 같이.
- 화면은 `api_static_extras.jsx` 에 `staticFacts(cas)` 하나, 통합 검색에는 `usearch_provider_facts.jsx`(물질 이름 + 물성 낱말 → 답 카드)·`usearch_provider_transport.jsx`(UN 번호 → 물질) 파일 하나씩 + 등록 한 줄.
- 크기 예상: 9항이 있는 물질 48,964종 × 1–2 KB(gzip) ≈ 50–100 MB. 지금 `p/`(0.96 GB gzip) 의 1/10 수준이라 R2 무료 한도 안.
- 갱신: KOSHA MSDS·고시가 바뀌면 1·3 단계만 다시, 차이는 4 단계가 `reg_changes` 로 남긴다. 업로드는 `upload_r2_s3.py`(이어 올리기).

## 5. 이번에 만든 것(통합 검색 v1)

- 주소 `?view=search&q=`(규약 `docs/integration/LINK_CONTRACT_v5.md`). 처음 화면 검색창·상단 바 검색창이 연다. `?q=` 줄임형과 물질 검색(`pv=search`)은 그대로.
- 묶음 6개(등록 `usearch_providers.jsx`): 화학물질(기존 정적 검색) · 공학 계산기 29 · 용어 126 · MSDS 항목 16 · KOSHA 기술지침 1,039 · 화면 바로가기 11.
- PC-off: 물질(정적 색인)·지침(`g/guide_index.json`)·나머지(화면 안 자료) 모두 동작. 지침 목록 파일이 없거나 정적 자료가 꺼져 있으면 집 PC `/api/guides/search`.
- 시험: `frontend/scripts/tests/test_unified_search.cjs`(68개), 브라우저 확인 1440·390 × ko·en × PC 사이트·PC-off 모드.

## 6. 진행 상태 (2026-10-31)

같은 날 포털 서비스를 다섯 에이전트(P1~P5)와 확장 담당이 나눠 만들었다. 아래는 이 문서를 쓴 시점(P5 작업 끝)에 **디스크에 있는 산출물**
(`scripts/static_export/CONTRACT.md` 의 새 절, `E:\dev-cache\chemip-static\out\reports\<단계>.json`, R2 업로드 기록
`reports\r2_s3_uploaded_v1_<영역>.txt`, `frontend/public/chemip` 파일·등록 줄)을 직접 보고 적었다. 다른 에이전트가 아직 일하는 중이라
그 뒤에 바뀐 것은 반영되지 않았을 수 있다. 수치는 각 단계 보고서 값이다.

**배포:** 새 정적 영역은 Worker `STATIC_DATA.AREAS`(`cloudflare/worker/src/config.js`)와 Pages `_routes.json`
(`deploy/cloudflare/site_rules.mjs` `FUNCTION_ROUTES`)에 등록돼 있지만 **Worker·Pages 를 다시 배포해야** 운영 주소에서 열린다.
그 전까지 운영 화면은 각 영역이 없을 때의 대체 경로(이전 정적 파일 또는 집 PC `/api`)로 동작한다. 화면 코드도 `build_chemip.cjs` 결과를 Pages 로 다시 올려야 한다.

| # | 서비스 | 상태 | 정적 영역 · 규모 | 화면·통합 검색 | 담당 |
|---|---|---|---|---|---|
| 1 | 통합 검색 | 완료(v1) → 묶음 13개로 확장 | `search/`(Pages) | `?view=search&q=`, 묶음: 물질·계산기·용어·MSDS·기술지침·규제 목록·PRTR·식별자·UN 운송·노출기준·경고표지·사고 소식·화면 | (기존) |
| 2 | 물성 답 카드 | 만듦 | `f/<CAS>.json` 17,685 CAS(물성 17,416), gzip 17.3 MB, `portal_facts.db` | 통합 검색 답 카드 `usearch_answer_facts.jsx`, 물질 머리 `product_facts_strip.jsx` | P1 |
| 3 | 식별자 변환기 | 만듦 | `f/id_<n>.json` 128 묶음(키 51,871) | 묶음 `USP_IDENTIFIERS` | P1 |
| 4 | UN 번호·운송 | 만듦 | `g/un_index.json`(UN 1,364), 운송 7,821 CAS(`f/`) | 묶음 `USP_TRANSPORT` | P1 |
| 5 | 노출기준 비교 | 만듦 | `oel/<CAS>.json` 2,822, `g/oel_summary.json`(KR 2,757 · US 620 · EU 163 CAS). ACGIH·GESTIS 는 링크만 | 물질 화면 노출기준 패널, 묶음 `USP_OEL` | P2 |
| 6 | 규제 목록 + 변경 알림 | 만듦 | `reg/` 목록 142개(파일 234, 행 285,775), 변경 289건, RSS 60건 | `?view=reg&list=<id>`, 묶음 `USP_REGLISTS` | P3 |
| 7 | 저장 혼촉 매트릭스 | 진행 중(이 시점에 화면 등록 전) | `safety_tools` 단계: 반응성 분류 8,822 물질 | `compat_*.jsx` 파일 있음, `index.html` 등록 전 | P4 |
| 8 | 혼합물 GHS 분류 | 진행 중(이 시점에 화면 등록 전) | `safety_tools` 단계: CLP 부속서 VI 4,178 행 | `mixghs_*.jsx` 파일 있음, `index.html` 등록 전 | P4 |
| 9 | 화학사고 소식 | 만듦 | `feed/latest.json` + `feed/by-cas/` 525 CAS, 10,618건(RMP 7,291·eMARS 1,254·NICS 1,142·KOSHA 528·CSB 139·CSB RSS 20·뉴스 제목·링크 244) | `?view=feed`, 묶음 `USP_FEED`. 설명 `docs/portal/INCIDENT_FEED_v1.md` | P3 |
| 10 | **용어사전(시험 대비)** | **만듦** | 화면 안 자료(정적 파일 없음, PC 와 무관) | `?view=glossary&term=<key>&cat=`, 묶음 `USP_TERMS` 가 용어사전 전체로, 계산기 "?" 용어 설명에서 "용어사전에서 보기" | P5 |
| 11 | GHS 경고표지 | 만듦 | 물질 파일의 MSDS 2항 | `?view=ghslabel&chem=<chem_id>`, 묶음 `USP_GHS_LABEL` | P4 |
| 12 | **KOSHA 기술지침 본문 검색** | **만듦** | `gs/` 지침 1,037건(두 글자 조각 139,488개, 조각 512 파일 4.5 MB + 본문 9.7 MB gzip), R2 업로드 1,550개 | 통합 검색 "KOSHA 안전보건 기술지침" 묶음이 제목 + 본문(쪽·발췌) | P5 |
| 13 | 취급 사업장·배출량 지도 | 만듦 | `prtr/` 199 물질(사업장 행 9,661, 사업장 3,043, 17개 시도·176 시군구, 2024년) | `?view=prtr&cas=<CAS>`, 묶음 `USP_PRTR` | 지도 담당 |
| + | 관련 물질 | 만듦 | `rel/<CAS>.json` 9,455(같은 법령 목록·같은 GHS 분류·같은 계열) | 물질 화면 관련 물질 절 | 확장 담당 |
| + | 오늘의 물질·자주 찾는 물질 | 만듦 | 처음 화면 자료 | 처음 화면 `LandingDiscover` | 확장 담당 |

R2 업로드 기록(이 시점, 파일 수): `gs` 1,550 · `reg` 237 · `feed` 526 · `prtr` 200 · `rel` 9,455 · `g` 6. `f/`·`oel/` 은 업로드 기록이 아직 없다(담당 에이전트 확인 필요).

### 6.1 용어사전(10) — P5

- **항목 613개**: 새로 쓴 분류 자료 487개(공정안전 49·화재·폭발 51·산업위생 68·독성·환경 37·화학물질 규제·GHS 58·위험물 62·단위조작 47·열역학·반응 47·유체·열전달 33·공정제어 35)
  + 기존 계산기 용어 107개 + 자료원·규제 약어 19개. 계산기 용어는 쓰는 계산기 묶음으로 분류에 들어간다(화면 분류별 수: 공정안전 66·화재·폭발 60·산업위생 81·독성·환경 42·규제·GHS 58·위험물 62·단위조작 56·열역학·반응 70·유체·열전달 64·공정제어 35·약어 19).
- 시험 표시: 화공안전기술사 225 · 산업위생관리기사 132 · 위험물산업기사 114 · 화공기사 177 항목.
- **근거 조문 118개**: 산업안전보건법(제36조 위험성평가, 제44조 공정안전보고서, 제106조 허용기준, 제110·112·115조 MSDS·대체자료·경고표지 등), 화학물질관리법·화평법, 위험물안전관리법·시행령 별표 1~3·시행규칙 별표,
  「산업안전보건기준에 관한 규칙」 제618조(적정공기) 등. 법령은 저작권 보호 대상이 아니다(저작권법 제7조). 조 단위까지만 적고, 확실하지 않은 항·호는 적지 않았다. 링크는 국가법령정보센터(law.go.kr, ASCII 로 인코딩한 주소).
- 정의는 직접 쓴 글이다(교재·KOSHA·ECHA 문장을 옮기지 않음). 표준·교재를 바탕으로 한 항목은 `ref` 에 이름만 적었다(IEC 60079, NFPA 77, ASTM D93, Seborg, McCabe 등).
- 2025-08-07 시행 화학물질관리법 개정(유독물질 → 인체급성·인체만성·생태유해성물질)을 반영했고, 옛 이름 `유독물질`은 "(개정 전 용어)"로 남겼다. **법령 문구는 현행 원문으로 한 번 더 확인할 것.**
- **IUPAC Gold Book 링크는 넣지 않았다**: goldbook.iupac.org 가 자동 확인 요청을 막아(HTTP 403·Cloudflare) 항목 id 를 확인할 수 없었다. 자료 모양(`gold`)과 시험(형식 검사)은 준비돼 있다.
- 화면: 찾기(한·영 이름·다른 이름·key·정의), 분류 단추, 시험 고르기, 첫 글자 색인(ㄱ–ㅎ·A–Z·#), 항목 펼치기(다른 이름·단위·근거 조문 링크·참고·시험·관련 용어·관련 계산기·관련 화면·정의 출처·주소 복사).
  상단 버튼은 두지 않았다(1440px 에서 상단 바가 두 줄로 넘침) — 통합 검색 "용어 설명" 묶음·"화면 바로가기"·계산기 "?" 설명 상자에서 들어온다.
- 통합 검색: "용어 설명" 묶음이 용어사전 전체를 찾는다. 이름이 딱 맞으면 정의 카드가 맨 위에 온다(예: `인화점` → 용어 `flash_point` 다음 MSDS 9항). 결과는 용어사전 딥링크.
- 링크 규약: `docs/integration/LINK_CONTRACT_v6.md`(용어사전 행 추가).

### 6.2 KOSHA 기술지침 본문 검색(12) — P5

- 원본: 집 PC 의 기술지침 폴더(`settings.KOSHA_GUIDE_DATA_DIR`: `guides.json` + `normalized/guide_pages.jsonl.gz`, PDF 에서 뽑은 쪽 글). 1,039건 가운데 글이 있는 1,037건.
- 방식: PDF 에서 뽑은 한글은 띄어쓰기가 거의 없어 낱말 대신 **두 글자 조각** 색인(정규화 = NFKC·소문자·글자와 숫자만). 조각 512 파일(fnv1a32, 검색 색인과 같은 해시), 지침별 쪽 글 파일.
  브라우저가 검색어 조각(최대 8)의 파일만 받고 교집합 → 제목에 든 것·빈도 순으로 12건의 본문을 받아 **띄어쓰기 무시 정확 일치**를 확인 → 쪽 번호·맞은 곳 수·발췌(표지·목차 점선은 건너뜀).
  검색 한 번에 받는 것: 목록 32 KB(처음 한 번) + 조각 8개 이하 + 본문 12개 이하(각 약 10 KB gzip).
- 대체 경로: `gs/` 가 없으면 제목 목록 `g/guide_index.json`, 그것도 없으면 집 PC `/api/guides/search`(이때도 서버 발췌를 설명 줄에 보인다).
- 확인: PC 를 끈 상태(정적 서버 + `/api/**` 차단)에서 `제어풍속` 28건·`HAZOP` 63건·`정전기 방전` 44건, `/api` 요청 0.
- 형식: `CONTRACT.md` "gs/ — KOSHA guide full text". 내보내기 `run_all.py --steps guide_text`(약 20초), 업로드 `upload_r2_s3.py --src <OUT>\v1\gs --prefix v1/gs --gzip-all`.
- 라이선스: KOSHA 기술지침은 공공 자료. 화면은 제목·짧은 발췌·원문(KOSHA 포털) 링크만 보인다.

### 6.3 범위에서 뺀 것(P5)

2026-10-31 범위 조정으로 13번(PRTR 지도)과 확장(오늘의 물질·자주 찾는 물질·관련 물질·용어 사이트맵)은 다른 담당에게 넘겼다.
P5 가 그 전에 받아 둔 것: Natural Earth admin-1 경계(공공 영역) 원본 `E:\dev-cache\chemip-geo\dl\ne_admin1.geojson`(40 MB, 한국 17개 시도 포함, 세종 포함). 프로젝트 파일은 만들지 않았다.

## 7. 다음에 할 만한 것

| 항목 | 이유 | 노력 |
|---|---|---|
| Worker·Pages 재배포 | 새 영역(`gs` `f` `oel` `reg` `feed` `prtr` `rel`)과 새 화면이 운영 주소에서 열리게 | S |
| 용어사전 정적 HTML 페이지 + sitemap | `?view=glossary&term=` 는 화면 안 주소라 검색엔진 색인이 약하다. SEO 파이프라인(`scripts/seo_pages`)에 `/chemip/glossary/<key>` 정적 페이지 613개와 sitemap 줄을 더하면 수험생 유입(검색 노출)이 커진다 | M |
| Gold Book 링크 | 브라우저에서 사람이 id 를 확인하거나, IUPAC 가 내려받기 파일을 주면 그것으로 `gold` 를 채운다(링크·출처 표시만, CC BY-SA 4.0) | S |
| 법령 문구 재확인 | 화관법 2025 개정 용어·조문 번호, 위험물 시행규칙 별표 번호를 법제처 OPEN API(OC 키)로 자동 대조 | S–M |
| 시험 기출 연결 | 용어마다 "이 용어가 나온 시험 회차"는 문제 저작권 때문에 문제는 싣지 않고 회차·과목만(공개 정보) | M |
| 기술지침 본문 검색 화면 | 지금은 통합 검색 묶음(최대 20건). 지침 분야(A·B·C·D·E·G·H·M·P·X…)·연도 거르기와 쪽별 결과를 보이는 전용 화면 | M |
| 기술지침 갱신 | KOSHA 가 지침을 새로 공표하면 `sync_kosha_guide_api.py` → `parse_kosha_guide_pdfs.py` → `run_all --steps guide_index,guide_text` → 업로드(완료 기록 파일 지우고) | S |
| 용어사전 ↔ 물질 화면 | MSDS 항목 이름·노출기준 칸 옆에 용어 "?"(이미 있는 `TermHint`)를 붙이면 화면 곳곳이 용어사전으로 이어진다 | S |
