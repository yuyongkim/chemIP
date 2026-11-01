// 경고표지 만들기 순수 함수 — MSDS 2항 → 입력 칸 값, 입력 칸 값 + 문구표 → 표지 내용(크기·언어·예방조치문구 줄이기).
// 파싱은 ghs_helpers.jsx, 표지 글(제목 등)은 ghsSheetLabels(lang). React 없음.

// 크기 키. 치수(가로 놓기 A4 297×210 · A5 210×148 · 소형 100×70 mm)·그림문자 크기·글자 크기·@page 는 한 곳,
// checklist_print.css 의 .gl-sheet[data-size] 에 둔다(그림문자 한 변은 표지 면적의 1/40 보다 넉넉하게). 이름은 GHS_LABELS.options.sizes.
const GHS_LABEL_SIZES = [{ k: "a4" }, { k: "a5" }, { k: "small" }];
const GHS_LABEL_DEFAULT_SIZE = "a5";
// 예방조치문구를 줄일 때 남기는 수(예방·대응·저장·폐기에서 하나씩 먼저)
const GHS_LABEL_MAX_P = 6;
const GHS_P_ORDER = ["general", ...GHS_P_GROUPS];

function ghsLabelSize(k) {
  return GHS_LABEL_SIZES.find(s => s.k === k) || GHS_LABEL_SIZES.find(s => s.k === GHS_LABEL_DEFAULT_SIZE);
}

// 줄이기 기본값: A4 는 다 싣고, 작은 크기는 줄인다
function ghsDefaultAbbreviate(sizeKey) {
  return sizeKey !== "a4";
}

// 물질 상세 → 표지 언어 이름. "벤젠 (Benzene)" 은 괄호 영문을 떼고, 영어 표지는 영문명 먼저.
function ghsProductName(detail, lang) {
  const en = String(detail?.name_en || "").trim();
  const raw = String(detail?.name || "").trim();
  const ko = en && raw.toLowerCase().endsWith(`(${en.toLowerCase()})`) ? raw.slice(0, -(en.length + 2)).trim() || raw : raw;
  return lang === "en" ? (en || ko) : (ko || en);
}

function ghsStatementLine(st) {
  if (st.code && st.text) return `${st.code} : ${st.text}`;
  return st.code || st.text || "";
}

function ghsStatementsToText(list) {
  return (list || []).map(ghsStatementLine).filter(Boolean).join("\n");
}

function ghsEmptyForm() {
  const precautions = {};
  GHS_P_GROUPS.forEach(g => { precautions[g] = ""; });
  return { product: "", cas: "", signal: "", pictograms: [], hazards: "", precautions };
}

// ghsSection2 결과 + 물질 상세 → 입력 칸 값(원문 그대로, KOSHA 문장은 한국어)
function ghsFormFromSection2(s2, detail, lang) {
  const form = ghsEmptyForm();
  form.product = ghsProductName(detail, lang);
  form.cas = String(detail?.cas_no || "").trim();
  if (!s2) return form;
  form.signal = s2.signal || "";
  form.pictograms = [...(s2.pictograms || [])];
  form.hazards = ghsStatementsToText(s2.hazards);
  GHS_P_GROUPS.forEach(g => { form.precautions[g] = ghsStatementsToText(s2.precautions?.[g]); });
  return form;
}

// 문구표(assets/ghs/phrases.json)에서 코드 하나의 문장. 묶음 코드(P301+P312)가 없으면 낱개 문장을 잇는다.
// → { text, unofficial, fallback }(fallback = 표지 언어 문장이 없어 다른 언어 문장)
function ghsPhraseFor(code, lang, phrases) {
  const none = { text: "", unofficial: false, fallback: false };
  if (!code || !phrases) return none;
  const other = lang === "en" ? "ko" : "en";
  const pick = (l) => {
    const table = phrases[l] || {};
    if (table[code]) return { text: table[code], parts: [code] };
    const parts = code.split("+");
    if (parts.length > 1 && parts.every(p => table[p])) return { text: parts.map(p => table[p]).join(" "), parts };
    return null;
  };
  const unofficialOf = (l, parts) => l === "ko" && parts.some(p => (phrases.ko_unofficial || []).includes(p) || (phrases.ko_unofficial || []).includes(code));
  const hit = pick(lang);
  if (hit) return { text: hit.text, unofficial: unofficialOf(lang, hit.parts), fallback: false };
  const alt = pick(other);
  if (alt) return { text: alt.text, unofficial: unofficialOf(other, alt.parts), fallback: true };
  return none;
}

// 입력 칸 글을 표지 언어로 바꿔 쓴다: 코드가 있고 문구표에 그 언어 문장이 있으면 문장을 바꾸고, 나머지 줄은 그대로.
function ghsTranslateText(text, lang, phrases) {
  if (!phrases) return text;
  return ghsParseStatements(text).map(st => {
    const p = st.code ? ghsPhraseFor(st.code, lang, phrases) : null;
    return ghsStatementLine(p && p.text && !p.fallback ? { code: st.code, text: p.text } : st);
  }).join("\n");
}

function ghsTranslateForm(form, lang, phrases) {
  const precautions = {};
  GHS_P_GROUPS.forEach(g => { precautions[g] = ghsTranslateText(form.precautions[g], lang, phrases); });
  return { ...form, hazards: ghsTranslateText(form.hazards, lang, phrases), precautions };
}

// 문장이 빈 줄은 문구표로 채운다
function ghsFillStatement(st, lang, phrases) {
  if (st.text || !st.code) return { code: st.code, text: st.text, unofficial: false, fallback: false };
  const p = ghsPhraseFor(st.code, lang, phrases);
  return { code: st.code, text: p.text, unofficial: p.unofficial, fallback: p.fallback };
}

// 예방조치문구 줄이기: max 개 이하면 그대로. 넘으면 예방·대응·저장·폐기에서 하나씩 먼저 고르고, 남은 자리는 앞에서부터.
// → { shown(원래 순서), omitted(빠진 수) }
function ghsAbbreviate(list, max = GHS_LABEL_MAX_P) {
  if (list.length <= max) return { shown: list, omitted: 0 };
  const picked = new Set();
  GHS_P_GROUPS.forEach(g => {
    const i = list.findIndex(it => it.group === g);
    if (i >= 0 && picked.size < max) picked.add(i);
  });
  for (let i = 0; i < list.length && picked.size < max; i += 1) picked.add(i);
  const shown = list.filter((_, i) => picked.has(i));
  return { shown, omitted: list.length - shown.length };
}

// 입력 칸의 예방조치문구(칸 4개) → 한 줄 목록. 묶음은 코드가 정하고(P3xx → 대응), 코드가 없으면 적은 칸.
function ghsPrecautionList(precautions, lang, phrases) {
  const all = [];
  const seen = new Set();
  GHS_P_GROUPS.forEach(box => {
    ghsParseStatements(precautions?.[box]).forEach(st => {
      if (st.code && seen.has(st.code)) return;
      if (st.code) seen.add(st.code);
      all.push({ ...ghsFillStatement(st, lang, phrases), group: ghsPGroupOf(st.code) || box });
    });
  });
  return GHS_P_ORDER.flatMap(g => all.filter(it => it.group === g));
}

// 입력 칸 + 공급자 + 고른 크기·언어 → 표지 내용(GhsLabelSheet 가 그대로 그린다)
function ghsBuildLabel({ form, supplier, lang, size, abbreviate, phrases }) {
  const L = ghsSheetLabels(lang);
  const sizeDef = ghsLabelSize(size);
  const hazards = ghsParseStatements(form.hazards).map(st => ghsFillStatement(st, lang, phrases));
  const all = ghsPrecautionList(form.precautions, lang, phrases);
  const { shown, omitted } = abbreviate ? ghsAbbreviate(all) : { shown: all, omitted: 0 };
  const groups = GHS_P_ORDER
    .map(g => ({ group: g, title: L.sheet.groups[g], items: shown.filter(it => it.group === g) }))
    .filter(g => g.items.length > 0);
  const pictograms = (form.pictograms || [])
    .filter(c => GHS_PICTOGRAM_CODES.includes(c))
    .map(code => ({ code, src: ghsPictogramSrc(code), alt: `${code} ${L.pictograms[code] || ""}`.trim() }));
  const s = supplier || {};
  return {
    lang,
    size: sizeDef,
    text: L.sheet,
    product: String(form.product || "").trim(),
    cas: String(form.cas || "").trim(),
    signal: form.signal ? { k: form.signal, text: L.signal[form.signal] || "" } : null,
    pictograms,
    hazards,
    precautions: groups,
    precautionCount: all.length,
    omitted,
    seeSds: omitted > 0,
    hasUnofficial: [...hazards, ...shown].some(it => it.unofficial),
    supplier: { name: String(s.name || "").trim(), address: String(s.address || "").trim(), phone: String(s.phone || "").trim() },
    emergency: String(s.emergency || "").trim(),
  };
}

Object.assign(window, {
  GHS_LABEL_SIZES, GHS_LABEL_DEFAULT_SIZE, GHS_LABEL_MAX_P, ghsLabelSize, ghsDefaultAbbreviate, ghsProductName,
  ghsStatementLine, ghsStatementsToText, ghsEmptyForm, ghsFormFromSection2, ghsPhraseFor, ghsTranslateText, ghsTranslateForm,
  ghsFillStatement, ghsAbbreviate, ghsPrecautionList, ghsBuildLabel,
});
