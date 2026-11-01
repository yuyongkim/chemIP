// English for the home-screen research paper section (LANDING_PAPER_LABELS_KO in landing_paper_labels.jsx). Same shape.

const LANDING_PAPER_LABELS_EN = {
  eyebrow: "Research paper",
  title: "A peer-reviewed tool",
  journal: "ACS Chemical Health & Safety",
  status: "Published 2026",
  paperTitle: "ChemIP: An Open-Source Web Platform for Unified Chemical Safety Data Retrieval across Korean and International Regulatory Sources",
  points: [
    {
      title: "Problem",
      desc: "Reviewing a single substance means looking up hazard, regulatory, patent and drug information separately on each agency's portal. Research takes longer, items get missed, and results differ from person to person.",
    },
    {
      title: "Solution",
      desc: "One substance name or CAS number retrieves Korean and international safety, regulatory and patent data together, replacing trips across four or more portals with a single query.",
    },
    {
      title: "Design",
      desc: "Each data source has its own connector module, so when one source is down the others keep working. When AI is unavailable, a rule-based report is produced instead.",
    },
    {
      title: "Openness",
      desc: "Source code, tests and data processing are all public, so anyone can verify and reproduce the work.",
    },
  ],
  compare: {
    title: "How the research workflow changes",
    before: {
      label: "Before",
      steps: [
        { name: "KOSHA MSDS", task: "Search and download the SDS" },
        { name: "Chemical information (KISChem, NCIS)", task: "Check hazardous-chemical classification" },
        { name: "Laws and notices", task: "Match against statutory lists" },
        { name: "Patents (KIPRIS)", task: "Search patents" },
        { name: "MFDS and overseas sources", task: "Check drug and partner-country rules" },
      ],
      end: "Staff collect everything by hand into a document",
    },
    after: {
      label: "ChemIP",
      query: "One substance name or CAS number",
      hub: "Source connectors query in parallel · name/CAS match check",
      results: ["SDS and GHS hazards", "Korean statutory lists and permits", "Trade and partner-country rules", "Linked patents and drugs", "Checklist (print, PDF, CSV)"],
    },
  },
  figures: [
    { src: "assets/paper/fig1_architecture.webp", w: 1600, h: 978, title: "Figure 1. System architecture", desc: "Three tiers: user interface, server (per-source connectors, retry and fallback layer) and external public data" },
    { src: "assets/paper/fig2_integration_flow.webp", w: 1600, h: 771, title: "Figure 2. Data integration flow", desc: "Query → alias/CAS resolution → canonical substance row → per-source retrieval → normalization → evidence bundle → report" },
  ],
  figureSource: "Source: Kim, ACS Chemical Health & Safety (2026), DOI 10.1021/acs.chas.6c00064",
  links: [
    { label: "Full paper (DOI 10.1021/acs.chas.6c00064)", href: "https://doi.org/10.1021/acs.chas.6c00064" },
    { label: "Source code (GitHub)", href: "https://github.com/yuyongkim/chemIP" },
    { label: "Archived release (Zenodo DOI 10.5281/zenodo.19447588)", href: "https://doi.org/10.5281/zenodo.19447588" },
  ],
};

const LANDING_PAPER_LABELS = langPick(LANDING_PAPER_LABELS_KO, LANDING_PAPER_LABELS_EN);

Object.assign(window, { LANDING_PAPER_LABELS_EN, LANDING_PAPER_LABELS });
