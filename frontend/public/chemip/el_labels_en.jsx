// Emergency exposure guidelines (AEGL, ERPG, PAC), English wording (EL_LABELS_EN, same shape as EL_LABELS_KO) → EL_LABELS.
// Values are published reference values with their sources; no "compliant / exceeds" wording (screening, preliminary review).

const EL_LABELS_EN = {
  heading: { ko: "Emergency exposure guidelines", en: "" },
  sourceNote: "EPA AEGL · DOE PAC Rev. 29 (ERPG via DOE PAC) · RIVM probit",
  count: (n) => `${Number(n || 0).toLocaleString("en-US")} guideline set${Number(n) === 1 ? "" : "s"}`,
  none: "No AEGL, ERPG or PAC data has been collected for this substance.",
  disclaimer: "Reference values for a single emergency exposure of the general public (not workplace limits). Screening for preliminary review only; the statutory off-site consequence assessment (Korea) requires NICS KORA.",
  aegl: {
    title: "AEGL (US EPA, single exposure of the general public)",
    tier: (k) => `AEGL-${k}`,
    times: { "10min": "10 min", "30min": "30 min", "60min": "60 min", "4h": "4 h", "8h": "8 h" },
    status: { Final: "Final", Interim: "Interim", Proposed: "Proposed" },
    nr: "NR",
    nrTitle: "Not recommended (insufficient data)",
    nd: "ND",
    ndTitle: "Not determined under normal exposure scenarios",
    lelTitle: { "*": "Above 10 % of the LEL — consider the explosion hazard too", "**": "Above 50 % of the LEL — extreme explosion safety considerations", "***": "Above 100 % of the LEL — extreme explosion safety considerations" },
    lel: (v, u) => `Lower explosive limit (LEL) ${v} ${u}`,
    page: "EPA values page",
    tsd: "Technical support document (TSD)",
  },
  pac: {
    title: "PAC (US DOE Rev. 29, 60 min)",
    tier: (k) => `PAC-${k}`,
    basis: "Basis",
    families: { AEGL: "AEGL", ERPG: "ERPG", TEEL: "TEEL" },
    flagTitle: { "*": "10 % to under 50 % of the LEL", "**": "50 % to under 100 % of the LEL", "***": "100 % of the LEL or more" },
  },
  erpg: {
    title: "ERPG (AIHA, 60 min) — via DOE PAC Rev. 29",
    tier: (k) => `ERPG-${k}`,
    via: "AIHA ERPG values as reproduced in DOE PAC Rev. 29 (no AIHA documentation is reproduced)",
    surrogate: "ERPG of another chemical applied by DOE",
    none: "No ERPG",
    noneNote: "DOE PAC does not use an ERPG for this chemical (AEGL or TEEL basis). AIHA ERPG documents are not reproduced.",
  },
  endpoint: {
    title: "Toxic endpoint (reference)",
    hint: "Endpoint order used for Korean off-site screening: ERPG-2 → AEGL-2 (60 min) → PAC-2",
    via: { erpg: "ERPG-2", aegl: "AEGL-2 (60 min)", pac: "PAC-2" },
  },
  probit: {
    title: "Lethal probit (RIVM)",
    line: (a, b, n) => `Pr = ${a} + ${b} · ln(C^${n} · t), C in mg/m³, t in min`,
    calc: "Open in the toxic probit calculator",
    status: { "inhoudelijk vastgesteld": "established", voorgesteld: "proposed" },
  },
  oel: {
    title: "Compared with workplace limits",
    link: "Go to the exposure-limit table",
    hint: "Workplace limits (repeated 8-hour exposure) and emergency guidelines (single exposure) serve different purposes.",
    twa: (src) => `${src} TWA`,
    idlh: "NIOSH IDLH",
    aegl2: "AEGL-2 60 min",
    pac2: "PAC-2",
  },
  unitNote: (mw) => `≈ marks a value converted with molar mass ${mw} g/mol at 25 °C and 1 atm (24.45 L/mol).`,
  sources: {
    epa_aegl: "EPA AEGL",
    doe_pac_rev29: "DOE PAC Rev. 29",
    rivm_probit: "RIVM Probitrelaties",
  },
  open: "Source",
  exportedAt: (d) => `Data compiled ${d}`,
  answer: {
    title: (kind, name) => `${kind} · ${name}`,
    kinds: { aegl: "AEGL", erpg: "ERPG", pac: "PAC", all: "Emergency exposure guidelines" },
    aeglLine: "AEGL-1 / 2 / 3 (60 min)",
    aegl2Times: "AEGL-2 at 10 min · 30 min · 60 min · 4 h · 8 h",
    erpgLine: "ERPG-1 / 2 / 3 (via DOE PAC)",
    pacLine: "PAC-1 / 2 / 3 (60 min)",
    noErpg: "No ERPG for this substance. Showing the PAC, also a 1-hour value.",
    noAegl: "No AEGL for this substance. Showing the PAC.",
    more: "Open the emergency guidelines panel",
  },
  query: {
    props: {
      aegl: { words: ["AEGL", "AEGL-1", "AEGL-2", "AEGL-3", "acute exposure guideline levels", "acute exposure guideline level"] },
      erpg: { words: ["ERPG", "ERPG-1", "ERPG-2", "ERPG-3", "emergency response planning guidelines"] },
      pac: { words: ["PAC", "PAC-1", "PAC-2", "PAC-3", "TEEL", "protective action criteria"] },
      all: { words: ["emergency exposure guidelines", "emergency exposure limits", "emergency exposure guideline"] },
    },
    substanceTrail: ["of"],
  },
};

const EL_LABELS = langPick(EL_LABELS_KO, EL_LABELS_EN);

Object.assign(window, { EL_LABELS_EN, EL_LABELS });
