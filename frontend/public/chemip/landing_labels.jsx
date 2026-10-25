// 처음 화면(랜딩) 문구 — 중소기업 실무자(전담 규제 인력 없음) 대상. 화면 코드는 LANDING_LABELS 만 읽는다.
// 국내 목록 수처럼 바뀌는 숫자는 문구에 박지 않는다. "{kr_lists}" 자리를 /api/regulations/trade-controls-catalog 값으로
// 채우고(landingFill), 값이 아직 없으면 숫자 없는 문구(…Fallback)를 쓴다.

// 처음 화면과 검색 화면에서 함께 쓰는 "바로 열어 보기" 예시 물질.
const FEATURED_CHEMICALS = [
  { chem_id: "001008", name: "벤젠", cas_no: "71-43-2" },
  { chem_id: "001067", name: "아세톤", cas_no: "67-64-1" },
  { chem_id: "001032", name: "톨루엔", cas_no: "108-88-3" },
  { chem_id: "000329", name: "DEHP(프탈레이트)", cas_no: "117-81-7" },
];

const LANDING_LABELS = {
  hero: {
    kicker: "중소기업 화학물질 실무 도우미 · 무료",
    title: "물질 하나만 넣으면,",
    titleSub: "지켜야 할 규제가 한 화면에 모입니다.",
    lede: `규제 담당자가 따로 없는 회사를 위해 만들었습니다. 물질 이름이나 CAS 번호를 넣으면 MSDS, 국내 법령 {kr_lists}개 목록 등재 여부, 인허가·신고, 수출입 의무, 상대국 규제, HS 코드를 모아 보여 드리고 체크리스트로 뽑아 드립니다.`,
    ledeFallback: "규제 담당자가 따로 없는 회사를 위해 만들었습니다. 물질 이름이나 CAS 번호를 넣으면 MSDS, 국내 법령별 지정 목록 등재 여부, 인허가·신고, 수출입 의무, 상대국 규제, HS 코드를 모아 보여 드리고 체크리스트로 뽑아 드립니다.",
    en: "Free regulatory checklist for Korean SMEs — one substance, every obligation.",
    searchPlaceholder: "물질 이름 또는 CAS 번호 (예: 아세톤, 67-64-1)",
    searchButton: "검색",
    examples: "바로 열어 보기",
    ctaBoard: "기능 요청하기",
    ctaHow: "사용 방법 보기",
  },
  outputs: {
    eyebrow: "무엇을 알려 주나요",
    title: "물질 하나로 확인하는 8가지",
    items: [
      { icon: "doc", title: "MSDS 16개 항목", desc: "안전보건공단(KOSHA) 물질안전보건자료: 유해성, 응급조치, 취급·저장, 보호구, 법적 규제 현황." },
      { icon: "shield", title: "국내 법령 {kr_lists}개 목록", titleFallback: "국내 법령별 지정 목록", desc: "화학물질관리법·산업안전보건법·대기·수질·폐기물 등 법령별 지정 목록에 올라 있는지 대조합니다." },
      { icon: "check", title: "인허가·신고", desc: "취급시설 허가, 영업 허가·신고, 배출시설 인허가처럼 이 물질 때문에 필요한 절차와 시기." },
      { icon: "globe", title: "수출입 의무", desc: "수입·수출할 때 필요한 확인·신고, 세관장확인 대상 여부와 근거 조문." },
      { icon: "map", title: "상대국 규제", desc: "미국·EU·중국·일본·베트남 등 거래 상대국의 규제 목록 등재와 국제협약." },
      { icon: "layers", title: "HS 품목번호", desc: "통관에 쓰는 HS 코드 후보와 품목 설명." },
      { icon: "book", title: "체크리스트 인쇄·CSV", desc: "확인할 항목을 표로 정리해 인쇄(PDF)하거나 엑셀용 CSV 로 받습니다." },
      { icon: "atom", title: "취급 사업장·사고 사례", desc: "같은 물질을 신고한 국내 사업장(PRTR)과 국내외 사고 사례." },
    ],
  },
  steps: {
    eyebrow: "사용 방법",
    title: "세 단계면 됩니다",
    items: [
      { title: "물질 검색", desc: "이름(한글·영문)이나 CAS 번호로 검색해 물질을 고릅니다." },
      { title: "‘규제·인허가 / 수출입’ 탭 확인", desc: "수입·수출과 상대국을 고르면 해당 의무만 추려 보여 드립니다." },
      { title: "체크리스트로 정리", desc: "인쇄하거나 CSV 로 받아 사내 검토와 담당 기관 문의에 씁니다." },
    ],
  },
  disclaimer: {
    title: "꼭 읽어 주세요",
    items: [
      "이 화면의 내용은 공공 자료를 모아 정리한 안내이며 법적 자문이 아닙니다.",
      "법령·고시는 수시로 바뀝니다. 실제 판단 전에 각 항목의 근거 링크로 원문을 확인하고, 필요하면 관할 기관(환경부·고용노동부·관세청 등)에 문의하십시오.",
      "자료가 틀렸거나 빠졌으면 요청 게시판에 알려 주세요. 확인 후 고칩니다.",
    ],
  },
  footer: {
    about: "중소기업 실무자를 위한 무료 화학물질 규제 안내 도구입니다. 소스 코드는 GNU AGPL-3.0 으로 공개되어 있습니다.",
    colUse: "이용",
    colOpen: "오픈소스",
    colDev: "연구·개발",
    links: {
      search: "물질 검색",
      board: "요청 게시판",
      sources: "자료 출처·라이선스",
      repo: "GitHub 저장소 ↗",
      license: "라이선스(AGPL-3.0) ↗",
      readme: "설치 안내(README) ↗",
      dev: "연구·개발 화면",
    },
    bottom: "© 2026 ChemIP 기여자 · AGPL-3.0",
    notAdvice: "법적 자문이 아닙니다 · 원문을 확인하세요",
  },
  repoUrl: "https://github.com/yuyongkim/chemIP",
};

// "{kr_lists}" 같은 자리표시를 catalog 값으로 채운다. 값이 없으면 null → 화면은 fallback 문구를 쓴다.
function landingFill(text, catalog) {
  if (!text) return text;
  if (!/\{\w+\}/.test(text)) return text;
  if (!catalog) return null;
  return text.replace(/\{(\w+)\}/g, (_, k) => (catalog[k] != null ? catalog[k].toLocaleString("ko-KR") : "")); 
}

Object.assign(window, { LANDING_LABELS, FEATURED_CHEMICALS, landingFill });
