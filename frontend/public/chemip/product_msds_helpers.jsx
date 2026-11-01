// MSDS 항목 순수 함수 — 응답의 section(content[]) → 표시 줄, §15·§2 문장 → 규제 의무 표시.
// 라벨 문구는 PRODUCT_LABELS.msds.flags(product_labels.jsx).

/* ── MSDS section parsing helpers ───────────────── */
// Backend returns sections as Section 1..16 with content[] containing items with msdsItemNameKor + itemDetail.
// For panel display, return readable "key: value" rows.
function parseSectionRows(section) {
  if (!section || !section.content) return [];
  return section.content
    .filter(it => it.itemDetail && it.itemDetail !== "자료없음" && it.msdsItemNameKor)
    .map(it => ({ k: it.msdsItemNameKor, v: it.itemDetail, code: it.msdsItemCode, lev: it.lev }));
}

function sectionStatus(section) {
  const rows = parseSectionRows(section);
  return rows.length > 0 ? "ok" : "empty";
}

// Regulatory-obligation flags. Scans §15 (Korean regulations) + §2 (GHS hazards)
// so a real obligation is never hidden behind a single "해당없음" line.
const MSDS_FLAG_TEXT = PRODUCT_LABELS.msds.flags;
const MSDS_REG_FLAGS = [
  { re: /발암/, label: MSDS_FLAG_TEXT.carcinogen, tone: "bad" },
  { re: /H350/, label: MSDS_FLAG_TEXT.h350, tone: "bad" },
  { re: /변이원|생식세포/, label: MSDS_FLAG_TEXT.mutagen, tone: "bad" },
  { re: /H340/, label: MSDS_FLAG_TEXT.h340, tone: "bad" },
  { re: /생식독성|생식능력|태아/, label: MSDS_FLAG_TEXT.reprotox, tone: "bad" },
  { re: /관리대상유해물질/, label: MSDS_FLAG_TEXT.managed, tone: "bad" },
  { re: /유독물질/, label: MSDS_FLAG_TEXT.toxic, tone: "bad" },
  { re: /사고대비물질/, label: MSDS_FLAG_TEXT.accident, tone: "bad" },
  { re: /제한물질|금지물질/, label: MSDS_FLAG_TEXT.restricted, tone: "bad" },
  { re: /중점관리물질/, label: MSDS_FLAG_TEXT.priority, tone: "warn" },
  { re: /작업환경측정/, label: MSDS_FLAG_TEXT.workEnv, tone: "warn" },
  { re: /특수건강진단/, label: MSDS_FLAG_TEXT.healthExam, tone: "warn" },
  { re: /공정안전보고서|PSM/, label: MSDS_FLAG_TEXT.psm, tone: "warn" },
  { re: /노출기준/, label: MSDS_FLAG_TEXT.oel, tone: "info" },
];

function regChips(rowSets) {
  const text = rowSets.flat().map(r => `${r.k} ${r.v}`).join(" | ");
  const seen = new Set();
  const chips = [];
  MSDS_REG_FLAGS.forEach(f => {
    if (f.re.test(text) && !seen.has(f.label)) { seen.add(f.label); chips.push(f); }
  });
  return chips;
}

function splitReg(v) {
  return String(v || "").split(/[|·\n]/).map(s => s.trim()).filter(s => s && s !== "해당없음");
}

// 머리의 유해성 표시: §2 첫 실제 문장에서 인화성·자극성을 찾는다.
function msdsHazardSummary(sections) {
  const sec2 = sections?.find(s => s.section_seq === 2);
  const hazardText = sec2?.content?.find(c => c.itemDetail && c.itemDetail !== "자료없음")?.itemDetail || "";
  return { hazardText, isFlammable: /인화성|flammable/i.test(hazardText), isIrritant: /자극|irritant/i.test(hazardText) };
}

// KOSHA 이름의 "( 관용명 : … )" 는 떼어 synonym 으로 둔다(chem_name_core.jsx chemSplitKoshaName: "에틸렌 ( 관용명 : ACETENE )" → 에틸렌).
// 이름이 "벤젠 (Benzene)" 처럼 영문명을 괄호로 달고 오면 머리에서 영문이 두 번 보이지 않게 뗀다.
// primary = 화면 언어의 이름(영어 화면은 영문명이 있으면 영문명), secondary = 다른 쪽 이름(같거나 없으면 ""),
// synonym = KOSHA 관용명(영문명과 같으면 "").
function chemDisplayNames(selected) {
  const enName = selected?.name_en || "";
  const { name: rawKr, synonym: rawSyn } = chemSplitKoshaName(selected?.name || "");
  const krName = enName && rawKr.toLowerCase().endsWith(`(${enName.toLowerCase()})`) ? rawKr.slice(0, -(enName.length + 2)).trim() || rawKr : rawKr;
  const [first, second] = tr([krName || enName, enName], [enName || krName, krName]);
  const primary = first || "—";
  const secondary = second && second.toLowerCase() !== primary.toLowerCase() && !primary.includes(second) ? second : "";
  const synonym = rawSyn && rawSyn.toLowerCase() !== enName.toLowerCase() ? rawSyn : "";
  return { enName, krName, primary, secondary, synonym };
}

// 화면 언어로 고른 물질 이름 하나(요약 제목·표 첫 칸 등). 관용명은 뺀 이름.
function chemPrimaryName(selected) {
  return chemDisplayNames(selected).primary;
}

// 같은 이름이지만 없으면 ""(뒤에 CAS 등 다른 값을 이어 붙일 때).
function chemLocalName(item) {
  const { krName, enName } = chemDisplayNames(item);
  return tr(krName || enName, enName || krName);
}

Object.assign(window, { parseSectionRows, sectionStatus, MSDS_REG_FLAGS, regChips, splitReg, msdsHazardSummary, chemDisplayNames, chemPrimaryName, chemLocalName });
