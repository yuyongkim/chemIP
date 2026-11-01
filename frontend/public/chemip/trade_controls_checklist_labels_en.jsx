// English labels for the checklist (print/PDF · CSV) — same shape as TC_CHECKLIST_LABELS_KO (trade_controls_checklist_labels.jsx).
// Missing keys fall back to Korean (langMerge, lang.jsx). Screen code and helpers read TC_CHECKLIST_LABELS, chosen here.

const TC_CHECKLIST_LABELS_EN = {
  printButton: "Print checklist / PDF",
  csvButton: "Download CSV",
  hint: "Puts this substance's obligations, permits and list memberships on one sheet with their legal basis. For a PDF, choose \"Save as PDF\" in the print dialog.",
  docTitle: "Regulations, permits & trade checklist",
  substance: "Substance",
  cas: "CAS",
  situation: "Scenario",
  generated: "Prepared on",
  retrieved: "Data retrieved",
  disclaimerTitle: "Please read",
  disclaimer: "This checklist summarises public data and is not legal advice. Quantity, concentration and industry conditions were not evaluated. Always confirm actual notification and permit requirements against the source text and with the competent authority.",
  empty: "No items",
  check: "Check",
  columns: { item: "Item", detail: "Who · when · conditions", basis: "Legal basis · source" },
  groups: {
    krLaw: "Korean law listings",
    permits: "Permits & notifications",
    obligations: "Korean import/export obligations",
    unverified: "Items under review (reference)",
    lists: "Controlled lists",
    hs: "HS codes (reference only · not binding)",
    destination: c => `Listings in ${c}`,
    kotra: "KOTRA import restrictions",
  },
  fields: { who: "Responsible party", authority: "Authority", when: "When", condition: "Conditions · thresholds", note: "Note", details: "Listing details", customs: "Subject to customs confirmation" },
  hsBasis: "EU ECICS classification (reference only) · binding classification by advance ruling of the Korea Customs Service",
  footer: "ChemIP · https://chemip.yule.pics · free and open source (AGPL-3.0)",
  csv: {
    header: ["Section", "Item", "Responsible party", "Authority", "When", "Conditions / thresholds", "Listing details / notes", "Legal basis", "Source URL", "Customs confirmation"],
    yes: "Yes",
    filePrefix: "chemip_checklist",
  },
};

const TC_CHECKLIST_LABELS = langPick(TC_CHECKLIST_LABELS_KO, TC_CHECKLIST_LABELS_EN);

Object.assign(window, { TC_CHECKLIST_LABELS_EN, TC_CHECKLIST_LABELS });
