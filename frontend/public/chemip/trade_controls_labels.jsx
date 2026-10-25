// Labels for the 규제·인허가 / 수출입 tab — every Korean string the tab shows lives here (화면 문구는 이 파일 한 곳).
// 화면 코드는 TRADE_LABELS 만 읽는다. 나라 이름은 intl_regions.jsx 의 INTL_JURISDICTIONS.

const TRADE_LABELS = {
  tabLabel: "규제·인허가 / 수출입",
  title: "규제·인허가 / 수출입",
  noCas: "CAS 번호가 없어 규제를 조회할 수 없습니다.",
  loading: "조회 중입니다…",
  errors: { invalid_cas: "CAS 번호 형식이 올바르지 않습니다.", invalid_direction: "수입/수출 방향 값이 올바르지 않습니다." },
  blocks: {
    domestic: { title: "국내 규제 · 방향과 무관", hint: "이 물질을 국내에서 제조·취급·보관할 때 적용되는 법령 목록과 인허가입니다." },
    trade: { title: "수출입" },
  },
  directions: {
    import: { label: "수입", phrase: (name, c) => `${name}을(를) ${c ? `${c}에서 ` : ""}한국에 수입할 때` },
    export: { label: "수출", phrase: (name, c) => `${name}을(를) 한국에서 ${c ? `${c}(으)로 ` : ""}수출할 때` },
  },
  directionGroup: "방향",
  countryLabel: "상대국",
  countryNone: "상대국 선택 안 함 (한국 의무만)",
  customs: "세관장확인",
  customsHint: "통관 시 세관장 확인 대상(관세법 제226조)",
  sections: {
    krLaw: { title: "국내 법령별 규제", empty: "수집된 국내 법령 목록에 이 물질이 등재되어 있지 않습니다.", lists: n => `${n}개 법령` },
    permits: { title: "인허가·신고", empty: "이 물질에 걸리는 인허가·신고 항목이 확인되지 않았습니다.", condition: "조건" },
    obligations: { title: "한국 수출입 의무", empty: "이 물질·방향에 해당하는 한국 의무가 확인되지 않았습니다." },
    unverified: { title: "확인 중인 항목", hint: "근거 원문을 아직 대조하지 못한 항목입니다. 참고로만 보십시오." },
    lists: {
      title: "통제 목록 등재", empty: "CWC·호주그룹·마약류 원료물질 목록에 등재되어 있지 않습니다.", count: n => `${n}개 목록`,
      otherDirection: names => `이 방향에는 해당하는 통제 목록이 없습니다. 다른 방향에서 등재: ${names}. 위에서 수입/수출을 바꾸면 자세히 보입니다.`,
    },
    hs: {
      title: "HS 품목번호",
      empty: "이 CAS 에 연결된 HS 코드가 없습니다.",
      hskTitle: "한국 HSK10 후보 · 참고",
      hskHint: "관세청은 CAS→HSK 대응표를 내지 않아, 같은 HS6 아래 HSK10 을 후보로만 보입니다.",
      notBinding: "ECICS 분류는 참고용이며 법적 구속력이 없습니다. 구속력 있는 분류는 관세청 품목분류 사전심사로 받습니다.",
      attribution: "출처: European Commission, DG TAXUD, ECICS (CC BY 4.0) · 관세청 HS부호(공공누리 제1유형)",
    },
    destination: {
      title: { destination_import: "상대국 수입 시 확인할 목록", origin: "원산지(상대국) 등재 현황 · 참고" },
      pick: "상대국을 고르면 그 나라와 국제협약 목록 등재 내역을 함께 보여드립니다.",
      empty: "수집된 상대국·국제협약 목록에 등재되어 있지 않습니다.",
    },
    intlLists: {
      title: "상대국 법령 목록",
      empty: "수집된 상대국 법령 목록(EU·미국·중국·일본 등)에 등재되어 있지 않습니다.",
      absent: "미등재",
      obligation: "수출자·수입자 할 일",
      license: "자료 이용조건:",
    },
    kotra: { query: q => `검색어: ${q}`, title: "KOTRA 수입규제 품목", empty: "KOTRA 수입규제 자료에서 일치하는 품목이 없습니다.", error: "KOTRA 수입규제를 불러오지 못했습니다." },
  },
  // 탭 맨 위 요약 — 숫자 카드를 누르면 해당 섹션으로 이동한다
  summary: {
    title: "한눈에 보기",
    laws: { label: "국내 법령", value: n => (n ? `${n}개 법령` : "해당 없음"), sub: n => `물질 목록 ${n}개에 등재` },
    permits: { label: "인허가·신고", value: n => `${n}건`, none: "해당 없음" },
    obligations: {
      label: { import: "수입 시 의무", export: "수출 시 의무" },
      value: n => `${n}건`,
      customs: n => `세관장확인 ${n}건`,
      none: "해당 의무 없음",
    },
    controls: {
      label: "통제 목록 (수출입 통제)", yes: n => `해당 ${n}개`, no: "해당 없음", sub: "CWC·호주그룹·마약류 원료물질",
      // 지금 방향에는 안 걸리지만 다른 방향에 걸리는 목록 표시
      otherDirection: { import: "수입 시", export: "수출 시" },
    },
    hs: "HS",
    hsNone: "HS 코드 미확인",
    preparing: "자료 준비 중",
    jump: "자세히 보기",
  },
  // 통제 목록 짧은 이름(list_id → 이름). 없는 id 는 목록 제목을 그대로 쓴다.
  listShort: { CWC_SCHEDULE: "화학무기협약(CWC)", AUSTRALIA_GROUP_CW_PRECURSORS: "호주그룹·전략물자 1C350", DRUG_PRECURSOR: "마약류 원료물질" },
  // 인허가 종류(kind) → 화면 글자. 수집기는 한국어로 쓴다(kr_safety/permit_kinds.py); 옛 판의 영문 코드만 여기서 바꾼다.
  kinds: {
    permit: "허가", approval: "승인", report: "신고", obligation: "준수의무", obligation_report: "실시·보고",
    report_review: "제출·심사",
  },
  // 종류 글자에 이 말이 들어 있으면 그 색으로 표시한다(앞에서부터 먼저 맞는 것).
  kindTones: [["금지", "hazard"], ["허가", "hazard"], ["제한", "hazard"], ["승인", "accent"], ["신고", "accent"], ["등록", "accent"], ["제출", "accent"]],
  collapse: { expandAll: "모두 펼치기", collapseAll: "모두 접기", lists: n => `목록 ${n}개`, items: n => `${n}건`, more: n => `${n}건 더 보기` },
  quote: { show: n => `법령 원문 발췌 보기 (${n})`, supporting: "관련 조문" },
  count: n => `${n}건`,
  fields: {
    who: "의무자", when_required: "시기", timing: "시기", agency: "기관", authority: "기관", threshold: "기준",
    legal_basis: "근거", note: "비고", amended_on: "개정", obligations: "의무",
  },
  matchedBy: { ncis_category: "NCIS 분류", list: "등재 목록", list_id: "등재 목록", any_substance: "모든 화학물질" },
  supportingTitle: "관련 조문",
  sourceFiles: {
    "kr_lists/": "국내 법령별 물질 목록",
    "kr_permits_env.json": "환경 인허가·신고",
    "kr_permits_safety.json": "안전 인허가·신고",
    "kr_permits_product.json": "제품·운송 인허가·신고",
    "kr_rules.json": "한국 수출입 의무 규칙",
    "cwc_schedules.json": "화학무기협약(CWC) 표",
    "australia_group.json": "호주그룹 통제 목록",
    "drug_precursors.json": "마약류 원료물질",
    "hs_codes.sqlite": "HS 품목번호",
    "intl_lists/": "상대국 법령별 물질 목록",
  },
  sourceStatus: { present: "있음", missing: "준비 중", invalid: "형식 오류" },
  sourceSummary: { all: n => `자료 파일 ${n}개 모두 있음`, some: (ok, n) => `자료 파일 ${n}개 중 ${ok}개 있음 · 나머지는 준비 중이거나 형식 오류` },
  footer: "등재·규칙 매칭은 NCIS 분류와 목록 등재를 기준으로 한 안내입니다. 수량 조건은 평가하지 않습니다. 실제 신고·허가 여부는 근거 원문과 관할 기관에 확인하십시오.",
};

// 자료 파일 묶음(sources_status 키). 섹션별 "자료 준비 중" 판단에 쓴다.
const TRADE_SOURCE_GROUPS = {
  krLaw: ["kr_lists/"],
  permits: ["kr_permits_env.json", "kr_permits_safety.json", "kr_permits_product.json"],
  obligations: ["kr_rules.json"],
  lists: ["cwc_schedules.json", "australia_group.json", "drug_precursors.json"],
  hs: ["hs_codes.sqlite"],
  intlLists: ["intl_lists/"],
};

// 섹션 앵커 id. 요약 카드가 이 id 로 스크롤한다(섹션과 요약이 같은 값을 읽는다).
const TRADE_ANCHORS = {
  krLaw: "tc-kr-law", permits: "tc-permits", obligations: "tc-obligations", lists: "tc-lists", hs: "tc-hs",
};

Object.assign(window, { TRADE_LABELS, TRADE_SOURCE_GROUPS, TRADE_ANCHORS });
