// 벤치마크 화면 설정 자료 — 지표 목록, 검색 설정 짧은 이름, 라벨 시트 형식(열·선택지), 시트 파일 주소.
// 지표 tone 과 선택지 색(ok·warn·bad·info)은 benchmark.css 의 클래스(tokens.css 색)로 이어진다.

/* ── Results ─────────────────────────────────────── */
const METRIC_META = {
  claim_support_precision: { label: "Claim-support precision", good: "high", tone: "safe" },
  safety_critical_error_rate: { label: "Safety-critical error rate", good: "low", tone: "hazard" },
  unsupported_claim_rate: { label: "Unsupported-claim rate", good: "low", tone: "warn" },
  abstention_accuracy: { label: "Abstention accuracy", good: "high", tone: "accent" },
};

/* ── Explore ─────────────────────────────────────── */
const SETTING_SHORT = {
  "Closed-book LLM": "Closed-book", "PubChem-only RAG": "PubChem RAG",
  "KOSHA-only RAG": "KOSHA RAG", "ChemIP hybrid RAG": "ChemIP hybrid",
  "ChemIP hybrid RAG + abstention": "Hybrid + abstention",
};

/* ── Label ───────────────────────────────────────── */
const LABEL_SCHEMES = {
  faithfulness: {
    labelCol: "human_label", notesCol: "human_notes", mode: "Claim faithfulness",
    prompt: "Is this claim supported by the named source?",
    meta: ["model", "setting", "claim_type", "auto_support_status", "matched_source", "sample_id"],
    crit: r => String(r.safety_critical).toLowerCase() === "true",
    strat: r => r.adjudication_bucket,
    options: [["supported", "ok"], ["unsupported", "warn"], ["contradicted", "bad"], ["not_enough_information", "info"]],
  },
  goldset: {
    labelCol: "adjudicated_label", notesCol: "adjudicator_notes", mode: "Entity-pair gold set",
    prompt: "Are these the same chemical entity?",
    meta: ["stratum", "shared_alias_norm", "norm_cas_agreement", "provisional_label_AUTO"],
    crit: () => false, strat: r => r.stratum,
    options: [["same_entity", "ok"], ["related_but_not_same", "warn"], ["not_same", "bad"], ["insufficient_evidence", "info"]],
  },
};
const SHEETS = {
  adjudication: { url: "data/adjudication_sample.csv", name: "adjudication_sample.csv" },
  goldset: { url: "data/goldset_sample.csv", name: "goldset_sample.csv" },
};

Object.assign(window, { METRIC_META, SETTING_SHORT, LABEL_SCHEMES, SHEETS });
