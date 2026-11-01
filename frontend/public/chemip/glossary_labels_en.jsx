// English for the glossary screen (GLOSSARY_LABELS_EN, same shape as GLOSSARY_LABELS_KO) and the GLOSSARY_LABELS the screen reads.

const GLOSSARY_LABELS_EN = {
  title: "Glossary",
  sub: "Chemical safety, industrial hygiene, hazardous materials and chemical engineering terms in Korean and English. Built for the Korean exams (chemical safety PE, industrial hygiene, hazardous materials, chemical engineering); legal terms cite the statute article.",
  searchPlaceholder: "Find a term (e.g. flash point, HAZOP, designated quantity, reflux ratio)",
  searchAria: "Find a term",
  allCats: "All categories",
  allExams: "All exams",
  indexAria: "Browse by first letter",
  indexAll: "All",
  count: (n, all) => (n === all ? `${n.toLocaleString("en-US")} terms` : `${n.toLocaleString("en-US")} of ${all.toLocaleString("en-US")} terms`),
  empty: "No term matches. Set category and letter to 'All', or try another word.",
  notFound: (key) => `Term '${key}' was not found. Browse the list below.`,
  cats: {
    psm: "Process safety",
    fire: "Fire & explosion",
    ih: "Industrial hygiene",
    tox: "Toxicology & environment",
    reg: "Chemical regulation & GHS",
    hazmat: "Hazardous materials",
    unitop: "Unit operations",
    thermo: "Thermodynamics & reactions",
    fluid: "Fluids & heat transfer",
    control: "Process control",
    abbr: "Sources & acronyms",
  },
  exams: {
    pse: "Chemical Safety PE",
    ih: "Industrial Hygiene Engineer",
    hm: "Hazardous Materials Technician",
    ce: "Chemical Engineer",
  },
  field: {
    law: "Legal basis",
    ref: "Reference",
    unit: "Unit",
    see: "Related terms",
    calc: "Related calculator",
    view: "Related screen",
    exams: "Exams",
    alias: "Also called",
    src: "Definition source",
  },
  src: {
    own: "Written by ChemIP",
    law: "Statutory definition (Korean statutes are not copyrighted, Copyright Act Art. 7)",
    std: "Written by ChemIP from standards and textbooks",
    calc: "Written by ChemIP (calculator term notes)",
    abbr: "Written by ChemIP (source and acronym notes)",
  },
  lawOpen: "Open on the Korean Law Information Center",
  copyLink: "Copy link",
  copied: "Copied",
  close: "Close",
  showDetail: (term) => `Show ${term}`,
  screens: { sources: "Data sources", product: "Substance search", calc: "Calculators", search: "Unified search", applicability: "Regulatory applicability checker" },
  note: "Definitions are for study and reference. For legal decisions, check the current statute text on the Korean Law Information Center.",
};

const GLOSSARY_LABELS = langPick(GLOSSARY_LABELS_KO, GLOSSARY_LABELS_EN);

Object.assign(window, { GLOSSARY_LABELS_EN, GLOSSARY_LABELS });
