// Labels for the 중소기업 체크리스트(인쇄/PDF · CSV) on the 규제·인허가 / 수출입 tab.
// 화면 코드(trade_controls_sections/checklist_export.jsx)와 순수 함수(trade_controls_checklist_helpers.jsx)는 이 문구만 읽는다.

const TC_CHECKLIST_LABELS = {
  printButton: "체크리스트 인쇄/PDF",
  csvButton: "CSV 내려받기",
  hint: "이 물질의 의무·인허가·등재 목록을 근거 조문과 함께 한 장으로 정리합니다. PDF 는 인쇄 창에서 \"PDF로 저장\"을 고르십시오.",
  docTitle: "규제·인허가 / 수출입 체크리스트",
  substance: "물질",
  cas: "CAS",
  situation: "상황",
  generated: "작성일",
  retrieved: "자료 수집일",
  disclaimerTitle: "꼭 읽어 주십시오",
  disclaimer: "이 체크리스트는 공개 자료를 정리한 안내이며 법적 자문이 아닙니다. 수량·농도·업종 조건은 평가하지 않았습니다. 실제 신고·허가 여부는 근거 원문과 관할 기관에 반드시 확인하십시오.",
  empty: "해당 항목 없음",
  check: "확인",
  columns: { item: "항목", detail: "누가·언제·조건", basis: "근거·원문" },
  groups: {
    krLaw: "국내 법령별 등재",
    permits: "인허가·신고",
    obligations: "한국 수출입 의무",
    unverified: "확인 중인 항목 (참고)",
    lists: "통제 목록 등재",
    hs: "HS 품목번호 (참고용·구속력 없음)",
    destination: c => `상대국 ${c} 목록 등재`,
    kotra: "KOTRA 수입규제",
  },
  fields: { who: "의무자", authority: "기관", when: "시기", condition: "조건·기준", note: "비고", details: "등재 내용", customs: "세관장확인 대상" },
  hsBasis: "EU ECICS 분류(참고용) · 구속력 있는 분류는 관세청 품목분류 사전심사",
  footer: "ChemIP · https://chemip.yule.pics · 무료·오픈소스(AGPL-3.0)",
  csv: {
    header: ["구분", "항목", "의무자", "기관", "시기", "조건·기준", "등재 내용·비고", "근거", "원문 URL", "세관장확인"],
    yes: "예",
    filePrefix: "chemip_checklist",
  },
};

Object.assign(window, { TC_CHECKLIST_LABELS });
