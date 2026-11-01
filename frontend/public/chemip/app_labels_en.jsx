// English for the top bar, screen names and display-settings panel. Same shape as APP_LABELS_KO (app_labels.jsx);
// missing keys fall back to Korean. meta: document title/description set at runtime in English mode (index.html keeps
// the Korean SEO default).

const APP_LABELS_EN = {
  brandSub: "Free · Open source",
  brandAria: "Go to the ChemIP home screen",
  screens: {
    landing: "Home",
    product: "Search",
    calc: "Calculators",
    board: "Requests",
    sources: "Sources",
    dev: "R&D",
    research: "Research",
    benchmark: "Benchmark",
    mobile: "Mobile mock",
    search: "Unified search",
    feed: "Incident feed",
    glossary: "Glossary",
    prtr: "Facility map",
    reg: "Regulatory lists",
    ghslabel: "GHS label maker",
    compat: "Storage compatibility",
    mixghs: "Mixture GHS classification",
    hazop: "HAZOP worksheet",
    applicability: "Regulatory applicability checker",
    law: "Korean law texts",
  },
  langAria: "Display language",
  sourceCode: "Source code",
  tweaks: "Display settings",
  tweakPanel: {
    title: "Display settings",
    footnote: "Saved in this browser only",
    groups: {
      theme: "Theme",
      accent: "Accent",
      type: "Font",
      fs: "Text size",
      density: "Density",
      layout: "Layout",
      dataviz: "Charts",
      banner: "Notice bar",
      showGrid: "Home grid lines",
      mobileFrames: "Mobile device frames",
    },
    options: {
      light: "Light", dark: "Dark",
      blue: "Blue", indigo: "Indigo", teal: "Teal", copper: "Copper", mono: "Mono",
      default: "Default", serif: "Serif", monoType: "Monospace", korean: "Pretendard",
      compact: "Compact", comfy: "Comfortable", sm: "Small", lg: "Large",
      "2col": "2 columns", "3col": "3 columns", wide: "Wide",
      spark: "Line", heat: "Heatmap", bar: "Bar",
      on: "On", off: "Off",
    },
  },
  meta: {
    title: "ChemIP | Chemical SDS, regulations, permits and trade controls in one search",
    description: "Free tool to look up a chemical's SDS, Korean and international regulations, permits and import/export controls by CAS number, covering Korea and 51 partner countries including the US. No sign-up required.",
  },
};

const APP_LABELS = langPick(APP_LABELS_KO, APP_LABELS_EN);

Object.assign(window, { APP_LABELS_EN, APP_LABELS });
