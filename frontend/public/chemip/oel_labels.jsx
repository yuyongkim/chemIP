// 노출기준 비교 문구(한국어 기준 모양, OEL_LABELS_KO). 영어: oel_labels_en.jsx → 화면이 읽는 OEL_LABELS.
// 값은 출처가 공개한 참고값으로만 보인다. "적합·초과·위반" 같은 판정 문구는 쓰지 않는다.

const OEL_LABELS_KO = {
  heading: { ko: "노출기준 비교", en: "Exposure limits" },
  sourceNote: "고용노동부 고시 · OSHA · NIOSH · EU 지침",
  count: (n) => `${Number(n || 0).toLocaleString("ko-KR")}개 출처`,
  none: "이 물질은 모아 둔 노출기준 자료가 없습니다. 아래 링크에서 원문을 확인해 보세요.",
  disclaimer: "각 기관이 공개한 참고값을 출처와 함께 모아 보인 것입니다. 법적 적합 여부를 판정하지 않으며, 적용 범위·측정 방법·경과 규정은 원문을 확인하세요.",
  cols: { source: "관할 · 출처", TWA: "TWA (8시간)", STEL: "STEL (단시간)", C: "C (최고)", IDLH: "IDLH", note: "표시", asOf: "기준일" },
  kindHints: {
    TWA: "시간가중평균 노출기준(8시간)",
    STEL: "단시간 노출기준(보통 15분)",
    C: "최고 노출기준(어느 순간도 넘지 않아야 하는 값)",
    IDLH: "생명·건강에 즉시 위험한 농도(NIOSH)",
  },
  sources: {
    kr_moel_notice: "고용노동부 고시",
    kosha_msds_s8: "KOSHA MSDS 8항",
    us_osha_z: "OSHA PEL",
    us_osha_specific: "OSHA PEL (개별 기준)",
    us_niosh_npg: "NIOSH REL",
    eu_boelv: "EU 구속적 기준(BOELV)",
    eu_ioelv: "EU 권고 기준(IOELV)",
  },
  sourceTitle: (name, license) => `${name}${license ? ` — ${license}` : ""}`,
  unit: { label: "단위", source: "원문 단위", ppm: "ppm 으로", mg: "mg/m³ 로" },
  unitNoMw: "분자량을 읽지 못해 원문 단위로만 보입니다.",
  derivedNote: (mw) => `≈ 표시는 분자량 ${mw} g/mol, 25 °C·1 atm(24.45 L/mol)로 바꾼 계산값입니다. 분진·흄·미스트는 바꾸지 않습니다.`,
  derivedMark: "≈",
  derivedTitle: "원문 값을 바꾼 계산값",
  calcLink: "ppm ↔ mg/m³ 계산기에서 열기",
  linksTitle: "값을 싣지 않는 자료(링크만)",
  links: {
    acgih_tlv: { name: "ACGIH TLV", why: "저작권 자료라 값을 싣지 않습니다. ACGIH 에서 확인하세요." },
    gestis_ilv: { name: "GESTIS 국제 노출기준(IFA)", why: "재게시가 허용되지 않아 값을 싣지 않습니다. GESTIS-ILV 에서 나라별 값을 확인하세요." },
  },
  open: "원문",
  asOfNone: "—",
  empty: "—",
  exportedAt: (d) => `자료 정리 ${d}`,
  // 통합 검색 답 카드
  search: {
    title: (name) => `${name} 노출기준`,
    sub: (cas, n) => `CAS ${cas} · ${n}개 출처 비교`,
    desc: "출처별 참고값입니다. 물질 상세의 노출기준 비교 표에서 단위·기준일·원문 링크를 함께 봅니다.",
    badge: "노출기준",
  },
  // 통합 검색이 "노출기준 질문"으로 알아보는 낱말(검색어 끝·앞). 한·영 두 벌을 모두 쓴다.
  queryWords: ["작업환경 노출기준", "노출기준", "노출 기준", "허용기준", "허용농도"],
};

Object.assign(window, { OEL_LABELS_KO });
