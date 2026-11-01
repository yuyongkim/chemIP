// Substance facts strings, English (FACTS_LABELS_EN, same shape as FACTS_LABELS_KO) and the screen's FACTS_LABELS.
// props[k].words are both screen text and the words that recognise "<substance> <property>" queries; the query parser
// uses the KO and EN words together whatever the screen language.

const FACTS_LABELS_EN = {
  props: {
    flash_point: { label: "Flash point", words: ["flash point", "flashpoint", "flash pt"] },
    boiling_point: { label: "Boiling point", words: ["boiling point", "boiling pt", "bp"] },
    melting_point: { label: "Melting point", words: ["melting point", "freezing point", "melting pt", "mp"] },
    autoignition: { label: "Autoignition temperature", words: ["autoignition temperature", "auto-ignition temperature", "autoignition", "auto ignition", "ignition temperature"] },
    flammability: { label: "Flammability limits", words: ["flammability limits", "flammable limits", "explosive limits", "explosion limits", "flammability limit", "explosive range", "lower explosive limit", "upper explosive limit"] },
    vapor_pressure: { label: "Vapour pressure", words: ["vapor pressure", "vapour pressure"] },
    vapor_density: { label: "Vapour density", words: ["vapor density", "vapour density"] },
    relative_density: { label: "Relative density", words: ["relative density", "specific gravity", "density"] },
    solubility: { label: "Water solubility", words: ["water solubility", "solubility in water", "solubility"] },
    viscosity: { label: "Viscosity", words: ["viscosity"] },
    molar_mass: { label: "Molar mass", words: ["molecular weight", "molar mass", "mol weight", "mw"] },
    log_kow: { label: "log Kow", words: ["log kow", "logkow", "log p", "logp", "partition coefficient", "octanol water partition coefficient"] },
    ph: { label: "pH", words: ["ph"] },
    decomposition: { label: "Decomposition temperature", words: ["decomposition temperature"] },
    transport: { label: "UN number · transport", words: ["un number", "un no", "transport class", "hazard class", "packing group", "ems", "shipping"] },
  },
  substanceTrail: ["of"],
  answerTitle: (prop, name) => `${prop} · ${name}`,
  condition: "Condition",
  origin: "Cited source",
  source: "Source",
  more: "Open the substance",
  lower: "Lower",
  upper: "Upper",
  transport: {
    cls: "Class",
    pg: "Packing group",
    ems: "EmS",
    mp: "Marine pollutant",
    mpYes: "Yes",
    mpNo: "No",
    substances: (n) => `${Number(n).toLocaleString("en-US")} substance${n === 1 ? "" : "s"}`,
    title: (n, name) => `UN ${n}${name ? ` · ${name}` : ""}`,
  },
  casOnly: (cas) => `CAS ${cas}`,
  idSub: (value, cas) => `${value} · CAS ${cas}`,
  strip: {
    title: "Key properties",
    note: "Values from KOSHA SDS sections 9 and 14. The full text is in the MSDS tab.",
  },
  msdsSource: "KOSHA SDS",
};

const FACTS_LABELS = langPick(FACTS_LABELS_KO, FACTS_LABELS_EN);

Object.assign(window, { FACTS_LABELS_EN, FACTS_LABELS });
