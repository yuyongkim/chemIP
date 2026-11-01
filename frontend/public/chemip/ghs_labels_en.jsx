// GHS 그림문자·경고표지 만들기 문구(영어). 같은 모양의 한국어는 ghs_labels.jsx.
// 화면 문구는 GHS_LABELS(화면 언어), 표지 안의 글은 ghsSheetLabels(표지 언어).

const GHS_LABELS_EN = {
  pictograms: {
    GHS01: "Explosive",
    GHS02: "Flammable",
    GHS03: "Oxidizing",
    GHS04: "Gas under pressure",
    GHS05: "Corrosive",
    GHS06: "Acute toxicity",
    GHS07: "Harmful / irritant",
    GHS08: "Health hazard",
    GHS09: "Aquatic hazard",
  },
  signal: { danger: "Danger", warning: "Warning", none: "No signal word" },
  row: {
    aria: "GHS pictograms",
    unknown: (codes) => `Unknown pictogram code: ${codes}`,
  },
  link: {
    make: "Make label",
    hint: "Make a printable GHS label from this substance's SDS section 2 (pictograms, signal word, H and P statements).",
  },
  view: {
    title: "GHS label maker",
    titleSub: "",
    lede: "Make a printable GHS label from SDS section 2: pictograms, signal word, hazard and precautionary statements. Pick a substance to fill the fields, or type them in. Supplier details are stored in this browser only.",
    from: (name) => `Filled from SDS section 2: ${name}`,
    loading: "Loading the SDS…",
    error: (msg) => `Could not load the SDS (${msg}). Please type the values in.`,
    noSection2: "This substance has no SDS section 2 data. Please type the values in.",
    manual: "Open this tool from a substance page (\"Make label\") to fill in its SDS section 2. You are in manual mode.",
    preview: "Preview",
    phrasesMissing: "The H/P phrase table could not be loaded, so lines with a code only are printed without text.",
    unofficial: "Sentences marked (*) are ChemIP translations; the Korean notice has no official wording for them yet.",
    notes: [
      "The employer or supplier who applies the label is responsible for its content. Check it against the current SDS before use.",
      "Korean label elements: product identifier, pictograms, signal word, hazard statements, precautionary statements and supplier details (Occupational Safety and Health Act, Article 115; MoEL notice on classification, labelling and SDS).",
      "With seven or more precautionary statements, the label may show six (at least one each for prevention, response, storage and disposal) and refer to the SDS for the rest (\"Shorten\" option).",
      "Pictograms: official UNECE GHS pictograms (public domain). H/P text: KOSHA SDS wording and the PubChem GHS code table (UN GHS Rev.11).",
    ],
  },
  form: {
    product: "Product identifier",
    cas: "CAS number",
    signal: "Signal word",
    pictograms: "Pictograms",
    hazards: "Hazard statements",
    precautions: "Precautionary statements",
    statementHint: "One per line: \"H225 : text\", or the code only (the text is filled from the phrase table).",
    groups: { prevention: "Prevention", response: "Response", storage: "Storage", disposal: "Disposal" },
    supplier: "Supplier",
    supplierName: "Supplier (company)",
    supplierAddress: "Address",
    supplierPhone: "Telephone",
    emergency: "Emergency phone",
    placeholderPhone: "e.g. +82 2 000 0000",
    resetMsds: "Reset to SDS values",
    clear: "Clear all",
  },
  options: {
    size: "Size",
    sizes: { a4: "A4 landscape", a5: "A5 landscape", small: "Small 100×70 mm" },
    lang: "Label language",
    langs: { ko: "한국어", en: "English" },
    abbreviate: "Shorten precautionary statements (6 + see SDS)",
    print: "Print / save PDF",
    printHint: "In the print dialog, set the paper size to the chosen size and the scale to 100%.",
  },
  sheet: {
    title: "GHS label",
    product: "Product",
    signal: "Signal word",
    hazards: "Hazard statements",
    precautions: "Precautionary statements",
    groups: { general: "General", prevention: "Prevention", response: "Response", storage: "Storage", disposal: "Disposal" },
    seeSds: "See the Safety Data Sheet (SDS) for further precautionary statements.",
    supplier: "Supplier",
    address: "Address",
    phone: "Tel.",
    emergency: "Emergency phone",
    blank: "",
    unofficialMark: "*",
  },
  search: {
    title: "GHS label maker",
    desc: "SDS section 2 → printable GHS label (A4, A5, small; Korean or English)",
    badge: "Tool",
    keywords: ["GHS label", "hazard label", "label", "pictogram", "signal word", "SDS label", "container label"],
    pictTitle: (code, name) => `${code} · ${name}`,
    pictDesc: "Make a label with this pictogram",
  },
};

const GHS_LABELS = langPick(GHS_LABELS_KO, GHS_LABELS_EN);

// 표지 안의 글(표지 언어 lang 기준, 화면 언어와 무관): { sheet, pictograms, signal }
function ghsSheetLabels(lang) {
  const L = langPick(GHS_LABELS_KO, GHS_LABELS_EN, lang === "en" ? "en" : "ko");
  return { sheet: L.sheet, pictograms: L.pictograms, signal: L.signal };
}

Object.assign(window, { GHS_LABELS_EN, GHS_LABELS, ghsSheetLabels });
