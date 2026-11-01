// English-screen version of the developer overview text (DEV_OVERVIEW_KO in dev_overview_data.jsx). Only the parts that
// are Korean there are replaced; arrays are derived from the Korean data so values stay in one place.

const DEV_OVERVIEW_EN = {
  showKr: false,
  hero: {
    ledeA: "Government data that normally takes several portals to collect, ",
    ledeB: " gathers in a single query: KOSHA safety data, KIPRIS patents, KOTRA trade, MFDS drugs and PubMed literature. It is open source and self-hostable, built for chemical-safety work in environments where data must not leave the premises.",
    start: "Start a chemical search",
    openLabel: "Open a detail page",
    directSearch: "Search directly",
  },
  console: {
    queries: DEV_OVERVIEW_KO.console.queries.map((q, i) => (i === 0 ? { q: "acetone", label: "CAS 67-64-1 · chemical" } : q)),
  },
  // "Substances · 화학물질" → "Substances"
  stats: DEV_OVERVIEW_KO.stats.map(s => ({ ...s, label: s.label.split(" · ")[0] })),
};

const DEV_OVERVIEW = langPick(DEV_OVERVIEW_KO, DEV_OVERVIEW_EN);

Object.assign(window, { DEV_OVERVIEW_EN, DEV_OVERVIEW });
