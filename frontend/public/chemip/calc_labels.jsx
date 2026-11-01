// 공학 계산기 화면 공용 문구 — 한국어(CALC_LABELS_KO). 영어는 calc_labels_en.jsx(CALC_LABELS_EN), 화면이 읽는 CALC_LABELS 도 거기서 고른다.
// 계산기마다의 제목·칸 이름·식·근거는 각 calc_<이름>.jsx 정의에 있다(tr 한·영 쌍, calc_registry.jsx 머리 설명).
// titleSub·groups[].sub 는 제목 옆 작은 보조 이름(한국어 화면의 영어 병기). 비어 있으면 그리지 않는다.

const CALC_LABELS_KO = {
  title: "공학 계산기",
  titleSub: "Engineering calculators",
  lede: "화학·안전공학 기초 계산입니다. 계산은 이 브라우저 안에서만 하고, 식마다 근거 문헌을 붙였습니다. 설계·법정 판단에는 원 문헌과 현장 조건을 함께 확인하십시오.",
  navAria: "계산기 목록",
  groups: {
    basic: { name: "단위·기초", sub: "Units & basics" },
    safety: { name: "안전·산업위생", sub: "Safety & IH" },
    flammability: { name: "가연성·불활성화", sub: "Flammability & inerting" },
    release: { name: "누출·확산·방출", sub: "Release & relief" },
    fire: { name: "화재·폭발", sub: "Fire & explosion" },
    chem: { name: "화학·열역학", sub: "Chemistry & thermo" },
    thermo: { name: "열역학", sub: "Thermodynamics" },
    fluid: { name: "유체·배관", sub: "Fluids & piping" },
    heat: { name: "열전달·습공기", sub: "Heat transfer" },
    process: { name: "용기·반응기", sub: "Vessels & reactors" },
    reaction: { name: "반응·경제", sub: "Reaction & economics" },
    sizing: { name: "설비 사이징", sub: "Equipment sizing" },
    separation: { name: "분리공정", sub: "Separations" },
    control: { name: "공정제어", sub: "Process control" },
    env: { name: "환경·배출", sub: "Environment" },
  },
  sections: { inputs: "입력", results: "결과", formula: "식", notes: "주의", refs: "근거 문헌" },
  waiting: "입력을 고치면 결과가 나옵니다.",
  prefill: (from) => (from ? `주소로 받은 값 — ${from}` : "주소로 받은 값"),
  unitAria: (label) => `${label} 단위`,
  errors: {
    required: "값을 넣으십시오",
    notNumber: "숫자로 넣으십시오 (예: 0.5, 1e-3)",
    positive: (u) => `0${u ? ` ${u}` : ""}보다 커야 합니다`,
    min: (m, u) => `${m}${u ? ` ${u}` : ""} 이상이어야 합니다`,
    max: (m, u) => `${m}${u ? ` ${u}` : ""} 이하여야 합니다`,
    minRows: (n) => `값이 있는 행을 ${n}개 이상 넣으십시오`,
    cell: (row, col, msg) => `${row}행 ${col}: ${msg}`,
    failed: "계산하지 못했습니다. 입력을 확인하십시오.",
    badOutput: "결과가 수치 범위를 벗어났습니다. 입력을 확인하십시오.",
  },
  table: { add: "행 추가", remove: "이 행 지우기", row: (n) => `${n}행` },
  rowFill: {
    button: (row) => `${row}행 Antoine 상수 채우기`,
    hint: "성분 칸의 물질 이름이나 CAS 로 Antoine 상수를 채웁니다(사전 설정 물질 또는 ChemIP 물성 추정)",
    empty: (row) => `${row}행: 성분 칸에 물질 이름이나 CAS 를 넣으십시오.`,
    notFound: (row, q) => `${row}행: '${q}' 물질을 찾지 못했습니다.`,
    noData: (row, name) => `${row}행: ${name} — 증기압·끓는점 자료가 없어 채우지 못했습니다. 상수를 직접 넣으십시오.`,
    preset: (row, name, tmin, tmax, err) => `${row}행: ${name} — CoolProp 포화압력에 맞춘 상수(${tmin}–${tmax} °C, 최대 오차 ${err} %).`,
    fitted: (row, name, p1, t1, tb) => `${row}행: ${name} — 증기압 ${p1} kPa(${t1} °C)와 끓는점 ${tb} °C 두 점으로 맞춘 추정 상수. 두 온도 사이에서만 쓰십시오.`,
    failed: (row) => `${row}행: 자료를 받지 못했습니다. 잠시 뒤 다시 시도하십시오.`,
    propsFlash: (row, name, cas, how) => `${row}행: ${name}(${cas}) — 인화점·분자량은 MSDS 9항. Antoine B·C 는 ${{ preset: "CoolProp 포화압력 맞춤 상수", fit: "증기압 한 점과 끓는점 두 점 맞춤(어림)", kist: "끓는점만으로 Kistiakowsky 어림(오차 큼)", none: "자료가 없어 비움 — 직접 넣으십시오" }[how]}.`,
    propsLimits: (row, name, cas) => `${row}행: ${name}(${cas}) — LFL·UFL 은 MSDS 9항 값입니다. 원문과 대조한 뒤 쓰십시오.`,
    kinds: {
      flash_point: {
        button: (row) => `${row}행 인화점·Antoine 상수 채우기`,
        hint: "물질 칸의 이름이나 CAS 로 인화점·Antoine B·C·분자량을 ChemIP 물성(MSDS 9항)에서 채웁니다",
        noData: (row, name) => `${row}행: ${name} — 인화점·끓는점 자료가 없어 채우지 못했습니다. 값을 직접 넣으십시오.`,
      },
      flam_limits: {
        button: (row) => `${row}행 LFL·UFL 채우기`,
        hint: "물질 칸의 이름이나 CAS 로 LFL·UFL 을 ChemIP 물성(MSDS 9항)에서 채웁니다",
        noData: (row, name) => `${row}행: ${name} — 연소 한계 자료가 없어 채우지 못했습니다. 값을 직접 넣으십시오.`,
      },
    },
  },
  fluidLink: {
    link: "실유체 물성·p-h 선도",
    hint: "실유체 물성 계산기(CoolProp)를 이 물질로 엽니다. 밀도·엔탈피·포화 표·p-h 선도를 봅니다.",
  },
  engine: {
    loading: (name, size) => `계산 엔진 ${name}(${size})을 받는 중입니다. 처음 한 번만 받고, 그 뒤에는 브라우저 저장소에서 바로 엽니다.`,
    failed: (name) => `계산 엔진 ${name}을 받지 못했습니다. 인터넷 연결을 확인하고 다시 시도하십시오.`,
    retry: "다시 시도",
  },
  tableOut: { title: "결과 표", copy: "표 복사", copied: "복사했습니다", csv: "CSV 받기", rows: (n) => `${n}행` },
  chart: { legend: "범례", table: (n) => `그래프 자료 표 보기 (${n}행)` },
  nextLinks: { title: "이어서 계산" },
  substanceLink: {
    link: "이 물질로 계산하기",
    hint: "공학 계산기(ppm ↔ mg/m³)를 엽니다. MSDS 9항 분자량이 있으면 채웁니다.",
    units: "기체 유량 단위 변환",
    unitsHint: "공학 단위 변환기(Nm³/h ↔ kg/h ↔ kmol/h)를 엽니다. MSDS 9항 분자량이 있으면 채웁니다.",
  },
};

Object.assign(window, { CALC_LABELS_KO });
