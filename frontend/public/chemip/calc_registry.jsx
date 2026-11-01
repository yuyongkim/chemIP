// 공학 계산기 등록 목록 — 계산기 하나 = calc_<이름>.jsx 파일 하나 + 아래 배열 한 줄(+ index.html 스크립트 한 줄).
// 화면(calc_view.jsx)·시험(scripts/tests/test_calculators.cjs)은 이 목록만 읽는다. 묶음 이름은 CALC_LABELS.groups.
//
// 정의 객체 형식(React 없음, 데이터 + 순수 함수):
//   key, group(CALC_GROUPS 의 하나), title(tr 한·영 쌍), summary
//   inputs: [
//     { key, label, unit, default, min?, max?, positive?, optional?, hint?, when?(choices), term? }    수치 칸
//        dim 이 있으면 단위를 고를 수 있다: unit = 기준 단위(compute 가 받는 단위), show = 처음 보이는 단위,
//        default·min·max — default 는 show 단위, min·max 는 기준 단위. dim 이 없으면 unit 은 표시 글자.
//     { key, type: "choice", label, options: [{ v, label }], default, term?, select? }           선택(.seg, select: true 면 펼침 목록)
//     { key, type: "table", label, columns: [{ key, label, unit?, text?, optional?, positive?, min?, max?, term? }],
//       rows: [기본 행], minRows?, maxRows?, hint?, term? }                                      행 표(혼합물)
//   ]
//   outputs: [{ key, label, unit, dim?, show?, digits?, type?: "text" | "table", term? }]   compute 가 값을 안 주면 그 줄은 숨긴다
//        type "table" 의 값은 { columns: [{ key, label, digits? }], rows: [{ <열 key>: 수 | 글자 | null }] } — 결과 표(CalcOutTable)
//   term: "<용어 key>" — 있으면 칸 이름·표 머리·결과 이름 옆에 "?" 용어 설명(TermHint, term_hint.jsx)을 붙인다.
//         key 는 term_glossary.jsx 의 TERM_GLOSSARY 에 있어야 한다(없으면 시험이 실패한다). 정의 문구는 거기 한 곳에만 둔다.
//   compute(values, { units }) → { <출력 key>: 값, warnings?: [문구], error?: 문구 }   values 는 기준 단위 숫자·선택값·행 배열,
//         units 는 단위를 고를 수 있는 칸마다 화면에서 고른 단위 key(게이지 압력처럼 단위가 뜻을 갖는 경우만 읽는다)
//   formula: [식 문자열], notes: [주의], reference: [근거 문헌], keywords?: [통합 검색 낱말 — 언어 무관 기호만(barg, Nm³/h …)]
//   chart?(values, outputs) → CalcChart 속성(calc_chart.jsx 머리 설명) 또는 null — 있으면 결과 아래 그래프. values 는 compute 와 같은
//         기준 단위 값, outputs 는 compute 결과. 축 단위로 바꾸는 것은 이 함수가 한다(calcConvert). 실패하면 그래프만 빠진다.
//   links?(values, outputs) → [{ calc, values, label }] — 있으면 결과 아래 "이어서 계산" 링크(calc_results_next.jsx). values 는 받는 계산기 칸의
//         처음 보이는 단위 값(딥링크 calcHref). 등록되지 않은 calc 는 빠진다. 질량을 내는 계산기는 calcFireMassLinks(kg)(calc_next_data.jsx)를 쓴다.
//   table?(values, outputs) → { caption?, columns, rows, filename? }(calc_table_data.jsx 머리 설명) 또는 null — 있으면 결과 아래 표·복사·CSV.
//   engine?: { id, name, size, load() → Promise, ready() → bool } — 무거운 계산 엔진(예: CoolProp wasm). 그 계산기를 열 때만 불러오고
//         (calc_form_engine.jsx), 준비 전에는 compute 가 빈 결과를 돌려준다. 받는 중·실패 줄은 CalcEngineStatus.
//
// 화면 언어(ko | en, lang.jsx) — 정의 안의 보이는 문구는 그 자리에서 한·영 한 쌍으로 쓴다:
//   label: tr("농도", "Concentration")      tr 은 불러올 때(정의 문구) 또는 compute 를 부를 때(경고·오류·판정) 언어를 고른다.
//   - 한글이 든 보이는 글자(title·summary·label·hint·unit·options[].label·columns[].label·outputs[].label·compute 의 warnings·error·
//     text 출력·formula·notes·reference 의 설명 부분)는 모두 tr(한국어, English) 로 감싼다. 한글 없는 글자("ppm → mg/m³")는 그대로.
//   - 식은 기호로 써서 언어와 무관하게 두고, 낱말이 들어갈 때만 tr. 근거 문헌의 서지(저자·제목·연도)는 원문 그대로 두고
//     한국어 설명(판·장·국내 고시 이름)만 영어로 옮긴다.
//   - 수치·key·계산 흐름은 언어와 무관하다. 시험(test_calculators.cjs)은 같은 사례를 ko·en 두 번 돌려 수치가 같은지,
//     en 결과·정의에 한글이 남았는지(tr 로 감싸지 않은 한글 글자)를 함께 본다.

const CALC_GROUPS = ["basic", "safety", "flammability", "release", "fire", "chem", "thermo", "fluid", "heat", "process", "reaction", "sizing", "separation", "control", "env"];

const CALC_REGISTRY = [
  CALC_DEF_PPM_MGM3,
  CALC_DEF_MIX_EXPOSURE,
  CALC_DEF_TWA8H,
  CALC_DEF_MIX_LFL,
  CALC_DEF_STOICH_AIR,
  CALC_DEF_MIX_FLASH_POINT,
  CALC_DEF_LOC_MOC,
  CALC_DEF_PURGE,
  CALC_DEF_STATIC_CHARGE,
  CALC_DEF_VENTILATION,
  CALC_DEF_EVAPORATION,
  CALC_DEF_GAUSSIAN_PLUME,
  CALC_DEF_RELEASE,
  CALC_DEF_OFFSITE,
  CALC_DEF_TOXIC_PROBIT,
  CALC_DEF_RELIEF_VALVE,
  CALC_DEF_IDEAL_GAS,
  CALC_DEF_COMPRESSIBILITY,
  CALC_DEF_DILUTION,
  CALC_DEF_CONCENTRATION,
  CALC_DEF_BUFFER_PH,
  CALC_DEF_ANTOINE,
  CALC_DEF_WATER_SAT,
  CALC_DEF_JOBACK,
  CALC_DEF_STEAM,
  CALC_DEF_STEAM_TABLE,
  CALC_DEF_REYNOLDS,
  CALC_DEF_PIPE_DP,
  CALC_DEF_PIPE_SIZE,
  CALC_DEF_PUMP_POWER,
  CALC_DEF_NPSHA,
  CALC_DEF_ORIFICE,
  CALC_DEF_HEAT_DUTY,
  CALC_DEF_LMTD,
  CALC_DEF_INSULATION_LOSS,
  CALC_DEF_NUSSELT,
  CALC_DEF_PSYCHRO,
  CALC_DEF_VESSEL_VOLUME,
  CALC_DEF_REACTOR,
  CALC_DEF_BATCH_REACTOR,
  CALC_DEF_RUNAWAY,
  CALC_DEF_ECONOMICS,
  CALC_DEF_FLUE_GAS,
  CALC_DEF_PUMP_SYSTEM,
  CALC_DEF_CONTROL_VALVE,
  CALC_DEF_COMPRESSOR,
  CALC_DEF_HX_NTU,
  CALC_DEF_FITTINGS_DP,
  CALC_DEF_SEPARATOR,
  CALC_DEF_FLASH,
  CALC_DEF_MCCABE,
  CALC_DEF_FUG,
  CALC_DEF_RAYLEIGH,
  CALC_DEF_ABSORPTION,
  CALC_DEF_PID_TUNING,
  CALC_DEF_LOOP_SIM,
  CALC_DEF_TF_TOOLS,
  CALC_DEF_UNITS,
  CALC_DEF_AREA_CLASS,
  CALC_DEF_TANK_LOSSES,
  CALC_DEF_POOL_FIRE,
  CALC_DEF_BLEVE,
  CALC_DEF_VCE,
  CALC_DEF_PROBIT_HARM,
  CALC_DEF_FLUID_PROPS,
  CALC_DEF_VLE_BINARY,
];

function calcFind(key) {
  return CALC_REGISTRY.find(d => d.key === key) || null;
}

Object.assign(window, { CALC_GROUPS, CALC_REGISTRY, calcFind });
