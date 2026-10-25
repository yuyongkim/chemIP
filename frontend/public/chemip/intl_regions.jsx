// Jurisdiction metadata for the international-regulation map.
// Keys match the `country` codes returned by /api/regulations/international/{cas}
// (backend/core/intl_regulatory_store.py REGULATION_LABELS). Ids are world-atlas ISO 3166 numeric.

const EU_MEMBER_ISO = [
  "040", "056", "100", "191", "196", "203", "208", "233", "246", "250", "276", "300", "348", "372",
  "380", "428", "440", "442", "470", "528", "616", "620", "642", "703", "705", "724", "752",
];

const INTL_JURISDICTIONS = {
  KR: { ko: "한국", en: "Korea", iso: ["410"] },
  US: { ko: "미국", en: "United States", iso: ["840"] },
  EU: { ko: "유럽연합", en: "European Union", iso: EU_MEMBER_ISO },
  NL: { ko: "네덜란드", en: "Netherlands", iso: ["528"] },
  MX: { ko: "멕시코", en: "Mexico", iso: ["484"] },
  IN: { ko: "인도", en: "India", iso: ["356"] },
  PK: { ko: "파키스탄", en: "Pakistan", iso: ["586"] },
  VN: { ko: "베트남", en: "Vietnam", iso: ["704"] },
  CN: { ko: "중국", en: "China", iso: ["156"] },
  JP: { ko: "일본", en: "Japan", iso: ["392"] },
  AU: { ko: "호주", en: "Australia", iso: ["036"] },
  TW: { ko: "대만", en: "Taiwan", iso: ["158"] },
  SG: { ko: "싱가포르", en: "Singapore", iso: ["702"] },
  CA: { ko: "캐나다", en: "Canada", iso: ["124"] },
  GB: { ko: "영국", en: "United Kingdom", iso: ["826"] },
  CH: { ko: "스위스", en: "Switzerland", iso: ["756"] },
  TR: { ko: "튀르키예", en: "Türkiye", iso: ["792"] },
  SA: { ko: "사우디아라비아", en: "Saudi Arabia", iso: ["682"] },
  INTL: { ko: "국제협약", en: "International conventions", iso: [] },
};

function jurisdictionLabel(code) {
  const j = INTL_JURISDICTIONS[code];
  return j ? `${j.ko} · ${j.en}` : code;
}

Object.assign(window, { INTL_JURISDICTIONS, jurisdictionLabel });
