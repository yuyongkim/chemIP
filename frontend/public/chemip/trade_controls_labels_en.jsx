// English labels for the 규제·인허가 / 수출입 tab — same shape as TRADE_LABELS_KO (trade_controls_labels.jsx).
// Missing keys fall back to Korean (langMerge, lang.jsx). Screen code reads TRADE_LABELS, chosen here.

const tcEnCount = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const TRADE_LABELS_EN = {
  tabLabel: "Regulations, permits & trade",
  title: "Regulations, permits & trade",
  noCas: "This substance has no CAS number, so its regulations cannot be looked up.",
  loading: "Loading…",
  errors: { invalid_cas: "The CAS number format is invalid.", invalid_direction: "The import/export direction is invalid." },
  blocks: {
    domestic: { title: "Korean regulations · regardless of direction", hint: "Laws and permits that apply when this substance is manufactured, handled or stored in Korea." },
    trade: { title: "Import & export" },
  },
  directions: {
    import: { label: "Import", phrase: (name, c) => `Importing ${name} into Korea${c ? ` from ${c}` : ""}` },
    export: { label: "Export", phrase: (name, c) => `Exporting ${name} from Korea${c ? ` to ${c}` : ""}` },
  },
  directionGroup: "Direction",
  countryLabel: "Counterpart country",
  countryNone: "No counterpart country (Korean obligations only)",
  customs: "Customs confirmation",
  customsHint: "Requirements confirmed by the head of customs at clearance (Customs Act, Article 226)",
  sections: {
    krLaw: { title: "Korean regulations by law", empty: "This substance is not on any of the collected Korean law lists.", lists: n => tcEnCount(n, "law") },
    permits: { title: "Permits & notifications", empty: "No permit or notification requirements were found for this substance.", condition: "Condition" },
    obligations: { title: "Korean import/export obligations", empty: "No Korean obligations were found for this substance and direction." },
    unverified: { title: "Items under review", hint: "These items have not yet been checked against the source text. Use them for reference only." },
    lists: {
      title: "Controlled lists", empty: "Not listed in the CWC schedules, the Australia Group lists or the drug precursor lists.", count: n => tcEnCount(n, "list"),
      otherDirection: names => `No controlled list applies in this direction. Listed for the other direction: ${names}. Switch import/export above for details.`,
    },
    hs: {
      title: "HS codes",
      empty: "No HS code is linked to this CAS number.",
      hskTitle: "Korean HSK10 candidates · reference",
      hskHint: "The Korea Customs Service publishes no CAS-to-HSK concordance, so HSK10 codes under the same HS6 heading are shown as candidates only.",
      notBinding: "ECICS classifications are for reference only and are not legally binding. A binding classification requires an advance tariff classification ruling from the Korea Customs Service.",
      attribution: "Sources: European Commission, DG TAXUD, ECICS (CC BY 4.0) · Korea Customs Service HS codes (KOGL Type 1)",
    },
    destination: {
      title: { destination_import: "Lists to check for import into the counterpart country", origin: "Listings in the country of origin (counterpart) · reference" },
      pick: "Select a counterpart country to see its listings together with the international convention lists.",
      empty: "Not on any of the collected counterpart-country or international convention lists.",
    },
    intlLists: {
      title: "Counterpart-country law lists",
      empty: "Not on any of the collected counterpart-country law lists (EU, US, China, Japan, etc.).",
      absent: "Not listed",
      obligation: "Exporter / importer actions",
      license: "Data terms of use:",
    },
    kotra: { query: q => `Search term: ${q}`, title: "KOTRA import restrictions", empty: "No matching products in the KOTRA import restriction data.", error: "Could not load KOTRA import restrictions.", offline: "KOTRA import restrictions are queried live and cannot be reached right now. Please check again later." },
  },
  summary: {
    title: "At a glance",
    laws: { label: "Korean laws", value: n => (n ? tcEnCount(n, "law") : "None"), sub: n => `On ${tcEnCount(n, "substance list")}` },
    permits: { label: "Permits & notifications", value: n => tcEnCount(n, "item"), none: "None" },
    obligations: {
      label: { import: "Obligations on import", export: "Obligations on export" },
      value: n => tcEnCount(n, "item"),
      customs: n => `${n} subject to customs confirmation`,
      none: "No obligations",
    },
    controls: {
      label: "Controlled lists (trade controls)", yes: n => `On ${tcEnCount(n, "list")}`, no: "None", sub: "CWC · Australia Group · drug precursors",
      otherDirection: { import: "on import", export: "on export" },
    },
    hs: "HS",
    hsNone: "HS code not identified",
    preparing: "Data in preparation",
    jump: "View details",
  },
  listShort: { CWC_SCHEDULE: "Chemical Weapons Convention (CWC)", AUSTRALIA_GROUP_CW_PRECURSORS: "Australia Group · strategic item 1C350", DRUG_PRECURSOR: "Drug precursors" },
  // The collector writes Korean kinds (kr_safety/permit_kinds.py); older files used English codes. Both map to English here.
  kinds: {
    permit: "Permit", approval: "Approval", report: "Notification", obligation: "Compliance duty", obligation_report: "Implementation & reporting",
    report_review: "Submission & review",
    "허가": "Permit", "승인": "Approval", "신고": "Notification", "준수의무": "Compliance duty", "실시·보고": "Implementation & reporting",
    "제출·심사": "Submission & review", "제출": "Submission", "제한": "Restriction", "등록": "Registration", "금지": "Prohibition",
    "확인": "Confirmation", "공표": "Public disclosure", "자가확인·표시": "Self-check & labelling", "확인·신고": "Confirmation & notification",
    "검사/승인": "Inspection / approval", "검사": "Inspection", "의무/검인": "Obligation / verification",
  },
  // Same tones as the Korean list, matched case-insensitively on the English kind text.
  kindTones: [["prohibit", "hazard"], ["permit", "hazard"], ["restrict", "hazard"], ["approv", "accent"], ["notif", "accent"], ["regist", "accent"], ["submi", "accent"]],
  collapse: { expandAll: "Expand all", collapseAll: "Collapse all", lists: n => tcEnCount(n, "list"), items: n => tcEnCount(n, "item"), more: n => `Show ${n} more` },
  quote: { show: n => `Show legal text excerpts (${n})`, supporting: "Related provisions" },
  count: n => tcEnCount(n, "item"),
  fields: {
    who: "Responsible party", when_required: "When", timing: "When", agency: "Authority", authority: "Authority", threshold: "Threshold",
    legal_basis: "Legal basis", note: "Note", amended_on: "Amended", obligations: "Obligations",
  },
  matchedBy: { ncis_category: "NCIS category", list: "Listed on", list_id: "Listed on", any_substance: "All chemicals" },
  supportingTitle: "Related provisions",
  sourceFiles: {
    "kr_lists/": "Korean substance lists by law",
    "kr_permits_env.json": "Environmental permits & notifications",
    "kr_permits_safety.json": "Safety permits & notifications",
    "kr_permits_product.json": "Product & transport permits & notifications",
    "kr_rules.json": "Korean import/export obligation rules",
    "cwc_schedules.json": "Chemical Weapons Convention (CWC) schedules",
    "australia_group.json": "Australia Group control lists",
    "drug_precursors.json": "Drug precursors",
    "hs_codes.sqlite": "HS codes",
    "intl_lists/": "Counterpart-country substance lists by law",
  },
  sourceStatus: { present: "available", missing: "in preparation", invalid: "format error" },
  sourceSummary: { all: n => `All ${n} data files available`, some: (ok, n) => `${ok} of ${n} data files available · the rest are in preparation or have format errors` },
  footer: "Listings and rule matches are guidance based on NCIS categories and list memberships. Quantity conditions are not evaluated. Confirm actual notification and permit requirements against the source text and with the competent authority.",
};

const TRADE_LABELS = langPick(TRADE_LABELS_KO, TRADE_LABELS_EN);

Object.assign(window, { TRADE_LABELS_EN, TRADE_LABELS });
