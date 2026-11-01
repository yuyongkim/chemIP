// 벤치마크 화면 문구 — 화면 언어(CHEMIP_LANG)를 따르는 문구(BENCH_T_KO, 영어: benchmark_labels_en.jsx)와
// 언어와 무관하게 영문으로 두는 결과·탐색 설명(BENCH_FIXED). 연구·개발 화면이라 결과 설명은 영문을 유지한다.

const BENCH_T_KO = {
  eyebrow: "CHEMSAFETY-HALBENCH · 출처근거 SDS 평가",
  h1a: "모델이 ", h1b: "출처에 충실한가?",
  intro: "claim 단위 faithfulness 벤치마크: SDS 질문에 대한 LLM 답변을 claim으로 분해하고, 각 claim을 명명된 출처 record에 대조합니다. 결과를 둘러보거나, 문항별로 grounding 효과를 시험하거나, 사람 라벨 시트를 직접 판정하세요.",
  results: "결과", explore: "탐색", label: "라벨",
  sheetFaith: "Claim 충실도", sheetGold: "물질쌍 gold set",
  savedLocal: "브라우저에 저장 · 업로드 없음", exportCsv: "라벨 CSV 내보내기",
  promptFaith: "이 claim이 명명된 출처에 의해 뒷받침되는가?",
  promptGold: "이 둘은 같은 화학물질인가?",
  item: "항목", of: "/", safetyCritical: "안전핵심", unlabeled: "미라벨",
  emptyClaim: "(빈 claim)", noEnName: "(영문명 없음)",
  aiSuggest: "AI 1차 제안", confidence: "신뢰도", needsReview: "확인 필요", highConf: "확신 높음",
  notes: "메모(선택) — 근거·출처 인용…",
  prev: "← 이전", next: "다음 →", nextUnlabeled: "다음 미라벨 ⏎", autoAdvance: "자동 넘김",
  progress: "진행", keyboard: "단축키", kbLabel: "라벨", kbMove: "이동", kbNext: "다음 미라벨",
  opt: { supported: "뒷받침됨", unsupported: "근거없음", contradicted: "모순", not_enough_information: "근거부족", same_entity: "동일물질", related_but_not_same: "유사·비동일", not_same: "다름", insufficient_evidence: "근거부족" },
  loading: "불러오는 중…",
};

// 언어 전환과 무관하게 영문으로 두는 결과·탐색 설명
const BENCH_FIXED = {
  higher: "Higher is better.", lower: "Lower is better.",
  resultsNote: (n) => `${n} models × 5 retrieval settings.`,
  resultsNote2: "Automated, source-grounded diagnostics — not a human-audited ranking.",
  settingCol: "Setting", hostedMark: " ◇",
  hostedFoot: "◇ hosted model · local models run on a single GPU",
  loadFail: "Could not load results.",
  noSamples: "No explore samples staged.",
  exploreA: "One question, the ", exploreB: " model, five settings. Watch unsupported and safety-critical claims fall as source grounding turns on.",
  fullModel: "gemma3:4b",
  abstained: "abstained", supported: (n) => `${n} supported`, unsupported: (n) => `${n} unsupported`, critical: (n) => `${n} safety-critical`,
  declined: "— declined to answer (no local source evidence) —",
  loading: "Loading…",
  vs: "vs",
};

Object.assign(window, { BENCH_T_KO, BENCH_FIXED });
