// 상단 바·화면 이름·표시 설정 문구(APP_LABELS_KO, 영어는 app_labels_en.jsx). 화면 목록과 순서는 app.jsx 의 APP_SCREENS 가 정한다.
// screenHints 는 한국어 화면에서만 버튼 title 로 보이는 영문 보조 이름이다.

// 언어 전환 단추 이름 — 각 언어를 그 언어로 적으므로 화면 언어와 무관하다.
const APP_LANG_NAMES = { ko: "한", en: "EN" };
const APP_LANG_TITLES = { ko: "한국어로 보기", en: "View in English" };

const APP_LABELS_KO = {
  brandSub: "무료 · 오픈소스",
  brandAria: "ChemIP 처음 화면으로",
  screens: {
    landing: "처음 화면",
    product: "물질 검색",
    calc: "공학 계산기",
    board: "요청 게시판",
    sources: "자료 출처",
    dev: "연구·개발",
    research: "논문 연구",
    benchmark: "벤치마크",
    mobile: "모바일 시안",
    search: "통합 검색",
    feed: "화학사고 소식",
    glossary: "용어사전",
    prtr: "취급 사업장 지도",
    reg: "규제 목록",
    ghslabel: "경고표지 만들기",
    compat: "저장 혼촉 매트릭스",
    mixghs: "혼합물 GHS 분류",
    hazop: "HAZOP 워크시트",
    applicability: "적용 법규 판정기",
    law: "국내 법령 보기",
  },
  screenHints: {
    landing: "Home", product: "Search", calc: "Calculators", board: "Requests", sources: "Sources",
    dev: "R&D", research: "Research", benchmark: "Benchmark", mobile: "Mobile mock", glossary: "Glossary",
  },
  langAria: "화면 언어",
  sourceCode: "소스 코드",
  tweaks: "화면 설정",
  tweakPanel: {
    title: "화면 설정",
    footnote: "이 브라우저에만 저장됩니다",
    groups: {
      theme: "테마",
      accent: "강조색",
      type: "글꼴",
      fs: "글자 크기",
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
      compact: "촘촘", comfy: "넉넉", sm: "작게", lg: "크게",
      "2col": "2단", "3col": "3단", wide: "넓게",
      spark: "선", heat: "열지도", bar: "막대",
      on: "켜기", off: "끄기",
    },
  },
};

Object.assign(window, { APP_LABELS_KO, APP_LANG_NAMES, APP_LANG_TITLES });
