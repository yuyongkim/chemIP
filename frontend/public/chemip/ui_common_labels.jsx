// 공용 UI(ui_common.jsx)의 기본 문구(UI_COMMON_TEXT_KO, 영어: ui_common_labels_en.jsx).

const UI_COMMON_TEXT_KO = {
  preparing: "자료 준비 중입니다. 수집이 끝나면 자동으로 표시됩니다.",
  error: "조회하지 못했습니다.",
  sourceLink: "원문 ↗",
  chemNotFound: id => `요청한 물질(${id})을 찾지 못했습니다. 검색에서 이름·CAS 로 다시 찾아 주십시오.`,
  goSearch: "물질 검색으로 가기",
  chemLoading: id => `요청한 물질(${id})을 불러오는 중입니다.`,
};

Object.assign(window, { UI_COMMON_TEXT_KO });
