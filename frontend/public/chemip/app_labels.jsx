// 상단 바·화면 이름·표시 설정 문구(APP_LABELS). 화면 목록과 순서는 app.jsx 의 APP_SCREENS 가 정한다.
// 한국어가 주 표기, en 은 보조(작은 글씨·title 속성)로만 쓴다.

const APP_LABELS = {
  brandSub: "무료 · 오픈소스",
  brandAria: "ChemIP 처음 화면으로",
  screens: {
    landing: { ko: "처음 화면", en: "Home" },
    product: { ko: "물질 검색", en: "Search" },
    board: { ko: "요청 게시판", en: "Requests" },
    sources: { ko: "자료 출처", en: "Sources" },
    dev: { ko: "연구·개발", en: "R&D" },
    research: { ko: "논문 연구", en: "Research" },
    benchmark: { ko: "벤치마크", en: "Benchmark" },
    mobile: { ko: "모바일 시안", en: "Mobile mock" },
  },
  sourceCode: "소스 코드",
  tweaks: "화면 설정",
  tweakPanel: {
    title: "화면 설정",
    footnote: "이 브라우저에만 저장됩니다",
    groups: {
      theme: "테마",
      accent: "강조색",
      type: "글꼴",
      density: "밀도",
      layout: "배치",
      dataviz: "차트",
      banner: "공지 띠",
      showGrid: "첫 화면 격자선",
      mobileFrames: "모바일 기기 틀",
    },
    options: {
      light: "밝게", dark: "어둡게",
      blue: "파랑", indigo: "남색", teal: "청록", copper: "구리", mono: "흑백",
      default: "기본", serif: "명조", monoType: "고정폭", korean: "프리텐다드",
      compact: "촘촘", comfy: "넉넉",
      "2col": "2단", "3col": "3단", wide: "넓게",
      spark: "선", heat: "열지도", bar: "막대",
      on: "켜기", off: "끄기",
    },
  },
};

Object.assign(window, { APP_LABELS });
