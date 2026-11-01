// English side of data.jsx: glossary tooltips (GLOSSARY_EN, same keys as GLOSSARY_KO) and the MSDS section name picker.
// GLOSSARY is what Abbr (primitives.jsx) reads. In English the Korean agency name line (kr) is dropped.

const GLOSSARY_EN = {
  KOSHA:     { kr: "", desc: "Korea's official source of MSDSs, workplace monitoring rules and occupational exposure limits (OELs)." },
  ECHA:      { kr: "", desc: "Runs the EU REACH and CLP regulations: the SVHC Candidate List, Authorisation (Annex XIV) and Restriction (Annex XVII)." },
  NIOSH:     { kr: "", desc: "Provides occupational health data such as recommended exposure limits (REL), the Pocket Guide and IDLH values." },
  COMPTOX:   { kr: "", desc: "EPA's public chemistry database combining properties, toxicity and exposure predictions." },
  PUBCHEM:   { kr: "", desc: "The world's largest public chemistry database of structures, properties and bioactivity." },
  KIPRIS:    { kr: "", desc: "Search service for Korean patents, utility models, trademarks and designs." },
  KOTRA:     { kr: "", desc: "Provides overseas market news, market-entry strategy and regulatory information (including REACH Q&A)." },
  MFDS:      { kr: "", desc: "Korea's regulator for drug and quasi-drug approvals and safety information." },
  OPENFDA:   { kr: "", desc: "Public API for US drug labels, adverse event reports and other FDA data." },
  PUBMED:    { kr: "", desc: "Search over 36 million+ biomedical article abstracts." },
  USPTO:     { kr: "", desc: "Index of US patent grants and applications." },
  NAVER:     { kr: "", desc: "News search shown in its own \"NAVER search results\" block, never mixed with KOTRA." },
  GHS:       { kr: "", desc: "International standard for hazard classification, pictograms, signal words and precautionary statements." },
  CAS:       { kr: "", desc: "Unique number that identifies a substance worldwide (e.g. 67-64-1)." },
  REACH:     { kr: "", desc: "EU regulation on the registration, evaluation, authorisation and restriction of chemicals." },
  "K-REACH": { kr: "", desc: "Korea's Act on the Registration and Evaluation of Chemicals." },
  KISCHEM:   { kr: "", desc: "Korea's integrated chemical safety information system." },
  NCIS:      { kr: "", desc: "Korea Environment Corporation's chemical classification, molecular and regulatory data." },
  SVHC:      { kr: "", desc: "High-concern substances (carcinogenic, persistent, etc.) on the REACH Candidate List." },
};

const GLOSSARY = langPick(GLOSSARY_KO, GLOSSARY_EN);

// MSDS section title in the screen language (MSDS_SECTIONS item → string).
function msdsSectionName(s) {
  return s ? tr(s.kr, s.en) : "";
}

Object.assign(window, { GLOSSARY_EN, GLOSSARY, msdsSectionName });
