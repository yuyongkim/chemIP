// 비상대응 기준(AEGL·ERPG·PAC) 문구 — 한국어 기준 모양(EL_LABELS_KO). 영어: el_labels_en.jsx → 화면이 읽는 EL_LABELS.
// 값은 각 기관이 공개한 참고값으로만 보인다. "적합·초과·위반" 같은 판정 문구는 쓰지 않는다(참고용 스크리닝·사전 검토용).

const EL_LABELS_KO = {
  heading: { ko: "비상대응 기준", en: "Emergency exposure guidelines" },
  sourceNote: "EPA AEGL · DOE PAC Rev. 29 (ERPG 는 DOE PAC 경유) · RIVM probit",
  count: (n) => `${Number(n || 0).toLocaleString("ko-KR")}개 기준`,
  none: "이 물질은 모아 둔 AEGL·ERPG·PAC 자료가 없습니다.",
  disclaimer: "일반 대중의 1회 비상 노출을 위한 참고값입니다(작업장 노출기준과 다름). 참고용 스크리닝·사전 검토용이며, 법정 장외영향평가는 화학물질안전원 KORA 로 해야 합니다.",
  aegl: {
    title: "AEGL (미국 EPA, 일반 대중 1회 노출)",
    tier: (k) => `AEGL-${k}`,
    times: { "10min": "10분", "30min": "30분", "60min": "60분", "4h": "4시간", "8h": "8시간" },
    status: { Final: "최종", Interim: "잠정", Proposed: "제안" },
    nr: "NR",
    nrTitle: "자료 부족으로 정하지 않음(Not Recommended)",
    nd: "ND",
    ndTitle: "보통 노출 상황에서는 정하지 않음(Not Determined)",
    lelTitle: { "*": "LEL 의 10 % 초과 — 폭발 위험도 함께 고려", "**": "LEL 의 50 % 초과 — 폭발 위험을 특히 고려", "***": "LEL 의 100 % 초과 — 폭발 위험을 특히 고려" },
    lel: (v, u) => `연소 하한(LEL) ${v} ${u}`,
    page: "EPA 값 페이지",
    tsd: "기술 근거 문서(TSD)",
  },
  pac: {
    title: "PAC (미국 DOE Rev. 29, 60분)",
    tier: (k) => `PAC-${k}`,
    basis: "근거",
    families: { AEGL: "AEGL", ERPG: "ERPG", TEEL: "TEEL" },
    flagTitle: { "*": "LEL 의 10 % 이상 50 % 미만", "**": "LEL 의 50 % 이상 100 % 미만", "***": "LEL 의 100 % 이상" },
  },
  erpg: {
    title: "ERPG (AIHA, 60분) — DOE PAC Rev. 29 경유",
    tier: (k) => `ERPG-${k}`,
    via: "AIHA ERPG 값, DOE PAC Rev. 29 경유(원문 문서는 싣지 않음)",
    surrogate: "다른 물질의 ERPG 를 DOE 가 대신 적용한 값",
    none: "ERPG 값 없음",
    noneNote: "DOE PAC 에 ERPG 근거 값이 없습니다(AEGL·TEEL 근거). AIHA ERPG 원문은 싣지 않습니다.",
  },
  endpoint: {
    title: "독성 끝점 (참고)",
    hint: "국내 장외영향 검토의 끝점 순서: ERPG-2 → AEGL-2(60분) → PAC-2",
    via: { erpg: "ERPG-2", aegl: "AEGL-2 (60분)", pac: "PAC-2" },
  },
  probit: {
    title: "치사 probit (RIVM)",
    line: (a, b, n) => `Pr = ${a} + ${b} · ln(C^${n} · t), C mg/m³, t 분`,
    calc: "독성 probit 계산기에서 열기",
    status: { "inhoudelijk vastgesteld": "확정", voorgesteld: "제안" },
  },
  oel: {
    title: "작업장 노출기준과 견주기",
    link: "노출기준 비교 표로",
    hint: "작업장 노출기준(8시간 반복 노출)과 비상대응 기준(1회 노출)은 목적이 다릅니다.",
    twa: (src) => `${src} TWA`,
    idlh: "NIOSH IDLH",
    aegl2: "AEGL-2 60분",
    pac2: "PAC-2",
  },
  unitNote: (mw) => `≈ 는 분자량 ${mw} g/mol, 25 °C·1 atm(24.45 L/mol)로 바꾼 값입니다.`,
  sources: {
    epa_aegl: "EPA AEGL",
    doe_pac_rev29: "DOE PAC Rev. 29",
    rivm_probit: "RIVM Probitrelaties",
  },
  open: "원문",
  exportedAt: (d) => `자료 정리 ${d}`,
  // 통합 검색 바로 답
  answer: {
    title: (kind, name) => `${name} · ${kind}`,
    kinds: { aegl: "AEGL", erpg: "ERPG", pac: "PAC", all: "비상대응 기준" },
    aeglLine: "AEGL-1 / 2 / 3 (60분)",
    aegl2Times: "AEGL-2 10분 · 30분 · 60분 · 4시간 · 8시간",
    erpgLine: "ERPG-1 / 2 / 3 (DOE PAC 경유)",
    pacLine: "PAC-1 / 2 / 3 (60분)",
    noErpg: "ERPG 값이 없습니다. 같은 1시간 기준인 PAC 를 보입니다.",
    noAegl: "AEGL 값이 없습니다. PAC 를 보입니다.",
    more: "물질 상세 비상대응 기준 패널에서 보기",
  },
  // 검색어 낱말(검색어 끝·앞, 띄어 쓴 경계). 물성 답(factsParseQuery)과 같은 모양 { props: { 종류: { words } } }.
  query: {
    props: {
      aegl: { words: ["AEGL", "AEGL-1", "AEGL-2", "AEGL-3", "급성노출지침", "급성노출 지침수준"] },
      erpg: { words: ["ERPG", "ERPG-1", "ERPG-2", "ERPG-3", "비상대응계획지침"] },
      pac: { words: ["PAC", "PAC-1", "PAC-2", "PAC-3", "TEEL", "보호조치기준"] },
      all: { words: ["비상대응기준", "비상대응 기준", "비상 노출기준", "비상노출기준"] },
    },
    substanceTrail: ["의"],
  },
};

Object.assign(window, { EL_LABELS_KO });
