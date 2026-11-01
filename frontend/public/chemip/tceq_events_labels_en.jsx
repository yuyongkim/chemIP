// Texas emission events panel (product_tceq_events.jsx) — English labels (TCEQ_EVENTS_LABELS_EN), same shape as the Korean file.
// Wording limits (as in tceq_events_labels.jsx): never "unpermitted" or "violation" — the report's permit fields are not
// used for any judgement; no per-facility probabilities; emission-point kinds are where the release left, not causes;
// a flare limit of 0 is the operators' reporting practice, not a missing limit.

const TCEQ_EVENTS_LABELS_EN = {
  heading: { ko: "Texas emission event reports", en: "Texas emission event reports" },
  sourceNote: "TCEQ Air Emission Event Reports",
  missing: "No index",
  count: (n) => `${n} ${n === "1" || n === 1 ? "report" : "reports"}`,
  missingBody: "The Texas emission event index is not available.",
  noneBody: "This substance does not appear in the Texas emission event reports.",
  stats: {
    events: { m: "Reports", sub: (a, b) => (a && b ? (a === b ? `${a}` : `${a}–${b}`) : "") },
    lbs: { m: "Reported emissions", sub: "Sum of values reported in pounds" },
    counties: { m: "Counties", sub: (rows) => rows.slice(0, 3).map(([k, n]) => `${k} ${n}`).join(" · ") },
    points: { m: "Emission points", sub: "Emission points listing this substance" },
  },
  kindsTitle: "Emission points by kind",
  kindsAside: "Where the pollutant was released. These are not event causes.",
  kindCount: (n, pct) => `${n} · ${pct}%`,
  epcLink: (label) => `EPC ${label} design standards ↗`,
  noDiscipline: "No matching design discipline",
  recentTitle: "Recent reports",
  recentAside: (n) => `Latest ${n}`,
  qty: (v) => `${v} lb`,
  causeLabel: "Cause as described in the report (excerpt): ",
  eventLink: (n) => `TCEQ event ${n} ↗`,
  infoLink: "About TCEQ emission event reporting ↗",
  note: (src) => `Source: ${src}.`,
  pointKindNames: {
    flare: "Flare",
    tank: "Tank / sump",
    relief: "Relief valve / rupture disc",
    leak: "Leak / piping / fugitive",
    other: "Other (stack, heater, etc.)",
  },
  notes: [
    "Only report lines whose substance name, as written by the operator in the TCEQ emission event report, could be resolved to this CAS number were counted (lines naming a substance group or an ambiguous name were excluded).",
    "Total emissions add up only the reported values in pounds (POUNDS). Lines in other units (% opacity, LBS/HR, etc.) are not included in the total.",
    "Emission-point kinds show where the pollutant was released to air; they do not indicate the cause of an event.",
    "The permit-related fields of the report were not used for any judgement. A flare limit of 0 is how operators customarily fill in the report; it does not mean there is no limit.",
    "Report counts do not indicate the likelihood of an event at any facility.",
  ],
};

const TCEQ_EVENTS_LABELS = langPick(TCEQ_EVENTS_LABELS_KO, TCEQ_EVENTS_LABELS_EN);

Object.assign(window, { TCEQ_EVENTS_LABELS_EN, TCEQ_EVENTS_LABELS });
