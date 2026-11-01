// "KORA 입력 준비표" 순수 함수 — 장외 영향 계산기 결과(입력 값·출력) + 물질 자료(정적 f/<CAS>.json, el/<CAS>.json, EPA 지침 표)
// → 절(섹션)·줄 모양. React·fetch 없음. 문구는 KORA_SHEET. 숫자 표기는 calcFormatNumber, MSDS 값 글자는 factsDisplayValue.
// 줄: { label, value, source, blank?: 손으로 쓸 칸, sourceText?: 원문(한국어 MSDS) 글자 }

const KORA_SHEET_SECTIONS = ["site", "substance", "storage", "scenario", "weather", "terrain", "checks"];

function koraNum(n, unit, digits = 4) {
  return n == null || !Number.isFinite(n) ? "" : `${calcFormatNumber(n, digits)}${unit ? ` ${unit}` : ""}`;
}

function koraFactRow(facts, prop, label, lang) {
  const L = KORA_SHEET;
  const rows = (typeof factsRows === "function" ? factsRows(facts, prop) : []).filter(r => r.row);
  if (!rows.length) return { label, value: L.noValue, source: L.sourceMsds };
  const parts = rows.map(r => factsDisplayValue(r.row, lang));
  return { label, value: parts.map(p => p.text).join(" – "), source: L.sourceMsds, sourceText: parts.some(p => p.sourceText) };
}

// 비상대응 기준 파일 → 독성 끝점 줄들(ERPG-2 → AEGL-2 → PAC-2 순서, 값이 없으면 "자료 없음")
function koraEndpointRows(el, sub) {
  const L = KORA_SHEET, S = L.substance;
  const unitOf = (u) => (u === "mg/m3" ? "mg/m³" : u || "");
  const e = el && el.erpg, a = el && el.aegl, p = el && el.pac;
  const rows = [
    { label: S.erpg, value: e && e.v && e.v[1] != null ? koraNum(e.v[1], unitOf(e.unit), 3) : L.noValue, source: tr("AIHA ERPG, DOE PAC Rev. 29 경유", "AIHA ERPG via DOE PAC Rev. 29") },
    { label: S.aegl, value: a && a.v && a.v["2"] ? a.v["2"].slice(0, 3).map(x => (x == null ? "NR" : calcFormatNumber(x, 3))).join(" · ") + ` ${unitOf(a.unit)}` : L.noValue,
      source: a ? `EPA AEGL (${a.status || ""})` : "EPA AEGL" },
    { label: S.pac, value: p && p.v && p.v[1] != null ? koraNum(p.v[1], unitOf(p.unit), 3) : L.noValue, source: "DOE PAC Rev. 29" },
  ];
  if (sub && sub.ep != null) rows.push({ label: S.rmpEp, value: `${koraNum(sub.epPpm, "ppm", 3)} (${koraNum(sub.ep, "mg/L", 3)}) · ${sub.basis || ""}`, source: tr("40 CFR 68 부록 A", "40 CFR 68 Appendix A") });
  return rows;
}

function koraSheetModel({ values, outputs, facts, el, lang }) {
  const L = KORA_SHEET, S = L.substance, St = L.storage, Sc = L.scenario, W = L.weather, T = L.terrain;
  const toxic = values.cat !== "flam";
  const sub = toxic ? calcRmpToxic(values.sub_t) : calcRmpFlammable(values.sub_f);
  const blank = (label) => ({ label, value: "", source: "", blank: true });
  const names = facts && facts.names;
  const localName = names ? (lang === "en" ? (names.en || [])[0] : (names.ko || [])[0]) : "";
  const un = facts && facts.transport && facts.transport[0];
  const calcSrc = L.sourceCalc;
  const optChoice = (key) => {
    const def = calcFind("offsite");
    const inp = def && def.inputs.find(i => i.key === key);
    const o = inp && inp.options.find(x => x.v === values[key]);
    return o ? o.label : "";
  };
  const substance = [
    { label: S.name, value: [sub && sub.name, localName && localName !== (sub && sub.name) ? localName : ""].filter(Boolean).join(" / "), source: L.sourceRmp, sourceText: Boolean(localName) && lang !== "en" },
    { label: S.cas, value: sub ? sub.cas : "", source: L.sourceRmp },
    { label: S.state, value: sub ? (sub.state === "gas" ? S.gas : S.liquid) : "", source: L.sourceRmp },
    { label: S.mw, value: koraNum(sub && sub.mw, "g/mol"), source: L.sourceRmp },
    koraFactRow(facts, "boiling_point", S.bp, lang),
    koraFactRow(facts, "vapor_pressure", S.vp, lang),
    koraFactRow(facts, "relative_density", S.density, lang),
    koraFactRow(facts, "flash_point", S.flash, lang),
    koraFactRow(facts, "flammability", S.flam, lang),
    { label: S.un, value: un ? `UN ${un.un}${un.class ? ` · ${un.class}` : ""}` : L.noValue, source: L.sourceMsds },
  ];
  if (toxic) substance.push(...koraEndpointRows(el, sub));
  else substance.push({ label: S.hc, value: koraNum(sub && sub.hc_kJkg, "kJ/kg"), source: L.sourceRmp }, { label: S.flamEp, value: S.flamEpValue, source: tr("40 CFR 68.22 · 국내 기술지침", "40 CFR 68.22 · Korean guideline") });
  const storage = [
    { label: St.qty, value: values.QS != null ? `${koraNum(values.QS, "kg")} (${koraNum(values.QS / CALC_RMP_SI.lb, "lb")})` : "", source: calcSrc },
    values.T != null ? { label: St.temp, value: koraNum(values.T - 273.15, "°C", 3), source: calcSrc } : blank(St.temp),
    values.Pt != null ? { label: St.press, value: koraNum(values.Pt / 1000, "kPa (abs)", 4), source: calcSrc } : blank(St.press),
    blank(St.form),
    values.mit === "dike" && values.dikeA ? { label: St.dike, value: koraNum(values.dikeA, "m²"), source: calcSrc } : blank(St.dike),
    { label: St.building, value: values.mit === "building" ? tr("예", "Yes") : tr("아니오", "No"), source: calcSrc },
  ];
  const scenario = [
    { label: Sc.kind, value: values.scn === "alt" ? Sc.alt : Sc.worst, source: calcSrc },
    { label: Sc.event, value: toxic ? tr("독성 물질 누출", "Toxic release") : (values.scn === "alt" ? optChoice("event") : tr("증기운 폭발", "Vapour cloud explosion")), source: calcSrc },
    ...(values.scn === "alt" ? [{ label: Sc.how, value: optChoice("alt"), source: calcSrc }] : []),
    ...(values.dh != null && values.scn === "alt" && values.alt === "hole" ? [{ label: Sc.hole, value: koraNum(values.dh * 1000, "mm", 3), source: calcSrc }] : []),
    ...(outputs && outputs.rate != null ? [{ label: Sc.rate, value: koraNum(outputs.rate * 60, "kg/min"), source: L.sourceRmp }] : []),
    ...(outputs && outputs.minutes != null ? [{ label: Sc.duration, value: koraNum(outputs.minutes / 60, "min", 3), source: L.sourceRmp }] : []),
    ...(outputs && outputs.area != null ? [{ label: Sc.pool, value: koraNum(outputs.area, "m²"), source: L.sourceRmp }] : []),
    ...(outputs && outputs.dist != null ? [{ label: Sc.screen, value: `${koraNum(outputs.dist / 1000, "km", 3)} (${koraNum(outputs.distMi, "mi", 2)})`, source: Sc.screenNote }] : []),
  ];
  const weather = [
    { label: Sc.worst, value: W.worst, source: "40 CFR 68.22(b)" },
    { label: Sc.alt, value: W.alt, source: "" },
    blank(W.station), blank(W.wind), blank(W.temp), blank(W.humid), blank(W.stab),
  ];
  const terrain = [
    { label: T.topo, value: values.topo ? optChoice("topo") : "", source: calcSrc, blank: !values.topo },
    blank(T.rough), blank(T.receptors), blank(T.population),
  ];
  const site = [blank(L.site.name), blank(L.site.process), blank(L.site.coords), blank(L.site.author)];
  const checks = L.checks.map(c => ({ label: c, value: "☐", source: "", check: true }));
  const rows = { site, substance, storage, scenario, weather, terrain, checks };
  return { sub, sections: KORA_SHEET_SECTIONS.map(k => ({ key: k, title: L.sections[k], rows: rows[k] })) };
}

Object.assign(window, { KORA_SHEET_SECTIONS, koraNum, koraFactRow, koraEndpointRows, koraSheetModel });
