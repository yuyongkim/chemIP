// 모바일 시안(mobile.jsx) 문구(MOBILE_LABELS_KO, 영어: mobile_labels_en.jsx). 시안 화면이라 대부분 영문이고 한국어 보조 표기만 여기에 둔다.

const MOBILE_LABELS_KO = {
  phones: ["01 · SEARCH · 검색", "02 · CHEMICAL DETAIL · 상세", "03 · AI ANALYSIS · 분석"],
  searchTitleA: "통합",
  searchTitleB: "화학 검색",
  searchValue: "아세톤",
  recent: "최근 · RECENT",
  recentFirst: "아세톤",
  browse: "카테고리 · BROWSE",
  chemTitle: "Acetone · 아세톤",
  chemSub: "(CH₃)₂CO · 아세톤 · propan-2-one",
  hazards: [
    ["H225", "Highly flammable liquid · 고인화성 액체"],
    ["H319", "Serious eye irritation · 심한 눈 자극"],
    ["H336", "Drowsiness / dizziness · 졸음·현기증"],
  ],
  physical: "PHYSICAL · 물리화학",
  sources: "SOURCES · 출처",
  ask: "ASK · 질문",
  questions: ["What are storage incompatibilities?", "베트남 규제 변경?", "Compare OSHA / KOSHA limits."],
};

Object.assign(window, { MOBILE_LABELS_KO });
