// 물성·식별자·운송 사실(정적 f/<CAS>.json) 문구(한국어 기준 모양, FACTS_LABELS_KO). 영어: facts_labels_en.jsx → 화면이 읽는 FACTS_LABELS.
// props[키].words 는 화면 글자이면서 통합 검색 "물질 + 물성" 질문을 알아보는 낱말이다. 알아볼 때는 한·영 두 벌을 모두 쓴다
// (facts_core.jsx factsParseQuery). 물성 키는 scripts/static_export/CONTRACT.md "f/<CAS>.json" props 의 이름이다.

const FACTS_LABELS_KO = {
  props: {
    flash_point: { label: "인화점", words: ["인화점", "인화 온도"] },
    boiling_point: { label: "끓는점", words: ["끓는점", "비점", "비등점", "끓는 온도"] },
    melting_point: { label: "녹는점", words: ["녹는점", "융점", "어는점", "빙점"] },
    autoignition: { label: "자연발화온도", words: ["자연발화온도", "자연 발화 온도", "발화점", "자연발화점", "발화 온도"] },
    flammability: { label: "폭발 범위", words: ["폭발 범위", "폭발범위", "폭발 한계", "연소 범위", "인화 범위", "폭발하한", "폭발 하한", "폭발상한", "폭발 상한", "LEL", "UEL", "LFL", "UFL"] },
    vapor_pressure: { label: "증기압", words: ["증기압", "증기 압력"] },
    vapor_density: { label: "증기밀도", words: ["증기밀도", "증기 밀도"] },
    relative_density: { label: "비중", words: ["비중", "밀도", "상대 밀도"] },
    solubility: { label: "용해도", words: ["용해도", "물 용해도", "수용해도"] },
    viscosity: { label: "점도", words: ["점도", "점성"] },
    molar_mass: { label: "분자량", words: ["분자량", "몰질량"] },
    log_kow: { label: "log Kow", words: ["옥탄올 물 분배계수", "분배계수", "logkow", "log kow", "logp", "log p"] },
    ph: { label: "pH", words: ["ph", "수소이온농도"] },
    decomposition: { label: "분해온도", words: ["분해온도", "분해 온도"] },
    transport: { label: "UN 번호·운송", words: ["UN 번호", "유엔 번호", "UN번호", "운송 등급", "운송", "위험물 등급", "용기 등급", "EmS"] },
  },
  // "벤젠의 인화점" 처럼 물질 이름 뒤에 붙는 말(떼고 찾는다)
  substanceTrail: ["의"],
  answerTitle: (prop, name) => `${name} · ${prop}`,
  condition: "조건",
  origin: "원출처",
  source: "출처",
  more: "물질 상세에서 보기",
  lower: "하한",
  upper: "상한",
  transport: {
    cls: "위험 등급",
    pg: "용기 등급",
    ems: "EmS",
    mp: "해양오염물질",
    mpYes: "해당",
    mpNo: "비해당",
    substances: (n) => `해당 물질 ${Number(n).toLocaleString("ko-KR")}종`,
    title: (n, name) => `UN ${n}${name ? ` · ${name}` : ""}`,
  },
  idTypes: { ec: "EC", ke: "KE", inchikey: "InChIKey", un: "UN", pubchem_cid: "PubChem CID", wikidata: "Wikidata", kosha_id: "KOSHA" },
  idSub: (value, cas) => `${value} · CAS ${cas}`,
  casOnly: (cas) => `CAS ${cas}`,
  strip: {
    title: "주요 물성",
    note: "KOSHA MSDS 9·14항에서 뽑은 값입니다. 원문은 MSDS 탭에 있습니다.",
  },
  msdsSource: "KOSHA MSDS",
};

Object.assign(window, { FACTS_LABELS_KO });
