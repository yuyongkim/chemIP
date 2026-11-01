// "KORA 입력 준비표" 문구 — 한국어(KORA_SHEET_KO). 영어는 kora_sheet_labels_en.jsx(KORA_SHEET_EN → 화면이 읽는 KORA_SHEET).
// ChemIP 이 만든 비공식 준비표다. 화학물질안전원 서식·KORA 화면 배치를 흉내 내지 않고, 법적 효력이 없다고 늘 적는다.

const KORA_SHEET_KO = {
  title: "KORA 입력 준비표",
  titleSub: "KORA input worksheet",
  lede: "화학물질안전원 KORA 에 장외영향 범위를 입력하기 전에 모아 둘 값을 한 장에 정리합니다. 물질 값은 ChemIP 자료(MSDS 9항·비상대응 기준·EPA 지침 표)로 채우고, 사업장 값은 빈칸으로 둡니다.",
  disclaimer: "비공식 참고용 준비표입니다. 화학물질안전원 서식이 아니며 법적 효력이 없습니다. 법정 영향범위는 KORA 로 산정하고, 물질 값은 최신 MSDS 로 다시 확인하십시오.",
  print: "인쇄 / PDF 저장",
  printHint: "인쇄 창에서 'PDF 로 저장'을 고르면 파일로 남습니다.",
  loading: "물질 자료를 불러오는 중…",
  made: (d) => `ChemIP 작성 ${d} · chemip.yule.pics`,
  blank: "",
  sections: {
    site: "1. 사업장·설비",
    substance: "2. 물질",
    storage: "3. 취급량·저장 조건",
    scenario: "4. 누출 시나리오",
    weather: "5. 기상",
    terrain: "6. 지형·주변",
    checks: "7. 입력 전 확인",
  },
  cols: { item: "항목", value: "값", source: "출처·메모" },
  site: { name: "사업장 이름", process: "공정·설비(탱크 번호)", coords: "누출원 위치(위도·경도)", author: "작성자·작성일" },
  substance: {
    name: "물질 이름", cas: "CAS 번호", state: "상태(25 °C)", mw: "분자량", bp: "끓는점", vp: "증기압", density: "비중(밀도)",
    flash: "인화점", flam: "폭발 범위(LFL–UFL)", un: "UN 번호·운송 등급", hc: "연소열",
    endpoint: "독성 끝점(한국 기준 순서)", erpg: "ERPG-2", aegl: "AEGL-2 (10분·30분·1시간)", pac: "PAC-2", rmpEp: "미국 RMP 독성 끝점",
    flamEp: "인화성 끝점", flamEpValue: "과압 1 psi(6.9 kPa) · 복사열 5 kW/m²(40초)",
    gas: "기체", liquid: "액체",
  },
  storage: { qty: "최대 보유량(한 용기·배관)", temp: "저장 온도", press: "저장 압력", form: "저장 형태(상압·가압·냉동)", dike: "방류벽 안 면적", building: "건물 안 여부" },
  scenario: {
    kind: "시나리오", event: "사고 형태", how: "누출 방식", hole: "구멍 지름", rate: "대기 누출률", duration: "누출 지속 시간",
    pool: "웅덩이 면적", screen: "ChemIP 스크리닝 거리(참고)", screenNote: "EPA RMP 지침 표 — KORA 결과가 아닙니다",
    worst: "최악의 사고 시나리오", alt: "대안의 사고 시나리오",
  },
  weather: {
    worst: "최악: 대기 안정도 F, 풍속 1.5 m/s, 기온 25 °C, 습도 50 %",
    alt: "대안: 사업장 지역의 지난해 기상(기상청 자료)",
    wind: "평균 풍속·풍향", temp: "평균 기온", humid: "평균 습도", stab: "대기 안정도", station: "기상 관측소",
  },
  terrain: { topo: "지형(개활지·도시)", rough: "지표 거칠기", receptors: "주거지·학교·병원 등 주변 시설", population: "영향 범위 안 인구(추정)" },
  checks: [
    "화학물질안전원이 보급하는 KORA 최신 판으로 산정한다(판 번호 확인)",
    "물질 값은 최신 MSDS·물질 정보로 다시 확인했다",
    "대안 시나리오 기상은 지난해 기상청 자료로 넣었다",
    "최악·대안 시나리오를 사고 시나리오 선정 기술지침에 따라 골랐다",
    "산정 결과와 근거를 화학사고예방관리계획서에 넣었다",
  ],
  sourceMsds: "MSDS 9항",
  sourceRmp: "EPA RMP OCA 지침",
  sourceEl: "비상대응 기준(EPA AEGL·DOE PAC)",
  sourceCalc: "이 계산기 입력",
  noValue: "자료 없음",
};

Object.assign(window, { KORA_SHEET_KO });
