// English for the home screen (LANDING_LABELS_KO, FEATURED_CHEMICALS_KO in landing_labels.jsx). Same shape; missing keys
// fall back to Korean. "{kr_lists}" placeholders are filled by landingFill from the trade-controls catalog.

const FEATURED_CHEMICALS_EN = [
  { chem_id: "001008", name: "Benzene", cas_no: "71-43-2" },
  { chem_id: "001067", name: "Acetone", cas_no: "67-64-1" },
  { chem_id: "001032", name: "Toluene", cas_no: "108-88-3" },
  { chem_id: "000329", name: "DEHP (phthalate)", cas_no: "117-81-7" },
];

const LANDING_LABELS_EN = {
  hero: {
    kicker: "Chemical compliance assistant · Free",
    recent: "Recently viewed",
    title: "Enter one substance,",
    titleSub: "and every rule you must follow comes together on one screen.",
    lede: "Built for companies without a dedicated regulatory team. Enter a substance name or CAS number to see its SDS, whether it appears on {kr_lists} Korean statutory lists, permits and notifications, import/export obligations, partner-country regulations and HS codes, all exportable as a checklist.",
    ledeFallback: "Built for companies without a dedicated regulatory team. Enter a substance name or CAS number to see its SDS, whether it appears on Korean statutory lists, permits and notifications, import/export obligations, partner-country regulations and HS codes, all exportable as a checklist.",
    en: "",
    searchPlaceholder: "Substance, CAS number, calculator or term (e.g. acetone, 67-64-1, LMTD)",
    searchButton: "Search",
    examples: "Open an example",
    ctaBoard: "Request a feature",
    ctaHow: "How it works",
  },
  outputs: {
    eyebrow: "What you get",
    title: "Eight things you can check for one substance",
    items: [
      { icon: "doc", title: "All 16 SDS sections", desc: "KOSHA safety data sheets: hazards, first aid, handling and storage, PPE and regulatory status." },
      { icon: "shield", title: "{kr_lists} Korean statutory lists", titleFallback: "Korean statutory lists", desc: "Checks the substance against lists designated under the Chemicals Control Act, the Occupational Safety and Health Act, and the air, water and waste laws." },
      { icon: "check", title: "Permits and notifications", desc: "Procedures this substance triggers, such as handling-facility permits, business licences or notifications, and emission-facility permits, and when they apply." },
      { icon: "globe", title: "Import/export obligations", desc: "Confirmations and declarations needed to import or export, whether customs confirmation applies, and the legal basis." },
      { icon: "map", title: "Partner-country regulations", desc: "Listings in the regulations of trading partners such as the US, EU, China, Japan and Vietnam, plus international conventions." },
      { icon: "layers", title: "HS codes", desc: "Candidate HS codes used for customs clearance, with descriptions." },
      { icon: "book", title: "Printable checklist and CSV", desc: "Items to check, laid out as a table you can print (PDF) or download as a CSV for Excel." },
      { icon: "atom", title: "Handling sites and incidents", desc: "Korean facilities that reported the same substance (PRTR) and incident cases in Korea and abroad." },
    ],
  },
  steps: {
    eyebrow: "How it works",
    title: "Three steps",
    items: [
      { title: "Search for a substance", desc: "Search by name (Korean or English) or CAS number and pick the substance." },
      { title: "Open the 'Regulations & permits / Trade' tab", desc: "Choose import or export and a partner country to see only the obligations that apply." },
      { title: "Export a checklist", desc: "Print it or download a CSV for internal review and questions to the competent authority." },
    ],
  },
  disclaimer: {
    title: "Please read",
    items: [
      "This screen compiles public information for guidance only. It is not legal advice.",
      "Laws and notices change often. Before acting, check the original text through each item's source link and, if needed, contact the competent authority (Ministry of Environment, Ministry of Employment and Labor, Korea Customs Service, etc.).",
      "If something is wrong or missing, tell us on the request board. We will check and fix it.",
    ],
  },
  footer: {
    about: "A free chemical regulation guide for people who handle chemicals at work. The source code is published under the GNU AGPL-3.0.",
    colUse: "Use",
    colOpen: "Open source",
    colDev: "R&D",
    links: {
      search: "Substance search",
      board: "Request board",
      sources: "Data sources and licences",
      repo: "GitHub repository ↗",
      license: "Licence (AGPL-3.0) ↗",
      readme: "Installation guide (README) ↗",
      dev: "R&D screen",
    },
    bottom: "© 2026 ChemIP contributors · AGPL-3.0",
    notAdvice: "Not legal advice · Check the original sources",
  },
};

const FEATURED_CHEMICALS = langPick(FEATURED_CHEMICALS_KO, FEATURED_CHEMICALS_EN);
const LANDING_LABELS = langPick(LANDING_LABELS_KO, LANDING_LABELS_EN);

Object.assign(window, { FEATURED_CHEMICALS_EN, LANDING_LABELS_EN, FEATURED_CHEMICALS, LANDING_LABELS });
