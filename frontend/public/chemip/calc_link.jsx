// 공학 계산기 딥링크와 물질 상세 연결(순수 함수).
//   ?view=calc&calc=<계산기 key>&<입력 key>=<값>&name=<안내에 보일 물질 이름>
//   값은 그 칸이 처음 보이는 단위(정의의 show, 없으면 unit)로 읽는다. 선택 칸은 옵션 값(v) 그대로. 표 칸은 채우지 않는다.

const CALC_LINK_RESERVED = ["view", "calc", "name"];

function calcReadLink(search) {
  try {
    const p = new URLSearchParams(search || "");
    if (p.get("view") !== "calc") return null;
    const values = {};
    p.forEach((v, k) => { if (!CALC_LINK_RESERVED.includes(k)) values[k] = v; });
    return { calc: (p.get("calc") || "").trim(), name: (p.get("name") || "").trim(), values };
  } catch (e) {
    return null;
  }
}

// 빈 문자열 값도 넣는다 — 칸을 비워 "값을 넣으십시오"가 보이게 하려는 것(물질 분자량을 모를 때).
function calcHref(calc, values = {}, name = "") {
  const p = new URLSearchParams({ view: "calc", calc });
  Object.entries(values).forEach(([k, v]) => { if (v != null) p.set(k, String(v)); });
  if (name) p.set("name", name);
  return `?${p.toString()}`;
}

// MSDS 9항 "분자량"(KOSHA 항목 코드 I38) 값. 앞머리가 숫자(+ 선택 g/mol)이고 그 뒤가 "|" 출처이거나 끝일 때만 읽는다.
const CALC_MW_ITEM = { section: 9, code: "I38", name: "분자량" };
const CALC_MW_PATTERN = /^\s*(\d+(?:\.\d+)?)\s*(?:g\/mol)?\s*(?:\||$)/i;

function calcMolarMassFromSections(sections) {
  const sec = (sections || []).find(s => s.section_seq === CALC_MW_ITEM.section);
  const item = sec?.content?.find(c => c.msdsItemCode === CALC_MW_ITEM.code || c.msdsItemNameKor === CALC_MW_ITEM.name);
  const m = CALC_MW_PATTERN.exec(item?.itemDetail || "");
  const n = m ? Number(m[1]) : NaN;
  return n > 0 ? n : null;
}

// 물질 → ppm ↔ mg/m³ 계산기 주소. 분자량을 못 읽으면 mw 칸을 비워 연다(기본 예시값이 그 물질 값처럼 보이지 않게).
// 안내에 보일 이름은 화면 언어 쪽 이름을 먼저 쓴다(영어 화면은 name_en).
function calcSubstanceHref(selected, sections) {
  const mw = calcMolarMassFromSections(sections);
  const name = (CHEMIP_LANG === "en" ? selected?.name_en || selected?.name : selected?.name || selected?.name_en) || "";
  return calcHref("ppm_mgm3", { mw: mw == null ? "" : mw }, name);
}

// 물질 → 공학 단위 변환기(기체 유량 Nm³/h ↔ kg/h ↔ kmol/h). 분자량을 못 읽으면 mw 를 비워 연다.
function calcSubstanceUnitsHref(selected, sections) {
  const mw = calcMolarMassFromSections(sections);
  const name = (CHEMIP_LANG === "en" ? selected?.name_en || selected?.name : selected?.name || selected?.name_en) || "";
  return calcHref("units", { kind: "gasflow", mw: mw == null ? "" : mw }, name);
}

Object.assign(window, { calcReadLink, calcHref, calcMolarMassFromSections, calcSubstanceHref, calcSubstanceUnitsHref });
