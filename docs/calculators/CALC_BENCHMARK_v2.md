# 공학 계산기 벤치마크 v2 (2026-10-30)

v1(`CALC_BENCHMARK_v1.md`, 13개)에 이어, 검색 상위 계산기 가운데 v1 에 없는 주제를 다시 조사해 16개를 더했다(합계 29개).
v1 은 그대로 둔다. 사이트 문구·코드는 가져오지 않았고 주제·UX·검증용 예제 값만 비교했다.
함께 넣은 것: 용어 설명 "?"(`term_hint.jsx`·`term_glossary.jsx`, 용어 107개).

## 방법

- WebSearch(미국 지역, 2026-10-30) 질의 21개
  - 영어: "chemical engineering calculators online steam table vessel volume NPSH", "process safety calculators Gaussian dispersion
    evaporation rate relief valve sizing online", "tank volume calculator 2:1 ellipsoidal head partial fill", "NPSHa calculator pump suction",
    "8-hour TWA calculator OSHA time weighted average", "pipe insulation heat loss calculator cylindrical conduction",
    "Henderson-Hasselbalch buffer pH calculator", "CSTR PFR volume calculator first order reaction conversion",
    "pool evaporation rate chemical spill calculator mass transfer coefficient Crowl Louvar", "orifice flow meter calculator discharge coefficient beta ratio",
    "pipe sizing calculator recommended velocity diameter", "stoichiometric air fuel ratio combustion calculator",
    "Gaussian plume calculator Pasquill Gifford stability class online", "psychrometric calculator relative humidity dew point humidity ratio",
    "Dittus Boelter Nusselt number calculator Prandtl", "API 520 relief valve sizing gas calculator orifice area",
    "gas compressibility factor Z calculator Pitzer correlation density", "mixture flash point calculator Le Chatelier Raoult"
  - 한국어: "화학공학 계산기 증기표 탱크 용량 NPSH 계산", "시간가중평균 TWA 계산 방법 작업환경측정 8시간",
    "폭발하한계 인화점 혼합물 계산 환기 증발량 누출 확산 계산 프로그램", "보정노출기준 8시간 노출기준 × 8/h 작업환경측정 고시"
- 기준값 확인용으로 직접 연 문서(WebFetch): OSHA 29 CFR 1910.1000(d) 원문(TWA·혼합물 예시), python `fluids` safety_valve 문서
  (API 520 기체·액체 예제, API 526 면적표). chemenggcalc.com 자료 목록, AIHA IH 계산기 앱 첫 화면도 열었으나 목록이 비어 있었다.
- `?p=숫자` 주소·`*.pages.dev` 복제·같은 문구 반복 SEO 페이지는 세지 않았다(NPSH·PSV·증기표 질의에서 특히 많았다).

## 사이트 × 주제 (v1 에 없는 주제만)

| 사이트 | 확인한 주제 | 주소 |
|---|---|---|
| ChemEnggCalc | 증기표(IAPWS-IF97 5영역), 용기 부피(헤드 형상별 전체·채움) | https://chemenggcalc.com/ |
| Chemical Engineering Site | 세움·눕힘 타원·접시형 헤드 용기 액위별 부피 | https://chemicalengineeringsite.in/vertical-cylinder-ellipsoidal-heads-vessel-volume-calculator/amp/ |
| Neutrium | 부분 채움 용기 부피·젖은 면적(헤드별 식) | https://neutrium.net/articles/equipment/volume-and-wetted-area-of-partially-filled-horizontal-vessels/ |
| instrumentationandcontrol.net | 용기 액위 부피, 오리피스(유량·차압·지름) | https://instrumentationandcontrol.net/vessel-volume-calculator.php · /orifice-plate-calculator-flow.php |
| FIRGELLI | NPSH, 보온 배관 열손실, Nusselt(Dittus–Boelter), 습공기, 완충 pH | https://www.firgelliauto.com/blogs/engineering-calculators/npsh-net-positive-suction-head-calculator |
| Pipe Flow Calculations | 오리피스(ISO 5167 Reader-Harris/Gallagher) | https://pipeflowcalculations.com/orifice/calculator.xhtml |
| LMNO Engineering | 유출 계수 | https://www.lmnoeng.com/Pressure/DischargeCoefficient.php |
| Engineers Edge | 보온 배관 열손실 | https://host.engineersedge.com/heat_transfer/heatlossinsulatedpipe/heat_loss_insulated_pipe_equation_and_calculator_13169.htm |
| ORNL MEASUR | 보온 배관 열손실 감소 | https://industrialresources.ornl.gov/measur/suite/docs/group__insulated__pipe__reduction__calculator |
| Omni Calculator | Henderson–Hasselbalch, 공연비(AFR), 습공기 | https://www.omnicalculator.com/chemistry/air-fuel-ratio-afr · /physics/psychrometric |
| Pearson channels | Henderson–Hasselbalch, 완충 pH, AFR(화학식 입력) | https://www.pearson.com/channels/calculators/henderson-hasselbalch-calculator |
| calculate.co.nz | Henderson–Hasselbalch, 완충 pH | https://www.calculate.co.nz/henderson-hasselbalch-calculator.php |
| MetricGate | 가우스 플룸, Pasquill–Gifford 안정도 | https://metricgate.com/calculator/gaussian-plume-dispersion |
| midstreamcalculator.com | 독성 기체 확산(Briggs, Pasquill A–F) | https://midstreamcalculator.com/calculators/safety-relief/toxic-gas-dispersion-pasquill-gifford.html |
| python `fluids` · NeqSim | API 520 기체·액체 안전밸브 면적, API 526 | https://fluids.readthedocs.io/fluids.safety_valve.html · https://equinor.github.io/neqsim/safety/relief_valve_sizing_api |
| designcalculators.netlify.app | PRV(API 520), 저장 탱크 부피 | https://designcalculators.netlify.app/pressurereliefvalve |
| AIHA IH Calculator · CMUSE · MetricGate | TWA(주로 소음 선량) | https://www.aiha.org/ih-calculator-app/calcs/twa-percent-dose-niosh.html |
| OSHA 원문 | 화학물질 8시간 TWA, 혼합물 E_m | https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.1000 |
| GasCompressibility-py · pyrestoolbox | Z 인자(천연가스 상관식) | https://aegis4048.github.io/GasCompressibility-py/calc_z.html |
| Wolfram Demonstrations · 강의 자료 | CSTR·PFR 부피(1차 반응) | https://www.wolframcloud.com/objects/demonstrations/ComputationOfTheVolumeOfACSTRAndAPFR-source.nb |
| GF Piping · calcbee 등 | 유속 기준 배관 지름 | https://www.gfps.com/com/en/downloads-tools/online-tools/flow-calculator.html |
| 국내 | KOSHA GUIDE D-22-2012(혼합물 폭발 한계), 한국화학공학회·한국가스학회 혼합물 인화점·LFL 논문, 소음 TWA 고시 사본 | https://portal.kosha.or.kr/openapi/v1/file/down/FL00015883359/3 · https://koreascience.or.kr/article/JAKO201406234294955.pdf |

국내 검색은 v1 과 같이 웹 계산기보다 논문·지침·고시 사본이 주로 나왔다(누출·확산은 "확산 모델링 프로그램·CFD" 언급).

## 후보별 빈도·관련도 (위 표의 독립 사이트 수)

관련도: ChemIP 사용자(MSDS·안전 실무자, 학부생)에게 쓸모 — 상(MSDS 값과 바로 연결되거나 안전 판단에 직접), 중(공정 기초), 하.

| 후보 | 사이트 수 | 관련도 | 결정 |
|---|---|---|---|
| 용기·탱크 부피(헤드·액위) | 6 | 중 | **추가** `vessel_volume` |
| NPSHa | 5 + 복제 다수 | 중 | **추가** `npsha` |
| 오리피스 유량계 | 5 | 중 | **추가** `orifice` |
| 가우스 플룸(Pasquill–Gifford) | 3 | 상 | **추가** `gaussian_plume` |
| 안전밸브 크기(API 520) | 4 + 복제 다수 | 상 | **추가** `relief_valve` |
| 보온 배관 열손실 | 5 | 중 | **추가** `insulation_loss` |
| 습공기(절대 습도·이슬점) | 5 | 중 | **추가** `psychro` |
| 완충 pH(Henderson–Hasselbalch) | 5 | 중(학부) | **추가** `buffer_ph` |
| 증기표(포화선) | 3 + 복제 다수 | 중 | **추가** `water_sat`(포화 P↔T 만) |
| 8시간 TWA | 4(대부분 소음) + OSHA 원문 | 상 | **추가** `twa8h`(화학물질) |
| 이론 공기량·공연비(+Cst 연소 한계) | 3 | 상 | **추가** `stoich_air` |
| Nusselt(Dittus–Boelter) | 3 | 중 | **추가** `nusselt` |
| 압축인자·기체 밀도 | 3 | 중 | **추가** `compressibility`(Pitzer 비리얼) |
| 유속 기준 배관 지름 | 4 + 복제 다수 | 중 | **추가** `pipe_size` |
| CSTR·PFR(1차) | 2(강의 자료 위주) | 중(학부) | **추가** `reactor` |
| 웅덩이 증발량(Crowl & Louvar) | 1(웹 계산기는 수영장 식) + EPA·JRC 식 | 상 | **추가** `evaporation` — MSDS 증기압·분자량과 바로 연결 |
| 단위 환산기 | 많음 | 하 | 뺌 |
| 혼합물 인화점 | 0(논문만) | 상 | 뺌 |
| 탱크 벤트(API 2000) | 0(검색 상위 없음) | 중 | 뺌 |

## 고른 16개와 검증 근거

시험: `frontend/scripts/tests/test_calculators.cjs` — 289/289 PASS(계산기 29개, 용어 key 176곳·용어 107개 점검 포함).

| # | 계산기 | key | 묶음 | 검증 기준값 |
|---|---|---|---|---|
| 1 | 8시간 TWA (+Brief & Scala) | `twa8h` | safety | OSHA 1910.1000(d)(1)(ii) 예시 81.25 ppm; Brief & Scala RF 12 h = 0.5, 10 h = 0.7 |
| 2 | 이론 공기량·양론 농도(LFL·UFL·LOC 추정) | `stoich_air` | safety | Crowl & Louvar 식 6-11·예제 6-4 헥산 Cst 2.16 %, LFL 1.19, UFL 7.56; 메탄 공연비 ≈ 17.2 |
| 3 | 웅덩이 증발량·실내 농도 | `evaporation` | release | Crowl & Louvar 식 3-12·3-14·3-15 손계산(교과서 수치 예제는 웹에서 대조하지 못함 — K₀ = 0.83 cm/s 는 교과서 값) |
| 4 | 가우스 플룸 | `gaussian_plume` | release | Briggs 개활지 σy·σz 식(Crowl & Louvar 표 5-2) 손계산, 반사 항 포함 식 손계산 |
| 5 | 안전밸브 크기(API 520·526) | `relief_valve` | release | python `fluids` 문서의 API 520 예제: 기체 임계 3 699.05 mm², 아임계 4 248.36 mm², 액체 3 066.1 mm², C(1.35) = 0.026694 |
| 6 | 압축인자·기체 밀도(Pitzer) | `compressibility` | chem | SVNA n-부탄 510 K·25 bar 예제 Z = 0.879 |
| 7 | 완충 pH | `buffer_ph` | chem | 손계산(pKa 4.76 아세트산) |
| 8 | 물 포화 압력·끓는점(IAPWS-IF97) | `water_sat` | chem | IAPWS-IF97 검증표 6점(300·500·600 K, 0.1·1·10 MPa) 9자리 일치 |
| 9 | 배관 지름(유속 기준) | `pipe_size` | fluid | 손계산 |
| 10 | 펌프 NPSHa | `npsha` | fluid | 손계산(20 °C 물, IF97 증기압 2.339 kPa) |
| 11 | 오리피스 유량계 | `orifice` | fluid | 손계산, ISO 5167-2 영구 손실 식 |
| 12 | 보온 배관 열손실 | `insulation_loss` | heat | Incropera 예제 3.5 임계 반지름 11 mm, 열저항 손계산 |
| 13 | 관 안 대류 h(Dittus–Boelter·Gnielinski) | `nusselt` | heat | 손계산, 두 상관식 차 < 20 % |
| 14 | 습공기 | `psychro` | heat | ASHRAE 2017 표 2(20 °C 포화 W_s 14.758 g/kg, h_s 57.555, v_da 0.8301), 20 °C·50 % 이슬점 9.26 °C |
| 15 | 용기·탱크 부피(헤드·액위) | `vessel_volume` | process | 2:1 타원 πD³/24, 반구 πD³/12, ASME F&D 0.0810 D³·깊이 0.169 D(Eng-Tips·헤드 용량표), 수치 적분 ↔ 닫힌 식 |
| 16 | 반응기 크기(1차 CSTR·PFR) | `reactor` | process | X = 90 % 에서 CSTR/PFR = 3.9(Levenspiel·강의 예제), kτ = 1 → 50 %·63.2 % |

새 묶음: `release`(누출·확산·방출), `heat`(열전달·습공기), `process`(용기·반응기). `fluid` 는 "유체·배관"으로 이름을 바꾸고
v1 의 `heat_duty`·`lmtd` 를 `heat` 로 옮겼다(키·링크는 그대로).

## 뺀 것과 이유

- **단위 환산기** — 모든 입력·출력 칸에 이미 단위 고르기가 있어(`calc_units.jsx`) 따로 두면 같은 표를 두 번 보여 준다.
- **혼합물 인화점(Le Chatelier + Raoult)** — 웹 계산기는 없고 논문만 있다. 이상 용액 모델(White)은 오차가 크다고 보고되고(검색한 국내 논문),
  활동도계수 모델과 성분별 Antoine 상수가 필요하다. 공개 예제와 대조할 자신이 없어 뺐다.
- **탱크 벤트(API 2000)** — 판마다 열 호흡 식이 바뀌었고(6판 → 7판) 검색 상위에 검증할 예제가 없다.
- **증기표 전체(엔탈피·엔트로피, IF97 1·2영역)** — 식이 길어 이번엔 포화선(P↔T)만 넣었다. 다음 후보.
- **혼합물 TWA 보정의 국내 고시 식** — 「작업환경측정 및 정도관리 등에 관한 고시」 보정노출기준의 화학물질 식을 원문으로 확인하지 못해,
  Brief & Scala 만 참고값으로 넣고 고시를 따르라고 적었다.
- **확산의 도시 계수·퍼프·무거운 기체** — 기상·지형 입력이 많아 계산기 범위를 넘는다. ALOHA 를 안내한다.

## EPC와 나눈 범위

형제 사이트 EPC engineering(`https://epc.yule.pics`)은 설비 설계·건전성 검증 계산을 맡는다(저장소 `C:\Users\USER\Desktop\EPC engineering`,
`src/<분야>/calculations.py`, 읽기만 했다). ChemIP 계산기는 물질·안전·산업위생·학부 공정 기초에 머물고 아래와 겹치는 계산기를 만들지 않는다.

| EPC 분야 | EPC 가 하는 계산 | 주소 |
|---|---|---|
| `piping` 배관 | 최소 두께 t_min, 부식 속도, 잔여 수명, 검사 주기, 후프 응력, 수압 시험 압력·여유 | https://epc.yule.pics/piping |
| `vessel` 압력용기·저장설비 | 필요 동체 두께, 잔여 수명, FFS 등급 | https://epc.yule.pics/vessel |
| `rotating` 회전기계 | 건전성 지수(health index), 검사 주기 | https://epc.yule.pics/rotating |
| `instrumentation` 계장·안전계장 | PFDavg, SIL, 교정 드리프트·주기 | https://epc.yule.pics/instrumentation |
| `electrical` 전기 | 아크 플래시 에너지·PPE 등급, 변압기 건전성, 차단기 협조 | https://epc.yule.pics/electrical |
| (철골·토목) | 기둥 내력·D/C 비, 보 휨 내력, 탄산화 | 분야 키 목록(`backend/integrations/equipment_disciplines.py` `DISCIPLINES`)에 없음 |

분야 키는 `backend/integrations/equipment_disciplines.py` `DISCIPLINES`(piping · vessel · rotating · instrumentation · electrical) 한 곳에 있다.
이번에 더한 16개 가운데 EPC 와 겹치는 것은 없다(두께·잔여 수명·SIL/PFD·아크 플래시 없음). `vessel_volume` 은 용량(부피·액위)만 다루고
강도·두께는 다루지 않는다. EPC 계산기별 고정 주소가 없어 화면에는 EPC 링크를 넣지 않았고, 이 문서에만 적는다.
