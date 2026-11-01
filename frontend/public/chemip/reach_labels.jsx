// EU REACH 등록 현황(ECHA CHEM) 문구 — 한국어. 영어: reach_labels_en.jsx. 화면: product_intl_reach.jsx(국가별 규제 항목)·
// product_regulation_eu.jsx(해외 규제 탭). 값 정리: reach_format.jsx. 자료: g/intl_add 묶음 또는 /api/reach/<CAS>(그때그때 조회).
// listTitle 은 목록 머리(scripts/trade_controls/intl/sources/eu_echa_reach.json title)와 같은 글 — 그때그때 조회한 답에는 머리가 없어서 여기 둔다.

const REACH_LABELS_KO = {
  listTitle: "EU REACH 등록물질 — 활성 등록 현황(ECHA CHEM)",
  law: "REACH Regulation (EC) No 1907/2006",
  ec: "EC 번호",
  active: "활성 등록",
  activeValue: (n) => `${n.toLocaleString("ko-KR")}건`,
  types: { full: "정식", intermediate: "중간체", other: "기타" },
  intermediateDetail: (onsite, transported) => `현장 분리 ${onsite} · 운송 분리 ${transported}`,
  nons: "NONS(옛 지침 67/548/EEC 신고)",
  tonnage: "톤수 구간",
  tonnageRange: (lo, hi) => `연 ${lo}~${hi} t`,
  tonnageOver: (lo) => `연 ${lo} t 이상`,
  koUnits: { e8: "억", e7: "천만", e4: "만", e3: "천" }, // 톤수 숫자 줄임(reach_format.jsx reachKoAmount). 영어 화면은 쓰지 않는다
  tonnageText: { "intermediate use only": "중간체 용도만", "ceased manufacture": "제조 중단", "no longer valid": "더 이상 유효하지 않음" },
  first: "최초 등록일",
  last: "최근 갱신일",
  link: "ECHA CHEM 물질 정보",
  original: (t) => `ECHA 원문: ${t}`,
  checking: "ECHA CHEM 에서 등록 현황을 확인 중입니다…",
  none: (d) => `ECHA 등록 기록 없음 (조회 시점 ${d})`,
  unknown: "ECHA CHEM 에 지금 연결하지 못해 등록 현황을 확인할 수 없습니다. 잠시 후 다시 열어 주세요.",
  ambiguous: "이 CAS 번호에 해당하는 ECHA 물질이 여러 개라 등록 현황을 하나로 정할 수 없습니다. ECHA CHEM 에서 직접 확인하세요.",
  checkedAt: (d) => `조회 시점 ${d}`,
  bundledAt: (d) => `${d} 조회분`,
  attribution: "Source: European Chemicals Agency, https://echa.europa.eu/",
  note: "등록은 누군가 이 물질을 EU 에 등록했다는 뜻이며, 귀사 공급망의 등록을 대신하지 않습니다. 참고용.",
};

Object.assign(window, { REACH_LABELS_KO });
