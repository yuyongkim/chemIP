// 물질 상세 "분류로 걸리는 규제"(참고용) 문구(한국어 기준 모양, CATRULE_LABELS_KO). 영어: catrule_labels_en.jsx → 화면이 읽는 CATRULE_LABELS.
// "해당·위반·적합" 판정 문구는 쓰지 않는다. 규정 이름·수량은 자료(catrule_data.jsx, APL_PSM·APL_HAZMAT)에서 읽는다.

function catFmtNum(v, digits = 1) {
  if (!Number.isFinite(v)) return "—";
  return Number(v.toFixed(digits)).toLocaleString(CHEMIP_LANG === "en" ? "en-US" : "ko-KR");
}

// 유해성 key("flam_gas:1") → 이름. style "clp": CLP 코드("Flam. Gas 1"), 아니면 화면 언어 이름("인화성 가스 구분 1"). 이름표는 SAFETY_RULES.ghs.
function catHazardName(h, style = "") {
  const [key, rawCat = ""] = String(h || "").split(":");
  const d = (typeof SAFETY_RULES !== "undefined" && SAFETY_RULES.ghs.hazards[key]) || null;
  const cat = rawCat.replace(/\*+$/, "").replace(/^3[NR]$/, "3");
  if (!d) return String(h || "");
  if (style === "clp") return `${(d.clp && d.clp[0]) || d.en}${cat ? ` ${cat}` : ""}`;
  return cat ? tr(`${d.ko} 구분 ${cat}`, `${d.en}, Category ${cat}`) : tr(d.ko, d.en);
}

const CATRULE_LABELS_KO = {
  heading: { ko: "분류로 걸리는 규제", en: "Rules by hazard class" },
  meta: (n) => `참고용 · 사전 검토용 · ${n}건`,
  metaLoading: "참고용 · 불러오는 중…",
  intro: "물질 이름 목록이 아니라 유해성 분류(GHS)·인화점·폭발 한계로 정해지는 규정입니다. 위 국가별 규제·국내 목록(이름으로 오른 목록)과 따로 봅니다. 실제 대상 여부는 취급량·공정 조건·예외 규정에 따라 달라집니다.",
  none: "이 물질의 분류·물성으로 걸리는 규정을 찾지 못했습니다(자료가 없을 수 있습니다).",
  noCas: "CAS 번호가 없어 분류 기준 규정을 볼 수 없습니다.",
  status: { applies: "분류로 해당", check: "확인 필요", named: "이름 목록", msds: "MSDS 15항" },
  titles: {
    kr_psm_named: (ref) => `공정안전보고서(PSM) 별표 13 제${ref.no}호 ${ref.ko}`,
    kr_psm_gas: () => `공정안전보고서(PSM) 별표 13 제1호 인화성 가스`,
    kr_psm_liquid: () => `공정안전보고서(PSM) 별표 13 제2호 인화성 액체`,
    b9: (ref) => `위험물질 기준량 별표 9 ${ref.no} — ${ref.ko}`,
    kr_hazmat: (ref) => `위험물 ${APL_HAZMAT.classes[ref.cls].ko} ${ref.ko}`,
    us_psm_flam: () => "OSHA 공정안전관리(PSM) — 인화성 가스·액체",
    seveso_named: () => "Seveso III 부록 I 2부 지정 물질",
    seveso: (ref) => `Seveso III 부록 I 1부 ${ref.code} ${ref.ko}`,
  },
  qty: {
    kr_psm_named: (ref) => `규정량 ${catFmtNum(ref.q, 0)} kg`,
    kr_psm_flam: (ref) => `규정량 제조·취급 ${catFmtNum(ref.handle, 0)} kg · 저장 ${catFmtNum(ref.store, 0)} kg`,
    b9: (ref) => `기준량 ${catFmtNum(ref.q, 0)} ${ref.unit}`,
    kr_hazmat: (ref) => `지정수량 ${catFmtNum(ref.qty, 0)} ${ref.unit}`,
    us_psm_flam: (ref) => `한 장소 ${catFmtNum(ref.lb, 0)} lb (${catFmtNum(ref.kg, 1)} kg) 이상`,
    seveso_named: () => "2부 수량이 1부보다 먼저 적용(부록 I 머리말) — 국가별 규제의 Seveso III 항목 참고",
    seveso: (ref) => `하위 ${catFmtNum(ref.lower, 0)} t · 상위 ${catFmtNum(ref.upper, 0)} t`,
  },
  basis: {
    psmBasis: (v) => (!v ? "" : v.k === "lfl" ? `폭발 하한 ${catFmtNum(v.lfl)} %${v.ufl != null ? `·상한 ${catFmtNum(v.ufl)} %` : ""} (하한 13 % 이하 또는 범위 12 %p 이상)` : v.k === "flash" ? `인화점 ${catFmtNum(v.flash)} ℃ (60 ℃ 이하)` : ""),
    hazard: (v) => `분류: ${v.list.map(h => catHazardName(h)).join(", ")}`,
    hazardSrc: (v) => `${v.src === "clp" ? "EU 조화 분류" : "KOSHA MSDS 분류"}: ${v.list.map(h => catHazardName(h, v.src === "clp" ? "clp" : "")).join(", ")}`,
    flashBp: (v) => `인화점 ${catFmtNum(v.flash)} ℃${v.bp != null ? ` · 끓는점 ${catFmtNum(v.bp)} ℃` : ""}`,
    flash: (v) => `인화점 ${catFmtNum(v.flash)} ℃ (${catFmtNum(v.limit)} ℃ 미만)`,
    s15: (v) => `MSDS 15항: ${v.text}`,
  },
  notes: {
    limitsSwapped: "MSDS 9항 폭발 한계의 하한이 상한보다 커서 판단에 쓰지 않았습니다.",
    cityGas: "연료용 도시가스(메탄 85 % 이상, 0.1 MPa 미만)는 취급 규정량 50,000 kg (별표 13 비고 2).",
    noProperty: "MSDS 9항 물성 값이 없어 분류로만 보았습니다. 인화 기준(별표 13 비고 1·3)을 확인하세요.",
    dailyMax: "기준량은 설비의 하루 최대 제조·취급량 기준입니다(별표 9 비고).",
    hz_solubleUnknown: "수용성 여부가 적혀 있지 않아 비수용성으로 보았습니다.",
    hz_multiQty: "품명의 지정수량이 여럿이라 가장 작은 값을 보였습니다.",
    hz_type5: "제5류는 시험 결과로 제1종·제2종이 정해집니다.",
    hz_itemUnknown: "품명을 알아보지 못했습니다.",
    alsoAppendixA: "부록 A 지정 물질이기도 합니다(국가별 규제의 OSHA PSM 부록 A 항목).",
    sourcesDiffer: "KOSHA 분류와 EU 조화 분류의 인화성 가스 구분이 달라 확인이 필요합니다.",
    atmTank: "예외: 대기압 탱크에 끓는점 아래로 냉각 없이 두는 인화성 액체, 사업장 연료로만 쓰는 탄화수소 연료((a)(1)(ii)(A)·(B)).",
    noClp: "EU 조화 분류(CLP 부록 VI)에 없는 물질이라 KOSHA 분류로 본 참고값입니다.",
    liquefied: () => `액화 상태로 두면 2부 제${CATRULE_DATA.sevesoLiquefied.entry}호 액화 인화성 가스(LPG 포함)·천연가스 ${catFmtNum(CATRULE_DATA.sevesoLiquefied.lower, 0)} / ${catFmtNum(CATRULE_DATA.sevesoLiquefied.upper, 0)} t 이 먼저입니다.`,
    p5ab: "구분 2·3 이라도 끓는점 위로 유지하면 P5a(10 / 50 t), 고압·고온 등 특별한 공정 조건이면 P5b 입니다.",
  },
  clpLine: (codes, atp) => `EU 조화 분류(CLP 부록 VI${atp ? `, ${atp} 표` : ""}): ${codes.join(" · ")}`,
  clpNone: "EU 조화 분류(CLP 부록 VI)에 이 CAS 가 없습니다.",
  oldEuNote: "MSDS 15항의 EU 분류(R 문구, 예: F+; R12)는 폐지된 옛 지침(67/548/EEC) 표기입니다. 현행 EU 분류는 위 CLP 부록 VI 줄을 보세요.",
  source: "원문 ↗",
  disclaimer: "참고용 스크리닝 · 사전 검토용입니다. 대상 여부를 판정하지 않으며, 수량 합산·예외·혼합물 기준은 원문과 소관 기관에 확인하세요. 수량은 각 법령·지침 원문에서 옮겨 적었습니다.",
  calcLink: "적용 법규 판정기로 취급량 넣어 보기 →",
};

Object.assign(window, { catFmtNum, catHazardName, CATRULE_LABELS_KO });
