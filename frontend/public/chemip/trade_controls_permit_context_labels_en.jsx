// English labels for the "실제 통합허가 사례" section — same shape as KR_PERMIT_CONTEXT_LABELS_KO (trade_controls_permit_context_labels.jsx).
// Missing keys fall back to Korean (langMerge, lang.jsx). Section code reads KR_PERMIT_CONTEXT_LABELS, chosen here.

const kpcEnCount = (n, one, many = `${one}s`) => `${Number(n).toLocaleString("en-US")} ${n === 1 ? one : many}`;

const KR_PERMIT_CONTEXT_LABELS_EN = {
  numberLocale: "en-US",
  title: "Actual integrated permit cases",
  hint: "Permitted emission limits per outlet, taken from integrated environmental permit review reports. These are permit conditions, not actual emissions.",
  loading: "Loading integrated permit cases…",
  count: n => kpcEnCount(n, "limit"),
  unavailable: "Integrated permit case data is not available yet.",
  empty: "This substance (or its substance group) was not found in the emission limit tables of the integrated permit review reports.",
  relation: {
    direct: "This substance",
    family_parent: g => `Group limit · ${g}`,
    related: (g, as) => `Group limit · ${g}${as ? ` (${as})` : ""}`,
  },
  relationHint: {
    family_parent: "The review reports set limits for 'X and its compounds', so this limit covers the compounds as a whole rather than the element itself.",
    related: "This is a limit for a substance group that includes this substance, not a limit for this substance alone.",
  },
  sites: (n, outlets) => `${kpcEnCount(n, "site")} with emission limits · ${kpcEnCount(outlets, "outlet")}`,
  years: (a, b) => (a && b ? (a === b ? `Permitted ${a}` : `Permitted ${a}–${b}`) : ""),
  median: (v, unit) => `Median limit ${v} ${unit}`,
  o2: o => `reference O₂ ${o}%`,
  range: (lo, hi) => `range ${lo}–${hi}`,
  iqr: (a, b) => `IQR ${a}–${b}`,
  rows: n => kpcEnCount(n, "record"),
  otherUnits: "Other bases",
  industries: "By industry",
  industryItem: (ind, n, med) => `${ind}: ${kpcEnCount(n, "site")}${med ? ` (${med})` : ""}`,
  durationTitle: "Integrated permit processing time",
  // pt is the source post_type (Korean); the English text names it directly.
  durationOverall: (pt, med, n, a, b) => `Integrated permit: median ${med} days (n=${n}, IQR ${a}–${b} days)`,
  durationIndustry: "Main industries",
  durationIndustryItem: (ind, med, n) => `${ind} ${med} days (n=${n})`,
  durationNote: "Counted from the formal application date (or the filing date if absent) to the permit date; the pre-consultation period before that is not included.",
  durationHint: (med, n, a, b) => `Actual processing time: integrated permit median ${med} days (n=${n}, IQR ${a}–${b} days) · excludes pre-consultation`,
  durationHintSource: "Compiled from IEPS review reports",
  emissionsTitle: "CleanSYS stack TMS annual emissions",
  emissionsItem: (label, year, sites, kg) => `${label} ${year}: ${sites} sites · ${kg} kg`,
  emissionsNote: "Only stacks fitted with TMS are counted, so this is not the total emissions of each site.",
  samples: n => `View permit cases (${n})`,
  sampleDate: { permit: d => `Permitted ${d}`, post: d => `Posted ${d}` },
  sampleDecision: d => `Decision no. ${d}`,
  sampleLink: "IEPS original ↗",
  namesSeen: "Names in review reports",
  unknownIndustry: "Industry unknown",
  sourceTitle: "Sources",
  sources: [
    { label: "National Institute of Environmental Research, Integrated Environmental Permit System (IEPS) disclosures", key: "ieps_board_url" },
    { label: "Korea Environment Corporation CleanSYS", key: "cleansys_url" },
  ],
  retrieved: r => `Retrieved ${r}`,
};

const KR_PERMIT_CONTEXT_LABELS = langPick(KR_PERMIT_CONTEXT_LABELS_KO, KR_PERMIT_CONTEXT_LABELS_EN);

Object.assign(window, { KR_PERMIT_CONTEXT_LABELS_EN, KR_PERMIT_CONTEXT_LABELS });
