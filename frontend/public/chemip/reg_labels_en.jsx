// Regulatory lists screen (?view=reg) — English labels, same shape as REG_LABELS_KO (reg_labels.jsx).

const REG_EN_PLURAL = (n, one, many) => `${n} ${String(n) === "1" ? one : many}`;

const REG_LABELS_EN = {
  title: "Regulatory lists",
  intro: "The Korean and international regulatory lists ChemIP knows, with the number of listed substances. Open a list to see its substances.",
  lawLink: "Full text of the Korean laws behind them →",
  groups: {
    kr_law: "Korean lists by statute",
    ncis: "Korean chemical classifications (NCIS)",
    controlled: "Control lists (conventions, strategic goods)",
    intl: "Other countries' lists by statute",
    intl_reg: "Country regulatory database",
  },
  filter: "Filter by list name, law or country",
  filterAria: "Filter lists",
  allJur: "All countries",
  summary: (lists, rows) => `${REG_EN_PLURAL(lists, "list", "lists")} · ${REG_EN_PLURAL(rows, "entry", "entries")}`,
  groupCount: (n) => REG_EN_PLURAL(n, "list", "lists"),
  count: (n, cas) => `${REG_EN_PLURAL(n, "entry", "entries")} · ${cas} CAS`,
  amended: (d) => `amended ${d}`,
  retrieved: (d) => `collected ${d}`,
  noLists: "No list matches.",
  loading: "Loading the lists…",
  unavailable: "The regulatory list data cannot be loaded yet. Please try again later.",
  detail: {
    back: "← Regulatory lists",
    source: "Original ↗",
    license: (s) => `License: ${s}`,
    version: (s) => `Source edition: ${s}`,
    rowFilter: "Find in this list (substance name or CAS)",
    head: { cas: "CAS", name: "Substance", detail: "Details" },
    family: "group",
    openSubstance: (name) => `Open the substance page of ${name}`,
    shown: (from, to, total) => `${from}–${to} of ${total}`,
    matched: (n) => `${REG_EN_PLURAL(n, "matching substance", "matching substances")}`,
    loadingAll: "Loading the whole list…",
    noRows: "No substance matches.",
    notFound: (id) => `List "${id}" was not found.`,
    prev: "Previous",
    next: "Next",
    page: (p, n) => `${p} / ${n}`,
  },
  changes: {
    title: "Recent changes",
    meta: (n) => REG_EN_PLURAL(n, "item", "items"),
    note: "Differences between ChemIP exports of the lists, and official amendment notices (title, date and link only).",
    rss: "RSS feed",
    rssTitle: "Regulatory list changes (RSS)",
    none: "No change has been recorded yet.",
    kinds: { added: "Added", removed: "Removed", modified: "Changed" },
    many: (n) => REG_EN_PLURAL(n, "substance", "substances"),
    sources: {
      chemip_export_diff: "ChemIP list comparison",
      law_go_kr_listmeta: "Korea MOLEG (amendment date of the list's source)",
      law_go_kr_api: "Korea MOLEG Open API",
      federal_register: "US Federal Register",
      echa_candidate_list: "ECHA Candidate List",
    },
    srcWhat: { law_go_kr_listmeta: "Source notice or statute amended" },
    more: "Show more",
    less: "Show less",
    link: "Original ↗",
  },
  usearch: {
    badge: "Regulatory list",
    sub: (jur, n) => `${jur} · ${n} entries`,
  },
};

const REG_LABELS = langPick(REG_LABELS_KO, REG_LABELS_EN);

Object.assign(window, { REG_LABELS_EN, REG_LABELS });
