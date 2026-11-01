// English for the mobile mock-up (MOBILE_LABELS_KO in mobile_labels.jsx). Same shape.

const MOBILE_LABELS_EN = {
  phones: ["01 · SEARCH", "02 · CHEMICAL DETAIL", "03 · AI ANALYSIS"],
  searchTitleA: "Unified",
  searchTitleB: "chemical search",
  searchValue: "acetone",
  recent: "RECENT",
  recentFirst: "acetone",
  browse: "BROWSE",
  chemTitle: "Acetone",
  chemSub: "(CH₃)₂CO · propan-2-one",
  hazards: [
    ["H225", "Highly flammable liquid and vapour"],
    ["H319", "Causes serious eye irritation"],
    ["H336", "May cause drowsiness or dizziness"],
  ],
  physical: "PHYSICAL",
  sources: "SOURCES",
  ask: "ASK",
  questions: ["What are storage incompatibilities?", "Vietnam regulation changes?", "Compare OSHA / KOSHA limits."],
};

const MOBILE_LABELS = langPick(MOBILE_LABELS_KO, MOBILE_LABELS_EN);

Object.assign(window, { MOBILE_LABELS_EN, MOBILE_LABELS });
