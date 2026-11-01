// 텍사스 배출사고 패널(product_tceq_events.jsx) 한국어 문구(TCEQ_EVENTS_LABELS_KO) — 한 곳. 영어: tceq_events_labels_en.jsx.
// 쓰지 않는 말: "무허가"·"위반"(신고서의 허가 칸으로 판단하지 않는다), 시설별 확률. 배출점 종류는 원인이 아니다.
// 배출점 종류 이름은 응답의 point_kind_labels(backend/integrations/tceq_point_kinds.py)에서 읽는다.

const TCEQ_EVENTS_LABELS_KO = {
  heading: { ko: "텍사스 배출사고 보고", en: "Texas Emission Events" },
  sourceNote: "TCEQ 대기 배출사고 보고",
  missing: "색인 없음",
  count: (n) => `보고 ${n}건`,
  missingBody: "텍사스 배출사고 색인이 없습니다.",
  noneBody: "텍사스 배출사고 보고에 이 물질이 없습니다.",
  stats: {
    events: { m: "보고", sub: (a, b) => (a && b ? (a === b ? `${a}년` : `${a}–${b}년`) : "") },
    lbs: { m: "신고 배출량", sub: "파운드 단위 신고값 합계" },
    counties: { m: "카운티", sub: (rows) => rows.slice(0, 3).map(([k, n]) => `${k} ${n}`).join(" · ") },
    points: { m: "배출점", sub: "이 물질이 적힌 배출점 수" },
  },
  kindsTitle: "배출점 종류 분포",
  kindsAside: "오염물질이 나간 자리의 분포입니다. 사고 원인이 아닙니다.",
  kindCount: (n, pct) => `${n} · ${pct}%`,
  epcLink: (label) => `EPC ${label} 설계 기준 ↗`,
  noDiscipline: "대응 설계 분야 없음",
  recentTitle: "최근 보고",
  recentAside: (n) => `최근 ${n}건`,
  qty: (v) => `${v} lb`,
  causeLabel: "신고서 원인 서술(원문 발췌): ",
  eventLink: (n) => `TCEQ 사고 ${n} ↗`,
  infoLink: "TCEQ 배출사고 안내 ↗",
  note: (src) => `출처: ${src}.`,
  pointKindNames: {}, // 배출점 종류 키 → 이름(비면 응답의 point_kind_labels)
  notes: [], // 안내 문장 목록(비면 응답의 notes)
};

Object.assign(window, { TCEQ_EVENTS_LABELS_KO });
