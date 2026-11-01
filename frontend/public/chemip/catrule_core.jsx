// 물질 상세 "분류로 걸리는 규제"(참고용) · 판정 순수 함수 — React·문구 없음(이유는 key + 값, 문구는 CATRULE_LABELS).
// 자료: CATRULE_DATA(catrule_data.jsx) + 적용 법규 판정기 자료 APL_PSM(별표 13 인화성 가스·액체, 지명 물질)·APL_HAZMAT.
//   catHazards(list)          ["flam_gas:1", "acute_inh:3*", …] → 별표(*) 뗀 집합
//   catState(input)           "gas" | "liquid" | "solid" | null — 분류(인화성 가스·고압가스 / 인화성 액체) 먼저, 없으면 끓는점·녹는점(20 ℃)
//   catEvaluate(input)        → [{ jur, key, status, ref, basis[], notes[], src }]
//     input = { cas, flash, bp, mp, lfl, ufl, kosha: [유해성], clp: [유해성] | null, lists: [목록 코드], s15: [MSDS 15항 글] }
//     status: applies(분류·성질로 해당) · check(자료가 모자라거나 출처끼리 다름) · named(이름 목록이 정함) · msds(MSDS 15항 기준)
// 결과는 사전 검토용이며 판정이 아니다(취급량·공정 조건·예외는 원문 확인). 시험: frontend/scripts/tests/test_catrules.cjs

const CATRULE_GAS_HZ = ["flam_gas", "press_gas", "ox_gas"];
const CATRULE_ROOM_C = 20; // GHS 의 기체·액체 구분 온도(20 ℃, 101.3 kPa)

function catHazards(list) {
  return new Set((list || []).map(h => String(h || "").replace(/\*+$/, "")).filter(Boolean));
}

function catHasAny(set, keys) {
  return keys.some(k => set.has(k));
}

function catState(input) {
  const hz = new Set([...catHazards(input.kosha), ...catHazards(input.clp)]);
  const cls = [...hz].map(h => h.split(":")[0]);
  if (cls.some(c => CATRULE_GAS_HZ.includes(c))) return "gas";
  if (cls.includes("flam_liq")) return "liquid";
  if (Number.isFinite(input.bp)) {
    if (input.bp < CATRULE_ROOM_C) return "gas";
    if (Number.isFinite(input.mp) && input.mp > CATRULE_ROOM_C) return "solid";
    return "liquid";
  }
  return null;
}

// 폭발 한계 두 값이 뒤바뀐 MSDS(하한 > 상한)는 판단에 쓰지 않는다
function catLimits(input) {
  const ok = Number.isFinite(input.lfl) && (!Number.isFinite(input.ufl) || input.ufl > input.lfl);
  return ok ? { lfl: input.lfl, ufl: Number.isFinite(input.ufl) ? input.ufl : null } : { lfl: null, ufl: null, swapped: Number.isFinite(input.lfl) && Number.isFinite(input.ufl) };
}

// 한국 PSM: 별표 13 지명 물질이면 그 줄, 아니면 제1·2호(인화성 가스·액체) — aplPsmRowFor·aplPsmFlamAuto 그대로
function catKrPsm(input, state) {
  const named = input.cas ? aplPsmRowFor(input.cas, state === "liquid" ? "liquid" : "gas") : null;
  if (named) return { jur: "KR", key: "kr_psm_named", status: "named", ref: named, basis: [], notes: [], src: "kr_psm" };
  if (state !== "gas" && state !== "liquid") return null;
  const lim = catLimits(input);
  const auto = aplPsmFlamAuto({ state }, { lfl: lim.lfl, ufl: lim.ufl, flash: Number.isFinite(input.flash) ? input.flash : null });
  const hz = new Set([...catHazards(input.kosha), ...catHazards(input.clp)]);
  const notes = lim.swapped ? ["limitsSwapped"] : [];
  const flam = state === "gas" ? "gas" : "liquid";
  const ref = APL_PSM.flam[flam];
  if (flam === "gas" && (CATRULE_DATA.krCityGasCas || []).includes(input.cas)) notes.push("cityGas");
  if (auto.flam) return { jur: "KR", key: `kr_psm_${flam}`, status: "applies", ref, basis: [{ k: "psmBasis", v: auto.basis }], notes, src: "kr_psm" };
  const hzKey = flam === "gas" ? "flam_gas" : "flam_liq";
  const byHz = [...hz].filter(h => h.startsWith(`${hzKey}:`));
  if (auto.basis || !byHz.length) return null; // 성질 값으로 아니라고 나왔거나, 분류에도 없다
  return { jur: "KR", key: `kr_psm_${flam}`, status: "check", ref, basis: [{ k: "hazard", v: { list: byHz } }], notes: ["noProperty", ...notes], src: "kr_psm" };
}

// 산안규칙 별표 9: 이름 목록(KR_OSH_DANGEROUS_SUBSTANCES)에 없을 때만 분류·성질로
function catKrB9(input, state, psm) {
  if ((input.lists || []).includes(CATRULE_DATA.namedLists.kr_b9)) return null;
  const f = input.flash, bp = input.bp;
  const row = CATRULE_DATA.kr_b9.find(r => {
    if (r.state !== state) return false;
    if (r.psmGas) return Boolean(psm && psm.key === "kr_psm_gas");
    if (!Number.isFinite(f)) return false;
    if (r.flashLt != null && !(f < r.flashLt)) return false;
    if (r.flashGe != null && !(f >= r.flashGe)) return false;
    if (r.flashLe != null && !(f <= r.flashLe)) return false;
    if (r.bpLe != null) return Number.isFinite(bp) && bp <= r.bpLe;
    if (r.bpGt != null) return Number.isFinite(bp) && bp > r.bpGt;
    return true;
  });
  if (!row) return null;
  const basis = row.psmGas ? (psm.basis || []) : [{ k: "flashBp", v: { flash: f, bp: Number.isFinite(bp) ? bp : null } }];
  return { jur: "KR", key: row.k, status: row.psmGas ? psm.status : "applies", ref: row, basis, notes: ["dailyMax"], src: "kr_b9" };
}

// 위험물안전관리법: MSDS 15항 글 → 품명·지정수량(aplHazmatGuess)
function catKrHazmat(input) {
  const guess = aplHazmatGuess(input.s15 || []);
  const item = guess && guess.key ? aplHazmatItemByKey(guess.key) : null;
  if (!item) return null;
  return { jur: "KR", key: "kr_hazmat", status: "msds", ref: item, basis: [{ k: "s15", v: { text: guess.text } }], notes: guess.flags.map(f => `hz_${f}`), src: "kr_hazmat" };
}

// 미국 OSHA PSM (a)(1)(ii): 인화성 가스 구분 1 또는 인화점 37.8 ℃ 미만 액체
function catUsPsm(input, state) {
  const R = CATRULE_DATA.us_psm;
  const notes = (input.lists || []).includes(CATRULE_DATA.namedLists.us_psm) ? ["alsoAppendixA"] : [];
  if (state === "gas") {
    const k = catHazards(input.kosha), c = catHazards(input.clp);
    const hitK = catHasAny(k, R.gasHazards), hitC = catHasAny(c, R.gasHazards);
    if (!hitK && !hitC) return null;
    const basis = [];
    if (hitK) basis.push({ k: "hazardSrc", v: { src: "kosha", list: R.gasHazards.filter(h => k.has(h)) } });
    if (hitC) basis.push({ k: "hazardSrc", v: { src: "clp", list: R.gasHazards.filter(h => c.has(h)) } });
    const flamIn = set => [...set].some(h => h.startsWith("flam_gas:"));
    const disagree = flamIn(k) && flamIn(c) && hitK !== hitC; // 두 출처 모두 인화성 가스로 분류했는데 구분이 다를 때만
    return { jur: "US", key: "us_psm_flam", status: disagree ? "check" : "applies", ref: R, basis, notes: disagree ? ["sourcesDiffer", ...notes] : notes, src: "us_psm" };
  }
  if (state === "liquid" && Number.isFinite(input.flash) && input.flash < R.flashLtC) {
    return { jur: "US", key: "us_psm_flam", status: "applies", ref: R, basis: [{ k: "flash", v: { flash: input.flash, limit: R.flashLtC } }], notes: ["atmTank", ...notes], src: "us_psm" };
  }
  return null;
}

// EU Seveso III 부록 I 1부: EU 조화 분류(CLP 부록 VI) 우선, 없으면 KOSHA 분류로 참고. 2부 이름이 있으면 그쪽.
function catSeveso(input, state) {
  if ((input.lists || []).includes(CATRULE_DATA.namedLists.seveso)) {
    return [{ jur: "EU", key: "seveso_named", status: "named", ref: null, basis: [], notes: [], src: "seveso" }];
  }
  const fromClp = Array.isArray(input.clp) && input.clp.length > 0;
  const hz = catHazards(fromClp ? input.clp : input.kosha);
  return CATRULE_DATA.seveso.filter(r => catHasAny(hz, r.hz)).map(r => {
    const notes = fromClp ? [] : ["noClp"];
    if (r.liquefied && state === "gas") notes.push("liquefied");
    if (r.p5ab) notes.push("p5ab");
    return { jur: "EU", key: `seveso_${r.code}`, status: fromClp ? "applies" : "check", ref: r,
      basis: [{ k: "hazardSrc", v: { src: fromClp ? "clp" : "kosha", list: r.hz.filter(h => hz.has(h)) } }], notes, src: "seveso" };
  });
}

function catEvaluate(input) {
  const inp = input || {};
  const state = catState(inp);
  const out = [];
  const psm = catKrPsm(inp, state);
  if (psm) out.push(psm);
  const b9 = catKrB9(inp, state, psm);
  if (b9) out.push(b9);
  const hzm = catKrHazmat(inp);
  if (hzm) out.push(hzm);
  const us = catUsPsm(inp, state);
  if (us) out.push(us);
  out.push(...catSeveso(inp, state));
  return out;
}

Object.assign(window, { CATRULE_ROOM_C, catHazards, catState, catLimits, catKrPsm, catKrB9, catKrHazmat, catUsPsm, catSeveso, catEvaluate });
