// English for the EU REACH registration entry (REACH_LABELS_KO in reach_labels.jsx). Same shape and keys.

const REACH_LABELS_EN = {
  listTitle: "EU REACH registered substances — active registrations (ECHA CHEM)",
  ec: "EC number",
  active: "Active registrations",
  activeValue: (n) => n.toLocaleString("en-US"),
  types: { full: "full", intermediate: "intermediate", other: "other" },
  intermediateDetail: (onsite, transported) => `on-site isolated ${onsite} · transported isolated ${transported}`,
  nons: "NONS (notified under Directive 67/548/EEC)",
  tonnage: "Total tonnage band",
  tonnageRange: (lo, hi) => `${lo}–${hi} t per year`,
  tonnageOver: (lo) => `over ${lo} t per year`,
  koUnits: { e8: "", e7: "", e4: "", e3: "" }, // not used: English keeps ECHA's full numbers (reach_format.jsx reachAmount)
  tonnageText: { "intermediate use only": "Intermediate use only", "ceased manufacture": "Ceased manufacture", "no longer valid": "No longer valid" },
  first: "First registration",
  last: "Latest dossier update",
  link: "ECHA CHEM substance page",
  original: (t) => `As printed by ECHA: ${t}`,
  checking: "Checking the registration status on ECHA CHEM…",
  none: (d) => `No ECHA registration on record (checked ${d})`,
  unknown: "ECHA CHEM cannot be reached right now, so the registration status is unknown. Please reopen the page later.",
  ambiguous: "Several ECHA substances carry this CAS number, so one registration status cannot be shown. Check ECHA CHEM directly.",
  checkedAt: (d) => `checked ${d}`,
  bundledAt: (d) => `looked up ${d}`,
  note: "Registered means someone has registered this substance in the EU; it does not replace your own supply chain's registration. For reference only.",
};

const REACH_LABELS = langPick(REACH_LABELS_KO, REACH_LABELS_EN);

Object.assign(window, { REACH_LABELS_EN, REACH_LABELS });
