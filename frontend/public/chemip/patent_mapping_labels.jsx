// 특허 탭 "관련 특허(공개 특허 문헌 매핑)" 한국어 문구(…_KO) — 한 곳. 영어: patent_mapping_labels_en.jsx. 화면: product_patent_mapping.jsx 와 patent_mapping_*.jsx.
// 나라 이름은 intl_regions.jsx 의 INTL_JURISDICTIONS 를 먼저 쓰고, 거기 없는 특허청·옛 나라 코드만 여기 둔다.

const PATENT_MAPPING_LABELS_KO = {
  heading: { ko: "관련 특허(공개 특허 문헌 매핑)", en: "Related patents" },
  total: (n) => `총 ${Number(n || 0).toLocaleString("ko-KR")}건`,
  provenance: "출처: 공개 특허 문헌(국가별 특허청 공개본)에서 물질명·CAS 일치로 자동 매핑. 일부 오검출이 있을 수 있습니다.",
  none: "이 물질과 연결된 공개 특허 문헌 매핑 자료가 없습니다.",
  loading: "불러오는 중…",
  byJurisdiction: { ko: "관할별 건수", en: "By jurisdiction" },
  byYear: { ko: "연도별 건수", en: "By year" },
  earlierYears: (from, n) => `${from}년 이전 ${Number(n || 0).toLocaleString("ko-KR")}건`,
  filterLabel: "관할",
  filterRecent: "최근 등록(전체 관할)",
  filterOption: (name, n) => `${name} · ${Number(n || 0).toLocaleString("ko-KR")}건`,
  listRecent: (n) => `최근 ${n}건`,
  listJurisdiction: (name, from, to, total) =>
    `${name} · ${from}–${to} / ${Number(total || 0).toLocaleString("ko-KR")}건 (최신순)`,
  truncated: (kept, total) =>
    `이 관할은 최신 ${Number(kept || 0).toLocaleString("ko-KR")}건만 제공합니다(전체 ${Number(total || 0).toLocaleString("ko-KR")}건).`,
  cols: ["특허 번호", "발명의 명칭", "관할", "연도"],
  open: "원문 보기",
  prev: "← 이전",
  next: "다음 →",
  page: (p, n) => `${p} / ${n}`,
  jurisdictionAria: (name) => `${name} 특허만 보기`,
};

// INTL_JURISDICTIONS 에 없는 공개 특허 관할 코드(특허청·옛 나라). 없는 코드는 코드 그대로 보인다.
const PATENT_OFFICE_NAMES_KO = {
  EP: "유럽특허청", WO: "국제출원(WIPO)", EA: "유라시아특허청", AP: "아프리카지역지식재산권기구", OA: "아프리카지식재산권기구",
  SU: "옛 소련", DD: "옛 동독", CS: "옛 체코슬로바키아", YU: "옛 유고슬라비아",
  DE: "독일", FR: "프랑스", ES: "스페인", RU: "러시아", IT: "이탈리아", UA: "우크라이나", PL: "폴란드", HU: "헝가리",
  AT: "오스트리아", BE: "벨기에", DK: "덴마크", SE: "스웨덴", FI: "핀란드", NO: "노르웨이", PT: "포르투갈", GR: "그리스",
  CZ: "체코", SK: "슬로바키아", RO: "루마니아", BG: "불가리아", IL: "이스라엘", ZA: "남아프리카공화국", NZ: "뉴질랜드",
  MY: "말레이시아", PH: "필리핀", BR: "브라질", AR: "아르헨티나", HK: "홍콩", IE: "아일랜드",
};

Object.assign(window, { PATENT_MAPPING_LABELS_KO, PATENT_OFFICE_NAMES_KO });
