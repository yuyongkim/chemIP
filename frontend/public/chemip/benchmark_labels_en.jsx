// English for the benchmark screen (BENCH_T_KO in benchmark_labels.jsx). Same shape. The screen follows CHEMIP_LANG
// (the old local ko/en toggle was removed).

const BENCH_T_EN = {
  eyebrow: "CHEMSAFETY-HALBENCH · SOURCE-GROUNDED SDS EVALUATION",
  h1a: "Does the model ", h1b: "stay on source?",
  intro: "A claim-level faithfulness benchmark: every LLM answer to an SDS question is split into claims, and each claim is checked against a named source record. Browse results, test the grounding effect question-by-question, or adjudicate the human-label sheet yourself.",
  results: "Results", explore: "Explore", label: "Label",
  sheetFaith: "Claim faithfulness", sheetGold: "Entity gold set",
  savedLocal: "saved in your browser · nothing uploaded", exportCsv: "Export labeled CSV",
  promptFaith: "Is this claim supported by the named source?",
  promptGold: "Are these the same chemical entity?",
  item: "Item", of: "/", safetyCritical: "safety-critical", unlabeled: "unlabeled",
  emptyClaim: "(empty claim)", noEnName: "(no English name)",
  aiSuggest: "AI first pass", confidence: "confidence", needsReview: "needs review", highConf: "high confidence",
  notes: "Notes (optional) — rationale, source quote…",
  prev: "← Prev", next: "Next →", nextUnlabeled: "Next unlabeled ⏎", autoAdvance: "auto-advance",
  progress: "Progress", keyboard: "Keyboard", kbLabel: "label", kbMove: "move", kbNext: "next unlabeled",
  opt: { supported: "supported", unsupported: "unsupported", contradicted: "contradicted", not_enough_information: "not enough info", same_entity: "same entity", related_but_not_same: "related, not same", not_same: "not same", insufficient_evidence: "insufficient evidence" },
  loading: "Loading…",
};

const BENCH_T = langPick(BENCH_T_KO, BENCH_T_EN);

Object.assign(window, { BENCH_T_EN, BENCH_T });
