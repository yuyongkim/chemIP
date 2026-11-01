// Patents tab "Related patents (published patent document mapping)" — English labels, same shape as patent_mapping_labels.jsx.
// Country names come from INTL_JURISDICTIONS (intl_regions.jsx) first; only patent offices and former states are here.

const PM_EN_COUNT = (n) => Number(n || 0).toLocaleString("en-US");

const PATENT_MAPPING_LABELS_EN = {
  heading: { ko: "Related patents (published patent document mapping)", en: "Related patents (published patent document mapping)" },
  total: (n) => `${PM_EN_COUNT(n)} in total`,
  provenance: "Source: published patent documents (as published by each national patent office), mapped automatically by substance name and CAS match. Some matches may be false positives.",
  none: "No published patent document mapping is available for this substance.",
  loading: "Loading…",
  byJurisdiction: { ko: "By jurisdiction", en: "By jurisdiction" },
  byYear: { ko: "By year", en: "By year" },
  earlierYears: (from, n) => `${PM_EN_COUNT(n)} before ${from}`,
  filterLabel: "Jurisdiction",
  filterRecent: "Most recent (all jurisdictions)",
  filterOption: (name, n) => `${name} · ${PM_EN_COUNT(n)}`,
  listRecent: (n) => `Latest ${n}`,
  listJurisdiction: (name, from, to, total) => `${name} · ${from}–${to} of ${PM_EN_COUNT(total)} (newest first)`,
  truncated: (kept, total) => `Only the latest ${PM_EN_COUNT(kept)} are provided for this jurisdiction (${PM_EN_COUNT(total)} in total).`,
  cols: ["Patent number", "Title", "Jurisdiction", "Year"],
  open: "View original",
  prev: "← Previous",
  next: "Next →",
  page: (p, n) => `${p} / ${n}`,
  jurisdictionAria: (name) => `Show only ${name} patents`,
};

const PATENT_OFFICE_NAMES_EN = {
  EP: "European Patent Office", WO: "International application (WIPO)", EA: "Eurasian Patent Office",
  AP: "African Regional Intellectual Property Organization (ARIPO)", OA: "African Intellectual Property Organization (OAPI)",
  SU: "Soviet Union (former)", DD: "East Germany (former)", CS: "Czechoslovakia (former)", YU: "Yugoslavia (former)",
  DE: "Germany", FR: "France", ES: "Spain", RU: "Russia", IT: "Italy", UA: "Ukraine", PL: "Poland", HU: "Hungary",
  AT: "Austria", BE: "Belgium", DK: "Denmark", SE: "Sweden", FI: "Finland", NO: "Norway", PT: "Portugal", GR: "Greece",
  CZ: "Czechia", SK: "Slovakia", RO: "Romania", BG: "Bulgaria", IL: "Israel", ZA: "South Africa", NZ: "New Zealand",
  MY: "Malaysia", PH: "Philippines", BR: "Brazil", AR: "Argentina", HK: "Hong Kong", IE: "Ireland",
};

const PATENT_MAPPING_LABELS = langPick(PATENT_MAPPING_LABELS_KO, PATENT_MAPPING_LABELS_EN);
const PATENT_OFFICE_NAMES = langPick(PATENT_OFFICE_NAMES_KO, PATENT_OFFICE_NAMES_EN);

Object.assign(window, { PATENT_MAPPING_LABELS_EN, PATENT_OFFICE_NAMES_EN, PATENT_MAPPING_LABELS, PATENT_OFFICE_NAMES });
