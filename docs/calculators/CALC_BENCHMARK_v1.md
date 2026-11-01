# 공학 계산기 벤치마크 v1 (2026-10-30)

ChemIP "공학 계산기" 화면(`frontend/public/chemip/calc_*.jsx`)의 계산기 목록을 정하려고, 검색 상위에 나오는
화공·공정·안전 계산기 사이트를 조사했다. 주제와 UX 만 비교했고 사이트 문구·코드는 가져오지 않았다.

## 방법

- WebSearch(미국 지역, 2026-10-30) 질의 15개
  - 영어: "chemical engineering calculators online", "process engineering calculators pressure drop LMTD", "ppm to mg/m3 calculator",
    "pipe pressure drop calculator Darcy Weisbach", "LMTD calculator heat exchanger", "Reynolds number calculator",
    "ideal gas law calculator solve for any variable", "Antoine equation vapor pressure calculator", "heat duty calculator m cp delta T online",
    "LMNO engineering calculators pump power", "industrial hygiene calculator mixture exposure TLV dilution ventilation",
    "evaporation rate pool spill calculator Crowl Louvar mass transfer", "Engineering ToolBox Neutrium CheCalc calculators list"
  - 한국어: "화학공학 계산기 온라인", "환기량 계산기 희석환기 필요환기량", "폭발하한계 혼합가스 르샤틀리에 계산",
    "안전보건공단 KOSHA 계산 프로그램 노출기준 환산 ppm mg/m3"
- 대표 사이트는 첫 화면이나 분류 목록을 직접 열어 봤다(WebFetch): checalc.com, chemenggcalc.com, omnicalculator.com/chemistry,
  engineeringtoolbox.com, wwwn.cdc.gov/Niosh-oeb/Resource/Calculator. neutrium.net 은 목록이 열리지 않았다.
- 같은 문구를 되풀이하는 SEO 복제 페이지(`?p=숫자` 주소, `*.pages.dev` 복제본 등)는 세지 않았다.

## 사이트 × 주요 계산기

| 사이트 | 주제(확인한 것) | 주소 |
|---|---|---|
| Omni Calculator | Reynolds, Darcy–Weisbach(f 를 직접 넣음), LMTD, 몰농도·질량%·희석(Solution Dilution, Mass Percent, Molarity), 이상기체·STP, 증기압·물 증기압 | https://www.omnicalculator.com/chemistry · /physics/reynolds-number · /physics/darcy-weisbach · /physics/lmtd |
| ChemEnggCalc | 인기: 증기표(IAPWS-IF97), 용기 헤드·용기 부피, Ponchon–Savarit. 분류: 유체 25+·열전달 27+·열역학·물질전달·무차원수 13+·반응공학. LMTD(향류·병류), Antoine(상수 목록 포함) | https://chemenggcalc.com/ · /lmtd-calculator-for-heat-exchanger/ · /antoine-equation-calculator-for-vapour-pressure |
| CheCalc | 2성분 VLE, 증기압 곡선 맞춤, 탱크 설계·증발 손실, 천연가스 배관 크기, 수평 분리기, 용기 부피·액위, 보온 열손실, 원심 펌프(시스템 곡선·NPSHa) | https://checalc.com/ |
| Engineering ToolBox | 유체역학·배관·펌프·증기·열역학 등 분류 안내 + 계산기(Darcy–Weisbach, 단위 환산, 밀도) | https://www.engineeringtoolbox.com/ · /darcy-weisbach-equation-d_646.html |
| Pipe Flow Calculations | 배관 압력손실, Reynolds, 열량(heat power) | https://www.pipeflowcalculations.com/pressuredrop/calculator.xhtml · /reynolds · /heatpower/calculator.xhtml |
| calculate.co.nz | 배관 압력손실, LMTD, Reynolds | https://www.calculate.co.nz/pipe-flow-pressure-drop-calculator.php · /lmtd-calculator.php · /reynolds-number-calculator.php |
| LMNO Engineering | 배관·덕트·개수로. 펌프 곡선(Darcy–Weisbach, NPSHa, 펌프 동력 hp) | https://lmnoeng.com/Pipes/DWpump.php |
| FIRGELLI(engineering calculators) | LMTD·열교환기 LMTD, Darcy–Weisbach, Reynolds, 이상기체 압력, 엔탈피 | https://www.firgelliauto.com/blogs/engineering-calculators/lmtd-calculator |
| Pearson channels | 이상기체, 증기압(Antoine, P↔T 양방향) | https://www.pearson.com/channels/general-chemistry/calculators/ideal-gas-law-calculator · /calculators/vapor-pressure-calculator |
| GigaCalculator / CalcTool / vCalc | Reynolds(동·동점성), Darcy–Weisbach, Antoine | https://www.gigacalculator.com/calculators/reynolds-number-calculator.php · https://www.calctool.org/CALC/eng/fluid/darcy-weisbach · https://vcalc.com/wiki/antoine-equation |
| NIOSH(CDC) | ppm ↔ mg/m³ (25 °C, 1 atm, 24.45, 분자량 입력) | https://wwwn.cdc.gov/Niosh-oeb/Resource/Calculator |
| 산업위생 공식 모음(CIH 대비·대학 강의) | 혼합물 Σ C/TLV, 희석 환기 Q = G·K/C, ACH = 60Q/V, ppm ↔ mg/m³ | https://clint-bg.github.io/safetyinjc/physical/15-Hygiene.html · https://open-exam-prep.com/study-guides/cih/toxicology-biological-monitoring/mixtures-shift-adjusted-oels |
| 국내 | 희석환기 Q = G·K/C 정리 글, ACH 환기량 계산기(devcomma), KOSHA 기술지침 D-22-2012(혼합물 폭발 한계 산정), 한국가스학회지 혼합물 LFL 논문 | https://shjangcsp.tistory.com/entry/Ventilation-%ED%99%98%EA%B8%B0-4 · https://tools.devcomma.com/calculators/ventilation-cfm · https://portal.kosha.or.kr/openapi/v1/file/down/FL00015883359/3 |

한국어로 된 화공 계산기 웹사이트는 검색 상위에 거의 없었다(앱·AI 서비스 위주). KOSHA 공식 환산 계산 프로그램 페이지도 찾지 못했다.

## 주제별 빈도 (위 표의 독립 사이트 수)

| 주제 | 사이트 수 | 비고 |
|---|---|---|
| Darcy–Weisbach 배관 압력손실(+마찰계수) | 8 | Omni·CalcTool 은 f 를 직접 넣게 함. Colebrook 반복해·Re 로 자동 판정하는 곳도 있음 |
| Reynolds 수 + 흐름 구분 | 7 | 거의 모두 층류/천이/난류 표시 |
| LMTD(향류·병류, Q = UAΔT) | 6 | U·A 로 열량, 또는 면적 계산까지 |
| 이상기체 PV = nRT(아무 변수나 풀기) | 4 + 복제 다수 | 단위 자동 환산이 기본 |
| 증기압(Antoine, P↔T) | 5 | 상수 정확도·적용 범위 경고가 공통 |
| 몰농도·질량%·희석 C₁V₁ = C₂V₂ | 2 (Omni 에 계산기 여러 개) | 일반화학 쪽 검색량 최상위 |
| 펌프 동력(ρgQH/η) | 4 | 펌프 곡선·NPSH 까지 가는 곳도 있음 |
| 현열 열량 Q = ṁ·cp·ΔT | 4 | 상변화 제외 경고 공통 |
| ppm ↔ mg/m³ | 2 (NIOSH + 산업위생 자료) + 복제 다수 | NIOSH 가 정본. 복제 페이지에는 틀린 예시가 있음 |
| 혼합물 노출지수 Σ C/TLV | 2 (산업위생 자료) | 독립 계산기는 드묾 → 차별점 |
| 희석 환기 필요 풍량 | 3 (국내 정리 글·CIH 자료·ACH 계산기) | ACH 계산기는 법정 기준이 아니라고 밝힘 |
| 혼합 기체 LFL(Le Chatelier) | 2 (KOSHA 지침·국내 논문) | 국내 법정 맥락에 직접 연결 |
| 증기표(IAPWS-IF97) | 2 (ChemEnggCalc 인기 1위, ChemE 앱) | 구현량이 큼 |
| 용기·탱크 부피(헤드 형상·액위) | 2 (ChemEnggCalc·CheCalc 인기) | 헤드 치수 규격 필요 |
| 액체 증발량(웅덩이) | 1 | 대부분 수영장 물 증발식 |

## 공통 UX

| 패턴 | 어디서 | ChemIP 반영 |
|---|---|---|
| 칸마다 단위 고르기(자동 환산) | Omni, GigaCalculator, 이상기체 계산기 대부분 | 입력·출력 칸 옆 단위 선택(`calc_units.jsx` 표) |
| 아무 변수나 풀기(solve for) | Omni, 이상기체·희석 계산기 | 이상기체·희석은 "구할 값" 선택 |
| 식 보여 주기 | Omni, Pipe Flow, FIRGELLI, NIOSH | 계산기마다 "식" 칸 |
| 적용 범위·한계 경고 | NIOSH(25 °C·1 atm), Antoine 계산기, 열량 계산기(상변화 제외) | "주의" 칸 + 범위 밖 입력이면 경고 |
| 예시값·풀이 예 | FIRGELLI, ChemEnggCalc | 기본값이 곧 예시(벤젠, 물 등), 시험의 손계산 값과 같음 |
| 유효숫자 안내 | NIOSH | 결과는 유효숫자 4자리 |
| 결과 복사·공유 링크 | 일부 | 주소로 값 채우기(`?view=calc&calc=…`) — 물질 상세에서 분자량을 넘김 |
| 근거 문헌 | 드묾(대부분 없음) | 계산기마다 교과서·규정 출처 → 차별점 |

## 고른 목록(13개)과 이유

빈도 상위 주제를 먼저 넣고, ChemIP 사용자(MSDS·안전 실무자, 학부생)에게 맞는 산업위생 계산기를 근거가 분명한 것만 더했다.

| # | 계산기 | 키 | 이유 |
|---|---|---|---|
| 1 | 배관 압력손실(Darcy–Weisbach, Colebrook·Swamee–Jain) | `pipe_dp` | 빈도 1위. f 를 자동 계산(일부 사이트는 직접 넣게 함) |
| 2 | Reynolds 수·흐름 구분 | `reynolds` | 빈도 2위 |
| 3 | LMTD·열교환 열량/면적 | `lmtd` | 빈도 3위 |
| 4 | 이상기체(구할 값 선택) | `ideal_gas` | 빈도 상위, 학부 기본 |
| 5 | Antoine 증기압(P↔T) | `antoine` | 빈도 상위. 상수 목록은 출처를 물질마다 붙일 수 없어 싣지 않음 |
| 6 | 몰농도 ↔ 질량% | `concentration` | 일반화학 최상위 |
| 7 | 희석 C₁V₁ = C₂V₂ | `dilution` | 일반화학 최상위 |
| 8 | 펌프 동력 | `pump_power` | 빈도 중위, 공정 기본 |
| 9 | 현열 열량 Q = ṁ·cp·ΔT | `heat_duty` | 빈도 중위, 공정 기본 |
| 10 | ppm ↔ mg/m³ | `ppm_mgm3` | NIOSH 정본 + MSDS 노출기준과 바로 연결(물질 상세에서 분자량 채움) |
| 11 | 혼합물 노출지수 | `mix_exposure` | 산업위생 기본식, 독립 계산기가 드묾 |
| 12 | 혼합 기체 LFL/UFL | `mix_lfl` | KOSHA 지침 D-22-2012 주제, MSDS 9항 연소 한계와 연결 |
| 13 | 희석 환기 필요 풍량 | `ventilation` | 국내 검색 결과 있음, 산업위생 기본식 |

**뺀 것**

- 액체 증발량 — 처음 목록에 있었으나 빈도 1(대부분 수영장 식)이라 뺐다.
- 증기표(IAPWS-IF97) — 수요는 크지만 식이 길어 정확도 점검 부담이 크다. 다음 후보.
- 용기·탱크 부피 — 수요는 있으나 헤드 형상 규격(2:1 타원·접시형 치수)을 정해야 한다. 다음 후보.
- VLE·증류(Ponchon–Savarit)·분리기 크기 — 학부 기초 범위를 넘고 물성 자료가 필요하다.
