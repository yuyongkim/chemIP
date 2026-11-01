// "Rules by hazard class" (reference only) — English text (CATRULE_LABELS_EN) → CATRULE_LABELS, the object the screen reads.
// No "applies / violation / compliant" verdict wording. Rule names and quantities come from the data (catrule_data.jsx, APL_PSM, APL_HAZMAT).

const CATRULE_LABELS_EN = {
  heading: { ko: "Rules by hazard class", en: "Rules by hazard class" },
  meta: (n) => `Reference only · screening · ${n} ${n === 1 ? "rule" : "rules"}`,
  metaLoading: "Reference only · loading…",
  intro: "Rules set by hazard classification (GHS), flash point or flammability limits rather than by a named substance list. Read them apart from the named lists above (international regulation, Korean lists). Whether a site is covered depends on quantities, process conditions and exemptions.",
  none: "No rule set by this substance's classification or properties was found (the data may be missing).",
  noCas: "No CAS number, so rules by hazard class cannot be shown.",
  status: { applies: "By classification", check: "Needs checking", named: "Named list", msds: "MSDS section 15" },
  titles: {
    kr_psm_named: (ref) => `Process safety report (PSM), Annex 13 item ${ref.no}: ${ref.en}`,
    kr_psm_gas: () => "Process safety report (PSM), Annex 13 item 1: flammable gas",
    kr_psm_liquid: () => "Process safety report (PSM), Annex 13 item 2: flammable liquid",
    b9: (ref) => `Dangerous-substance reference quantity, Annex 9 ${ref.noEn}: ${ref.en}`,
    kr_hazmat: (ref) => `Dangerous substance, ${APL_HAZMAT.classes[ref.cls].en}: ${ref.en}`,
    us_psm_flam: () => "OSHA process safety management (PSM): flammable gas or liquid",
    seveso_named: () => "Seveso III Annex I Part 2 named substance",
    seveso: (ref) => `Seveso III Annex I Part 1 ${ref.code}: ${ref.en}`,
  },
  qty: {
    kr_psm_named: (ref) => `Threshold ${catFmtNum(ref.q, 0)} kg`,
    kr_psm_flam: (ref) => `Threshold ${catFmtNum(ref.handle, 0)} kg manufacture/handling · ${catFmtNum(ref.store, 0)} kg storage`,
    b9: (ref) => `Reference quantity ${catFmtNum(ref.q, 0)} ${ref.unit}`,
    kr_hazmat: (ref) => `Designated quantity ${catFmtNum(ref.qty, 0)} ${ref.unit}`,
    us_psm_flam: (ref) => `${catFmtNum(ref.lb, 0)} lb (${catFmtNum(ref.kg, 1)} kg) or more in one location`,
    seveso_named: () => "Part 2 quantities take precedence over Part 1 (Annex I introduction) — see the Seveso III entry under international regulation",
    seveso: (ref) => `Lower tier ${catFmtNum(ref.lower, 0)} t · upper tier ${catFmtNum(ref.upper, 0)} t`,
  },
  basis: {
    psmBasis: (v) => (!v ? "" : v.k === "lfl" ? `LFL ${catFmtNum(v.lfl)} %${v.ufl != null ? `, UFL ${catFmtNum(v.ufl)} %` : ""} (LFL 13 % or less, or a range of 12 points or more)` : v.k === "flash" ? `Flash point ${catFmtNum(v.flash)} °C (60 °C or lower)` : ""),
    hazard: (v) => `Classification: ${v.list.map(h => catHazardName(h)).join(", ")}`,
    hazardSrc: (v) => `${v.src === "clp" ? "EU harmonised classification" : "KOSHA MSDS classification"}: ${v.list.map(h => catHazardName(h, v.src === "clp" ? "clp" : "")).join(", ")}`,
    flashBp: (v) => `Flash point ${catFmtNum(v.flash)} °C${v.bp != null ? ` · boiling point ${catFmtNum(v.bp)} °C` : ""}`,
    flash: (v) => `Flash point ${catFmtNum(v.flash)} °C (below ${catFmtNum(v.limit)} °C)`,
    s15: (v) => `MSDS section 15: ${v.text}`,
  },
  notes: {
    limitsSwapped: "The MSDS section 9 lower flammability limit is above the upper one, so the limits were not used.",
    cityGas: "Fuel city gas (85 % methane or more, below 0.1 MPa): handling threshold 50,000 kg (Annex 13, note 2).",
    noProperty: "No MSDS section 9 value, so only the classification was used. Check the flammability criteria (Annex 13, notes 1 and 3).",
    dailyMax: "The reference quantity is the maximum daily quantity manufactured or handled in the equipment (Annex 9 notes).",
    hz_solubleUnknown: "Water solubility is not stated, so it was taken as water-insoluble.",
    hz_multiQty: "This item has several designated quantities; the smallest is shown.",
    hz_type5: "For Class 5, type 1 or type 2 is decided by test results.",
    hz_itemUnknown: "The item could not be identified.",
    alsoAppendixA: "Also named in Appendix A (see the OSHA PSM Appendix A entry under international regulation).",
    sourcesDiffer: "The KOSHA and EU harmonised flammable-gas categories differ; check the classification.",
    atmTank: "Exempt: flammable liquids in atmospheric tanks kept below their normal boiling point without chilling, and hydrocarbon fuels used solely as workplace fuel ((a)(1)(ii)(A)–(B)).",
    noClp: "Not in the EU harmonised classification (CLP Annex VI); based on the KOSHA classification for reference.",
    liquefied: () => `When held liquefied, Part 2 entry ${CATRULE_DATA.sevesoLiquefied.entry} (liquefied flammable gases incl. LPG, and natural gas, ${catFmtNum(CATRULE_DATA.sevesoLiquefied.lower, 0)} / ${catFmtNum(CATRULE_DATA.sevesoLiquefied.upper, 0)} t) takes precedence.`,
    p5ab: "Category 2 or 3 liquids kept above their boiling point fall under P5a (10 / 50 t); under particular conditions such as high pressure or temperature, P5b.",
  },
  clpLine: (codes, atp) => `EU harmonised classification (CLP Annex VI${atp ? `, ${atp} table` : ""}): ${codes.join(" · ")}`,
  clpNone: "This CAS is not in the EU harmonised classification (CLP Annex VI).",
  oldEuNote: "The EU classification in MSDS section 15 (risk phrases such as F+; R12) uses the repealed Directive 67/548/EEC notation. For the current EU classification see the CLP Annex VI line above.",
  source: "Source ↗",
  disclaimer: "Reference screening only, for preliminary review. It does not decide coverage; check aggregation, exemptions and mixture rules in the source text and with the competent authority. Quantities are transcribed from each law or directive.",
  calcLink: "Enter quantities in the applicability checker →",
};

const CATRULE_LABELS = langPick(CATRULE_LABELS_KO, CATRULE_LABELS_EN);

Object.assign(window, { CATRULE_LABELS_EN, CATRULE_LABELS });
