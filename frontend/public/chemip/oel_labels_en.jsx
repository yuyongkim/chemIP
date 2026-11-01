// Exposure-limit comparison, English wording (OEL_LABELS_EN, same shape as OEL_LABELS_KO) → OEL_LABELS.
// Values are shown as published reference values with their sources; no "compliant / exceeds" wording.

const OEL_LABELS_EN = {
  heading: { ko: "Exposure limits", en: "" },
  sourceNote: "MOEL notice · OSHA · NIOSH · EU directives",
  count: (n) => `${Number(n || 0).toLocaleString("en-US")} source${Number(n) === 1 ? "" : "s"}`,
  none: "No exposure-limit data has been collected for this substance. Check the sources linked below.",
  disclaimer: "Reference values published by each body, shown with their source. This is not a legal compliance judgement; check the original text for scope, sampling method and transitional rules.",
  cols: { source: "Jurisdiction · source", TWA: "TWA (8 h)", STEL: "STEL (short-term)", C: "C (ceiling)", IDLH: "IDLH", note: "Notation", asOf: "As of" },
  kindHints: {
    TWA: "Time-weighted average limit (8 hours)",
    STEL: "Short-term exposure limit (usually 15 min)",
    C: "Ceiling limit (not to be exceeded at any time)",
    IDLH: "Immediately dangerous to life or health (NIOSH)",
  },
  sources: {
    kr_moel_notice: "MOEL notice",
    kosha_msds_s8: "KOSHA MSDS §8",
    us_osha_z: "OSHA PEL",
    us_osha_specific: "OSHA PEL (specific standard)",
    us_niosh_npg: "NIOSH REL",
    eu_boelv: "EU binding (BOELV)",
    eu_ioelv: "EU indicative (IOELV)",
  },
  sourceTitle: (name, license) => `${name}${license ? ` — ${license}` : ""}`,
  unit: { label: "Units", source: "As published", ppm: "In ppm", mg: "In mg/m³" },
  unitNoMw: "Molar mass unavailable, so values stay in their published units.",
  derivedNote: (mw) => `Values marked ≈ are converted with a molar mass of ${mw} g/mol at 25 °C and 1 atm (24.45 L/mol). Dusts, fumes and mists are not converted.`,
  derivedMark: "≈",
  derivedTitle: "Converted from the published value",
  calcLink: "Open in the ppm ↔ mg/m³ calculator",
  linksTitle: "Sources shown as links only (no values stored)",
  links: {
    acgih_tlv: { name: "ACGIH TLV", why: "Copyrighted, so no values are stored. Check them at ACGIH." },
    gestis_ilv: { name: "GESTIS International Limit Values (IFA)", why: "Republishing is not permitted, so no values are stored. Check national values in GESTIS-ILV." },
  },
  open: "Source",
  asOfNone: "—",
  empty: "—",
  exportedAt: (d) => `Data compiled ${d}`,
  search: {
    title: (name) => `${name} exposure limits`,
    sub: (cas, n) => `CAS ${cas} · ${n} source${Number(n) === 1 ? "" : "s"} compared`,
    desc: "Reference values by source. The substance page's exposure-limit table shows units, dates and source links.",
    badge: "Exposure limits",
  },
  queryWords: ["occupational exposure limits", "occupational exposure limit", "exposure limits", "exposure limit", "OEL", "PEL", "REL", "TLV", "TWA", "STEL", "IDLH"],
};

const OEL_LABELS = langPick(OEL_LABELS_KO, OEL_LABELS_EN);

Object.assign(window, { OEL_LABELS_EN, OEL_LABELS });
