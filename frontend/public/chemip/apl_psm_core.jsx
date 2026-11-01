// 적용 법규 판정기 · 산업안전보건법 공정안전보고서(PSM) 규정량 판정 — 순수 함수, React·문구 없음(이유는 key + 값, 문구는 APL_LABELS.reasons).
// 근거: 시행령 제43조·별표 13(APL_PSM, apl_psm_data.jsx). 판정 순서
//   1) 행 → 별표 13 의 줄: CAS 가 같은 줄(무수/수용액 두 줄이면 "성상"으로), 없으면 인화성 가스·액체(제1·2호)인지(MSDS 9항 인화점·폭발 한계)
//   2) C(kg): 일반 물질은 순도 100 % 기준(양 × 농도), 농도가 정해진 줄은 그 농도 이상인 혼합물 전체 양(비고 6 — 해석은 아래 "확인")
//      인화성 가스·액체는 그 성질을 가진 혼합물 전체 양. 제1·2호만 제조·취급과 저장 규정량이 다르다.
//   3) 물질(줄)마다 C/T 가운데 가장 큰 값을 더한 R ≥ 1 → 유해·위험설비(비고 7). 제43조제1항 각 호 업종이면 양과 관계없이 대상.
//   농도가 정해진 줄의 "규정된 농도 기준"을 순도 환산으로 읽으면 R 이 달라질 수 있어, 두 해석의 판정이 다르면 "check" 로 둔다.

const APL_PSM_HANDLE_USES = ["mfg", "general"];   // 제조·취급(공정) — 나머지 시설은 저장

function aplPsmRowFor(cas, state) {
  const hits = APL_PSM.rows.filter(r => r.cas.includes(cas));
  const also = APL_PSM.rows.filter(r => (r.alsoCas || []).includes(cas));
  if (state === "solution") {
    const sol = [...hits, ...also].find(r => r.form === "solution");
    if (sol) return sol;
  }
  return hits.find(r => r.form !== "solution") || hits[0] || null;
}

// 인화성 가스·액체(제1·2호) 자동 판단: { flam: "gas"|"liquid"|null, basis, unknown? }
function aplPsmFlamAuto(row, info, hazKey) {
  const F = APL_PSM.flam;
  const i = info || {};
  if (row.state === "gas") {
    if (i.lfl == null) return { flam: null, unknown: "gas" };
    const range = i.ufl != null ? i.ufl - i.lfl : null;
    return i.lfl <= F.gasLfl || (range != null && range >= F.gasRange)
      ? { flam: "gas", basis: { k: "lfl", lfl: i.lfl, ufl: i.ufl } } : { flam: null, basis: { k: "lfl", lfl: i.lfl, ufl: i.ufl } };
  }
  if (row.state === "liquid" || row.state === "solution") {
    if (i.flash != null) return i.flash <= F.liquidFlash ? { flam: "liquid", basis: { k: "flash", flash: i.flash } } : { flam: null, basis: { k: "flash", flash: i.flash } };
    if (["c4_special", "c4_p1", "c4_p1s", "c4_alcohol"].includes(hazKey)) return { flam: "liquid", basis: { k: "hazmat", key: hazKey } };
    if (["c4_p2", "c4_p2s"].includes(hazKey)) return { flam: null, unknown: "liquid", check: true, basis: { k: "hazmat", key: hazKey } };
    return { flam: null, unknown: "liquid" };
  }
  return { flam: null };
}

// 행 하나 → { key, ref(줄 또는 flam), C, Calt, use, status, reasons }
function aplPsmItem(row, info, hazKey) {
  const amt = aplAmount(row, info);
  const conc = aplConc(row);
  const reasons = [];
  const base = { id: row.id, key: null, ref: null, C: 0, Calt: 0, use: APL_PSM_HANDLE_USES.includes(row.use) ? "handle" : "store", status: "none", reasons };
  let ref = null, flam = null;
  if (row.psmClass === "gas" || row.psmClass === "liquid") flam = row.psmClass;
  else if (row.psmClass !== "none") {
    ref = row.cas ? aplPsmRowFor(row.cas, row.state) : null;
    if (!ref) {
      const auto = aplPsmFlamAuto(row, info, hazKey);
      flam = auto.flam;
      if (auto.basis) reasons.push({ k: "psmFlamBasis", v: { ...auto.basis, flam: auto.flam } });
      if (auto.unknown) reasons.push({ k: auto.check ? "psmFlamCheck" : "psmFlamUnknown", v: { state: auto.unknown } });
      if (auto.check) base.status = "check";
    }
  }
  if (!ref && !flam) {
    if (base.status !== "check") reasons.push({ k: "psmNotListed" });
    return base;
  }
  if (amt.kg == null) {
    reasons.push({ k: amt.missing.includes("qty") ? "qtyMissing" : "densityMissing" });
    return { ...base, key: ref ? `n${ref.no}` : `flam_${flam}`, ref: ref || APL_PSM.flam[flam], status: "check" };
  }
  if (ref) {
    if (ref.conc && conc < ref.conc) {
      reasons.push({ k: "psmBelowConc", v: { no: ref.no, conc, need: ref.conc } });
      return { ...base, key: `n${ref.no}`, ref, status: "belowConc" };
    }
    const C = ref.conc ? amt.kg : amt.kg * conc / 100;
    const Calt = ref.conc ? amt.kg * conc / ref.conc : C;   // 다른 해석: 규정된 농도로 환산
    reasons.push({ k: ref.conc ? "psmConcBasis" : "psmPureBasis", v: { no: ref.no, kg: amt.kg, conc, C } });
    if (ref.check) reasons.push({ k: "psmCondCheck", v: { no: ref.no, check: ref.check } });
    return { ...base, key: `n${ref.no}`, ref, C, Calt, status: ref.check ? "check" : "counted" };
  }
  reasons.push({ k: "psmFlamCount", v: { flam, kg: amt.kg, use: base.use } });
  return { ...base, key: `flam_${flam}`, ref: APL_PSM.flam[flam], C: amt.kg, Calt: amt.kg, status: "counted" };
}

// 줄(물질)별로 모아 C/T 가운데 큰 값
function aplPsmGroups(items) {
  const groups = new Map();
  for (const it of items) {
    if (!it.key || it.status === "belowConc" || !(it.C > 0)) continue;
    const g = groups.get(it.key) || { key: it.key, ref: it.ref, handle: 0, store: 0, handleAlt: 0, storeAlt: 0 };
    g[it.use] += it.C;
    g[`${it.use}Alt`] += it.Calt;
    groups.set(it.key, g);
  }
  return [...groups.values()].map(g => {
    const flamRow = g.key.startsWith("flam_");
    const ratio = (h, s) => (flamRow ? Math.max(h / g.ref.handle, s / g.ref.store) : (h + s) / g.ref.q);
    return { ...g, T: flamRow ? { handle: g.ref.handle, store: g.ref.store } : g.ref.q, ratio: ratio(g.handle, g.store), ratioAlt: ratio(g.handleAlt, g.storeAlt) };
  }).sort((a, b) => b.ratio - a.ratio);
}

// 사업장 전체: rows, infos{id→info}, hazKeys{id→위험물 품명 key}, opts { industry }
function aplPsm(rows, infos, hazKeys = {}, opts = {}) {
  const items = rows.filter(r => r.cas || r.name || r.psmClass !== "auto").map(r => aplPsmItem(r, infos[r.id], hazKeys[r.id]));
  const groups = aplPsmGroups(items);
  const R = groups.reduce((s, g) => s + g.ratio, 0);
  const Ralt = groups.reduce((s, g) => s + g.ratioAlt, 0);
  const industry = APL_PSM.industries.find(i => i.k === opts.industry) || null;
  const anyCheck = items.some(i => i.status === "check");
  let verdict = "not";
  if (industry || R >= 1) verdict = "applies";
  if ((R >= 1) !== (Ralt >= 1) && !industry) verdict = "check";
  else if (verdict === "not" && anyCheck) verdict = "check";
  const cites = ["psm_act44", "psm_dec43_1", "psm_b13_n6", "psm_b13_n7"];
  return { verdict, R, Ralt, items, groups, industry, cites };
}

Object.assign(window, { APL_PSM_HANDLE_USES, aplPsmRowFor, aplPsmFlamAuto, aplPsmItem, aplPsmGroups, aplPsm });
