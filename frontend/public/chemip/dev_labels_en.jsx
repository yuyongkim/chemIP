// English for the R&D screen (DEV_LABELS_KO in dev_labels.jsx). Same shape.

const DEV_LABELS_EN = {
  title: "R&D",
  lede: "Screens for research papers, peer review and contributors. You do not need them to check a substance's regulations.",
  cards: [
    { k: "research", icon: "book", title: "Research paper screen", desc: "Reproduces the papers and figures related to ChemIP." },
    { k: "benchmark", icon: "spark", title: "Benchmark", desc: "Search and recommendation accuracy results, plus labeling material." },
    { k: "mobile", icon: "map", title: "Mobile mock-up", desc: "Phone screen design mock-ups (not connected to live data)." },
  ],
  open: "Open",
  overviewTitle: "Developer overview",
  overviewDesc: "Data source setup, API list, installation, roadmap and known limitations.",
  showOverview: "Expand",
  hideOverview: "Collapse",
};

const DEV_LABELS = langPick(DEV_LABELS_KO, DEV_LABELS_EN);

Object.assign(window, { DEV_LABELS_EN, DEV_LABELS });
