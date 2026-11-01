// 패밀리 사이트 문구의 영어(FAMILY_LABELS_EN)와 화면이 읽는 FAMILY_LABELS, 사이트 설명을 화면 언어로 고르는 familySiteDesc.

const FAMILY_LABELS_EN = {
  title: "Family sites",
  menuButton: "Sites",
  menuAria: "Family sites",
  current: "Current site",
  newTab: "opens in a new tab",
};

const FAMILY_LABELS = langPick(FAMILY_LABELS_KO, FAMILY_LABELS_EN);

// FAMILY_SITES 항목 하나의 한 줄 설명(desc.ko / desc.en)을 화면 언어로.
function familySiteDesc(site) {
  return tr(site.desc.ko, site.desc.en);
}

Object.assign(window, { FAMILY_LABELS_EN, FAMILY_LABELS, familySiteDesc });
