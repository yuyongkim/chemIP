// 혼합물 GHS 분류 순수 함수(mg*) — 성분의 분류·함량 → 혼합물의 건강·환경 유해성 분류와 단계별 근거. 상수: SAFETY_RULES.mixture,
// 구분별 H 문구·그림문자·신호어: SAFETY_RULES.ghs. 근거: CLP 부속서 I(가산식 ATEmix 3.1.3.6, 가산법 표 3.2.3·3.3.3, 농도 한계 표 3.4.5·
// 3.5.2·3.6.2·3.7.2·3.8.3·3.9.4, 흡인 3.10.3.3, 수생 합산 4.1.3.5.5)·UN GHS Rev.10. 시험: ECHA CLP 지침 예제(test_safety_tools.cjs).
// 물리적 위험성(인화성 등)은 혼합물 시험값이 필요해 여기서 분류하지 않는다.
//
// 성분 모양: { name, c (% w/w), hazards: ["acute_oral:3", "skin:1B*", …], scl: [[key, cat, 하한 %]], ate: { oral, dermal, gas, vapour, dust },
//             m: { acute, chronic }, unknownAcute (급성 독성 자료 없음) }
// 결과: { classes: [{ key, cat }], steps: [단계], notes: [{ k, … }] }. 단계·알림은 글이 아니라 값 — 문구는 mixghs_steps.jsx 가 SAFETY_LABELS 로 그린다.

function mgCats(comp, key) {
  return (comp.hazards || []).map(ghpEntryParts).filter(p => p.key === key).map(p => p.cat);
}

function mgHas(comp, key, cats) {
  return mgCats(comp, key).some(c => !cats || cats.includes(c));
}

// 그 성분의 특정 농도 한계(하한 %) — cats 중 가장 낮은 하한, 없으면 null
function mgScl(comp, key, cats) {
  const lows = (comp.scl || []).filter(([k, c]) => k === key && cats.includes(c)).map(s => s[2]);
  return lows.length ? Math.min(...lows) : null;
}

const MG_SKIN1 = ["1", "1A", "1B", "1C"];
const MG_SUBCAT_ORDER = ["1A", "1B", "1C", "1", "2"];

/* ── 급성 독성(ATEmix) ── */
function mgAcuteCategory(value, bounds) {
  const i = bounds.findIndex(b => value <= b);
  return i < 0 ? null : String(i + 1);
}

// 성분 하나의 그 경로 ATE: 적어 둔 값이 먼저, 없으면 구분 → 환산 점추정값(표 3.1.2)
function mgComponentAte(comp, route, R) {
  const r = R.acute.routes[route];
  const keys = [r.hazard, ...(route === R.acute.inhalation_unstated ? ["acute_inh"] : [])];
  const cats = keys.flatMap(k => mgCats(comp, k)).filter(c => /^[1-4]$/.test(c)).sort();
  const given = comp.ate && comp.ate[route] != null ? Number(comp.ate[route]) : null;
  if (given != null && given > 0) {
    const cat = cats[0] || mgAcuteCategory(given, r.bounds);
    return cat ? { ate: given, how: "given", cat, unstated: false } : null;
  }
  if (!cats.length) return null;
  const unstated = !mgCats(comp, r.hazard).length;
  return { ate: r.converted[Number(cats[0]) - 1], how: "converted", cat: cats[0], unstated };
}

function mgAcuteRoute(comps, route, R) {
  const A = R.acute;
  const rows = [], skipped = [];
  let unknown = 0, sum = 0, unstated = false;
  comps.forEach(comp => {
    const c = Number(comp.c) || 0;
    if (comp.unknownAcute) {
      if (c >= A.relevant_min) unknown += c;
      return;
    }
    const a = mgComponentAte(comp, route, R);
    if (!a) return;
    const relevant = c >= A.relevant_min || (Number(a.cat) <= 3 && c >= A.relevant_min_cat_1_3);
    if (!relevant) { skipped.push({ name: comp.name, c, cat: a.cat }); return; }
    rows.push({ name: comp.name, c, ate: a.ate, how: a.how, cat: a.cat });
    sum += c / a.ate;
    unstated = unstated || a.unstated;
  });
  if (!rows.length) return null;
  const corrected = unknown >= A.unknown_correction_from;
  const ateMix = (corrected ? 100 - unknown : 100) / sum;
  const cat = mgAcuteCategory(ateMix, A.routes[route].bounds);
  return { kind: "acute", route, unit: A.routes[route].unit, rows, skipped, unknown, corrected, sum, ateMix, cat, unstated,
    hazard: A.routes[route].hazard };
}

/* ── 피부 부식성·자극성 (가산법, 표 3.2.3) ── */
function mgSkin(comps, R) {
  const S = R.skin;
  const rel = comps.filter(x => (Number(x.c) || 0) >= S.relevant_min);
  const corrRows = rel.filter(x => mgHas(x, "skin", MG_SKIN1)).map(x => {
    const scl = mgScl(x, "skin", MG_SKIN1);
    return { name: x.name, c: Number(x.c), limit: scl ?? S.corr_gcl, scl: scl != null };
  });
  const irrRows = rel.filter(x => mgHas(x, "skin", [...MG_SKIN1, "2"])).map(x => {
    const scl = mgScl(x, "skin", ["2"]);
    const isCorr = mgHas(x, "skin", MG_SKIN1);
    return { name: x.name, c: Number(x.c), limit: scl ?? (isCorr ? S.irrit_from_corr_gcl : S.irrit_gcl), scl: scl != null };
  });
  return mgSumSteps("skin", [["1", corrRows], ["2", irrRows]]);
}

/* ── 눈 손상·자극 (가산법, 표 3.3.3) ── */
function mgEye(comps, R) {
  const E = R.eye;
  const rel = comps.filter(x => (Number(x.c) || 0) >= E.relevant_min);
  const isDam = x => mgHas(x, "eye", ["1"]) || mgHas(x, "skin", MG_SKIN1);
  const damRows = rel.filter(isDam).map(x => {
    const scl = mgScl(x, "eye", ["1"]) ?? mgScl(x, "skin", MG_SKIN1);
    return { name: x.name, c: Number(x.c), limit: scl ?? E.dam_gcl, scl: scl != null };
  });
  const irrRows = rel.filter(x => isDam(x) || mgHas(x, "eye", ["2"])).map(x => {
    const scl = mgScl(x, "eye", ["2"]);
    return { name: x.name, c: Number(x.c), limit: scl ?? (isDam(x) ? E.irrit_from_dam_gcl : E.irrit_gcl), scl: scl != null };
  });
  return mgSumSteps("eye", [["1", damRows], ["2", irrRows]]);
}

// 가산 단계: 높은 구분부터 Σ C/한계 ≥ 1 이면 그 구분. 단계마다 기록.
function mgSumSteps(hazard, tiers) {
  const steps = [];
  let cat = null;
  for (const [target, rows] of tiers) {
    if (!rows.length) continue;
    const total = rows.reduce((s, r) => s + r.c / r.limit, 0);
    const met = total >= 1;
    steps.push({ kind: "sum", hazard, target, rows: rows.map(r => ({ ...r, part: r.c / r.limit })), total, met });
    if (met) { cat = target; break; }
  }
  return { cat, steps };
}

/* ── 농도 한계(가산 없음): 과민성·CMR ── */
function mgLimitClass(comps, key, table, R) {
  const rows = [];
  let cat = null;
  comps.forEach(x => {
    mgCats(x, key).forEach(ccat => {
      const gcl = table[ccat];
      if (gcl == null) return;
      const scl = mgScl(x, key, [ccat]);
      const limit = scl ?? gcl;
      const c = Number(x.c) || 0;
      const met = c >= limit;
      const elicit = key.endsWith("_sens") && !met && c >= limit * R.sens.elicitation_fraction;
      rows.push({ name: x.name, c, cat: ccat, limit, scl: scl != null, met, elicit });
      if (met) {
        const mixCat = key.endsWith("_sens") ? "1" : ccat;
        if (cat == null || MG_SUBCAT_ORDER.indexOf(mixCat) < MG_SUBCAT_ORDER.indexOf(cat)) cat = mixCat;
      }
    });
  });
  return rows.length ? { cat, steps: [{ kind: "limit", hazard: key, rows, cat }] } : { cat: null, steps: [] };
}

/* ── 특정표적장기 독성(표 3.8.3·3.9.4, 1회 노출 구분 3 은 20 % 합산) ── */
function mgStot(comps, key, R) {
  const T = R.stot;
  const rows = [];
  let cat = null;
  const better = c => { if (cat == null || c < cat) cat = c; };
  comps.forEach(x => {
    const c = Number(x.c) || 0;
    if (mgHas(x, key, ["1"])) {
      const l1 = mgScl(x, key, ["1"]) ?? T.cat1_to_1;
      const l2 = mgScl(x, key, ["2"]) ?? T.cat1_to_2;
      const got = c >= l1 ? "1" : (c >= l2 ? "2" : null);
      rows.push({ name: x.name, c, cat: "1", limits: [l1, l2], scl: mgScl(x, key, ["1", "2"]) != null, got });
      if (got) better(got);
    } else if (mgHas(x, key, ["2"])) {
      const l2 = mgScl(x, key, ["2"]) ?? T.cat2_to_2;
      const got = c >= l2 ? "2" : null;
      rows.push({ name: x.name, c, cat: "2", limits: [l2], scl: mgScl(x, key, ["2"]) != null, got });
      if (got) better(got);
    }
  });
  const steps = rows.length ? [{ kind: "stot", hazard: key, rows, cat }] : [];
  const extra = [];
  if (key === "stot_se") {
    ["3R", "3N"].forEach(sub => {
      const r = comps.filter(x => mgHas(x, key, [sub])).map(x => {
        const scl = mgScl(x, key, [sub]);
        return { name: x.name, c: Number(x.c) || 0, limit: scl ?? T.cat3_sum, scl: scl != null };
      });
      if (!r.length) return;
      const res = mgSumSteps(`stot_se_${sub}`, [[sub, r]]);
      steps.push(...res.steps);
      if (res.cat) extra.push(sub);
    });
  }
  return { cat, extra, steps };
}

/* ── 흡인 유해성 ── */
function mgAspiration(comps, R, viscosityHigh) {
  const rows = comps.filter(x => mgHas(x, "asp", ["1"])).map(x => ({ name: x.name, c: Number(x.c) || 0 }));
  if (!rows.length) return { cat: null, steps: [] };
  const total = rows.reduce((s, r) => s + r.c, 0);
  const met = total >= R.asp.cat1_sum && !viscosityHigh;
  return { cat: met ? "1" : null, steps: [{ kind: "asp", rows, total, limit: R.asp.cat1_sum, viscosityHigh: Boolean(viscosityHigh), met }] };
}

/* ── 수생환경 유해성(합산법, M 계수) ── */
function mgAquatic(comps, R) {
  const Q = R.aquatic;
  const acuteRows = [], chronicRows = [];
  let mDefaulted = false;
  comps.forEach(x => {
    const c = Number(x.c) || 0;
    if (mgHas(x, "aq_acute", ["1"])) {
      const m = Number(x.m?.acute) || 1;
      if (!x.m?.acute) mDefaulted = true;
      if (c >= Q.relevant_min_cat1 / m) acuteRows.push({ name: x.name, c, m, part: c * m });
    }
    const cc = mgCats(x, "aq_chronic").filter(k => /^[1-4]$/.test(k)).sort()[0];
    if (cc) {
      const m = cc === "1" ? (Number(x.m?.chronic) || 1) : 1;
      if (cc === "1" && !x.m?.chronic) mDefaulted = true;
      const min = cc === "1" ? Q.relevant_min_cat1 / m : Q.relevant_min_other;
      if (c >= min) chronicRows.push({ name: x.name, c, m, cat: cc });
    }
  });
  const steps = [];
  let acute = null, chronic = null;
  if (acuteRows.length) {
    const total = acuteRows.reduce((s, r) => s + r.part, 0);
    acute = total >= Q.trigger ? "1" : null;
    steps.push({ kind: "aq_acute", rows: acuteRows, total, trigger: Q.trigger, met: Boolean(acute) });
  }
  if (chronicRows.length) {
    const S = [1, 2, 3, 4].map(k => chronicRows.filter(r => r.cat === String(k)).reduce((s, r) => s + r.c * (k === 1 ? r.m : 1), 0));
    const tests = [
      { cat: "1", value: S[0] },
      { cat: "2", value: 10 * S[0] + S[1] },
      { cat: "3", value: 100 * S[0] + 10 * S[1] + S[2] },
      { cat: "4", value: chronicRows.reduce((s, r) => s + r.c, 0) },
    ];
    const hit = tests.find(t => t.value >= Q.trigger);
    chronic = hit ? hit.cat : null;
    steps.push({ kind: "aq_chronic", rows: chronicRows, sums: S, tests: tests.slice(0, hit ? tests.indexOf(hit) + 1 : 4), trigger: Q.trigger, cat: chronic });
  }
  return { acute, chronic, steps, mDefaulted };
}

/* ── 전체 ── */
function mgClassify(components, opts = {}, R = SAFETY_RULES.mixture) {
  const comps = (components || []).filter(x => Number(x.c) > 0);
  const classes = [], steps = [], notes = [];
  const add = (key, cat) => { if (cat && !classes.some(k => k.key === key && k.cat === cat)) classes.push({ key, cat }); };
  const total = comps.reduce((s, x) => s + Number(x.c), 0);
  if (total > 100 + R.total_tolerance) notes.push({ k: "over100", total });

  Object.keys(R.acute.routes).forEach(route => {
    const st = mgAcuteRoute(comps, route, R);
    if (!st) return;
    steps.push(st);
    add(st.hazard, st.cat);
    if (st.unstated) notes.push({ k: "inhUnstated" });
    if (st.corrected && st.cat) notes.push({ k: "unknownAcute", pct: st.unknown });
  });

  const skin = mgSkin(comps, R);
  steps.push(...skin.steps);
  add("skin", skin.cat);
  const eye = mgEye(comps, R);
  steps.push(...eye.steps);
  if (skin.cat === "1" && eye.cat !== "1") steps.push({ kind: "implied", hazard: "eye", from: "skin" });
  add("eye", skin.cat === "1" ? "1" : eye.cat);
  if (comps.some(x => mgHas(x, "skin", MG_SKIN1))) notes.push({ k: "extremePh" });

  [["resp_sens", R.sens.resp_sens], ["skin_sens", R.sens.skin_sens], ["muta", R.cmr.muta], ["carc", R.cmr.carc], ["repr", R.cmr.repr], ["lact", R.cmr.lact]]
    .forEach(([key, table]) => {
      const res = mgLimitClass(comps, key, table, R);
      steps.push(...res.steps);
      add(key, res.cat);
      res.steps.forEach(s => s.rows.filter(r => r.elicit).forEach(r => notes.push({ k: "euh208", name: r.name })));
    });

  const se = mgStot(comps, "stot_se", R);
  steps.push(...se.steps);
  add("stot_se", se.cat);
  se.extra.forEach(sub => add("stot_se", sub));
  const re = mgStot(comps, "stot_re", R);
  steps.push(...re.steps);
  add("stot_re", re.cat);

  const asp = mgAspiration(comps, R, opts.viscosityHigh);
  steps.push(...asp.steps);
  add("asp", asp.cat);
  if (asp.cat) notes.push({ k: "viscosity" });

  const aq = mgAquatic(comps, R);
  steps.push(...aq.steps);
  add("aq_acute", aq.acute);
  add("aq_chronic", aq.chronic);
  if (aq.mDefaulted) notes.push({ k: "mDefault" });

  if (comps.some(x => (x.hazards || []).some(h => ghpEntryParts(h).key in { flam_liq: 1, flam_gas: 1, flam_sol: 1, ox_liq: 1, ox_sol: 1, ox_gas: 1, expl: 1, org_perox: 1, self_react: 1, pyr_liq: 1, pyr_sol: 1, water_react: 1 }))) {
    notes.push({ k: "physical" });
  }
  return { classes, steps, notes: notes.filter((n, i) => notes.findIndex(m => JSON.stringify(m) === JSON.stringify(n)) === i) };
}

/* ── 표지 요소(그림문자·신호어·H 문구) ── */
// classes → { pictograms: ["GHS05", …], signal: "danger"|"warning"|null, h: ["H314", …] }. CLP 제26조(그림문자 우선순위)·제27조(H 문구).
function mgLabel(classes, G = SAFETY_RULES.ghs, R = SAFETY_RULES.mixture) {
  const picts = new Set(), h = [], reasons07 = new Set();
  let signal = null;
  (classes || []).forEach(({ key, cat }) => {
    const def = G.hazards[key]?.cats?.[cat];
    if (!def) return;
    const [hCode, pict, sig] = def;
    if (hCode && !h.includes(hCode)) h.push(hCode);
    if (pict) picts.add(pict);
    if (pict === "GHS07") {
      if (key.startsWith("acute_")) reasons07.add("acute4");
      else if (key === "skin" || key === "eye") reasons07.add("irritant");
      else if (key === "skin_sens") reasons07.add("skin_sens");
      else reasons07.add("other");
    }
    if (sig === "danger") signal = "danger";
    else if (sig === "warning" && signal !== "danger") signal = "warning";
  });
  const resp = (classes || []).some(k => k.key === "resp_sens");
  const present = p => (p === "GHS08_resp" ? resp : picts.has(p));
  const drop = R.label.drop_ghs07_if;
  if (picts.has("GHS07") && [...reasons07].every(r => r !== "other" && (drop[r] || []).some(present))) picts.delete("GHS07");
  const hOut = h.filter(code => !(R.label.drop_h_if[code] || []).some(x => h.includes(x)));
  const order = Object.keys(G.pictograms);
  return { pictograms: [...picts].sort((a, b) => order.indexOf(a) - order.indexOf(b)), signal, h: hOut };
}

Object.assign(window, {
  mgCats, mgHas, mgScl, mgAcuteCategory, mgComponentAte, mgAcuteRoute, mgSkin, mgEye, mgSumSteps, mgLimitClass, mgStot,
  mgAspiration, mgAquatic, mgClassify, mgLabel,
});
