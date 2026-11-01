// English for the PRTR facility map (same shape as PRTR_MAP_LABELS_KO in prtr_map_labels.jsx) and the screen's PRTR_MAP_LABELS.
// Values are shown as reported; no wording that judges a facility ("risk", "violation", "worst polluters").

const PRTR_MAP_EN_PLURAL = (n, one, many) => `${Number(n).toLocaleString("en-US")} ${Number(n) === 1 ? one : many}`;

const PRTR_MAP_LABELS_EN = {
  title: { ko: "Facility map", en: "Facility map" },
  lede: "Facilities that filed a Korean PRTR (Pollutant Release and Transfer Register) report, by region. Amounts are the annual releases and transfers as reported by each facility.",
  picker: {
    label: "Substance",
    filter: "Filter substances",
    placeholder: "Substance name or CAS (e.g. toluene, 108-88-3)",
    select: "Choose a substance",
    count: (n) => PRTR_MAP_EN_PLURAL(n, "substance with data", "substances with data"),
    none: "No matching substance",
    choose: "Choose a substance",
    popular: "Substances with the most facilities",
    option: (name, cas, n) => `${name} (${cas}) · ${PRTR_MAP_EN_PLURAL(n, "facility", "facilities")}`,
  },
  metrics: { facilities: "Facilities", release_kg: "Releases", transfer_kg: "Transfers" },
  metricAria: "Value shown on the map",
  mapAria: (name, metric) => `${name} — ${metric} by region`,
  mapTitle: (region, value) => `${region}: ${value}`,
  mapHint: "Select a region to list its facilities. You can also pick a region in the table below.",
  mapError: (e) => `The map could not be drawn (${e}). Use the table below.`,
  legend: (metric) => `Legend · ${metric}`,
  legendNone: "No reports",
  stats: { facilities: "Reporting facilities", release: "Total releases", transfer: "Total transfers", year: "Data year" },
  table: {
    caption: "Reporting facilities and reported amounts by region",
    region: "Region",
    facilities: "Facilities",
    release: "Release",
    transfer: "Transfer",
    total: "Total",
    select: (name) => `List facilities in ${name}`,
  },
  region: {
    all: "All of Korea",
    heading: (name, n) => `${name} · ${PRTR_MAP_EN_PLURAL(n, "facility", "facilities")}`,
    clear: "Show all regions",
    sigungu: "Facilities by city / county",
    facilities: "Facilities",
    none: "No reporting facility in this region.",
    sigunguCount: (n) => PRTR_MAP_EN_PLURAL(n, "facility", "facilities"),
  },
  facilityCols: { name: "Facility", sigungu: "City / county", address: "Address", release: "Release", transfer: "Transfer", total: "Total" },
  sortNote: "sorted by reported release + transfer + on-site landfill",
  more: (n) => `Show ${Number(n).toLocaleString("en-US")} more`,
  less: "Collapse",
  substanceLink: "Handling facilities panel of this substance",
  empty: {
    noIndex: "The map data is being prepared.",
    noData: "There are no PRTR facility reports for this substance.",
    loading: "Loading…",
  },
  source: {
    label: "Source",
    year: (y) => `reports for ${y}`,
    listed: (n, r) => `${Number(n).toLocaleString("en-US")} listed / ${Number(r).toLocaleString("en-US")} reporting`,
    boundary: "Boundaries",
    boundaryLicense: "Public Domain",
    note: "Releases and transfers are the annual amounts (kg/year) as reported by each facility. This map makes no judgement about any facility's risk or compliance.",
    unparsed: (n) => `${PRTR_MAP_EN_PLURAL(n, "facility", "facilities")} whose address gives no region are left out of the map and table.`,
  },
  handlersLink: "View the facility map by region",
  usearch: {
    badge: "Facility map",
    sub: (cas, n) => `CAS ${cas} · ${PRTR_MAP_EN_PLURAL(n, "PRTR reporting facility", "PRTR reporting facilities")}`,
    title: (name) => `${name} — facility map`,
    screenTitle: "Facility map",
    screenHint: "PRTR reporting facilities on a regional map and table",
    keywords: ["handling facilities", "facility map", "releases", "transfers", "release and transfer", "by region", "by province", "map", "PRTR"],
  },
};

const PRTR_MAP_LABELS = langPick(PRTR_MAP_LABELS_KO, PRTR_MAP_LABELS_EN);

Object.assign(window, { PRTR_MAP_LABELS_EN, PRTR_MAP_LABELS });
