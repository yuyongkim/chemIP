// English for the home-screen notice bar, the "Data sources and licences" screen and the anonymous usage notice
// (ABOUT_LABELS_KO in about_labels.jsx). Same shape.

const ABOUT_LABELS_EN = {
  sme: {
    kicker: "Free · Open source (AGPL-3.0) · For everyone",
    title: "Ready to use, even without a regulatory or SDS specialist.",
    body: "ChemIP is free for anyone, with no sign-up or fees. Pick a substance to see Korean regulations by law, permits and notifications, import/export obligations and their legal basis on one screen, and print it as a checklist. The source code is published under the AGPL-3.0, so you can also install it in-house.",
    points: [
      "No sign-up or payment — search as soon as the page opens",
      "Printable and CSV checklists for regulations, permits and trade",
      "Send feature requests and data corrections to the request board",
    ],
    ctaBoard: "Request board",
    ctaSources: "Data sources and licences",
  },
  usage: {
    title: "Anonymous usage statistics",
    body: "To improve the service and support research (evidence of use), we count only daily substance-detail views and regulations/permits/trade lookups. We do not collect IP addresses, browser details, accounts or anything else that identifies a person. Anyone can see the totals at /api/usage/summary.",
    statsTitle: "Last 30 days",
    metricNames: { substance_view: "Substance detail views", trade_controls: "Regulations/permits/trade lookups" },
    distinct: n => `${n} distinct substances`,
    times: n => `${n.toLocaleString("en-US")} times`,
    since: d => (d ? `Counting since ${d}` : "No usage recorded yet."),
  },
  sources: {
    navLabel: "Data sources",
    title: "Data sources and licences",
    lede: "Providers and terms of use for all data shown in ChemIP. What the screen shows is guidance only; for legal decisions, check each original source and the competent authority.",
    software: "ChemIP source code: GNU AGPL-3.0. If you modify it and offer it as a service, you must publish your modified source under the same terms.",
    repo: "Source code (GitHub)",
    license: "Full licence text",
    columns: { name: "Data", provider: "Provider", used: "Used for", license: "Terms of use and attribution" },
    unrecorded: "No terms of use recorded in the repository; check the provider's notice",
    attribution: "Attribution",
    open: "Original ↗",
    count: n => `${n} source${n === 1 ? "" : "s"}`,
  },
};

const ABOUT_LABELS = langPick(ABOUT_LABELS_KO, ABOUT_LABELS_EN);

Object.assign(window, { ABOUT_LABELS_EN, ABOUT_LABELS });
