// 적용 법규 판정기 · 위험물안전관리법 지정수량 배수 판정 — 순수 함수, 문구 없음. 자료·근거: APL_HAZMAT(apl_hazmat_data.jsx).
//   aplHazmatGuess(texts)        MSDS 15항 글(예: "4류 제1석유류(비수용성) (200L)") → { key, flags } | null
//   aplHazmatItem(row, info)     행 → 품명·양(품명 단위)·배수·상태
//   aplHazmat(rows, infos)       시설(제조소등)별 배수 합(법 제5조제5항) → 허가·안전관리자 자격·예방규정·정기점검·정기검사, 사업소 자체소방대
// 같은 "시설" 값의 행은 한 장소(한 제조소등)로 본다 — 실제로 장소가 나뉘면 판정이 달라진다(화면 안내).

function aplHazmatItemByKey(k) {
  return APL_HAZMAT.items.find(i => i.k === k) || null;
}

function aplHazmatGuessOne(text) {
  const t = String(text || "").replace(/^s15:/, "");
  const m = t.match(APL_HAZMAT.text.classRe);
  const cls = m ? Number(m[1]) : (APL_HAZMAT.text.class4Re.test(t) ? 4 : null);   // "제3석유류 …"처럼 유 번호 없이 적은 글
  if (!cls) return null;
  const flags = [];
  const pool = APL_HAZMAT.items.filter(i => i.cls === cls && i.match);
  let item = pool.find(i => i.match.test(t) && (i.soluble === undefined || i.soluble === APL_HAZMAT.text.solubleRe.test(t)));
  if (item && item.soluble !== undefined && !APL_HAZMAT.text.waterRe.test(t)) flags.push("solubleUnknown");
  if (!item) item = APL_HAZMAT.items.find(i => i.cls === cls && i.k.endsWith("_other")) || null;
  if (!item) return { key: null, cls, flags: ["itemUnknown"], text: t };
  if (item.k.endsWith("_other") && item.multi) flags.push("multiQty");
  if (item.typed) flags.push("type5");
  return { key: item.k, cls, flags, text: t };
}

function aplHazmatGuess(texts) {
  for (const t of texts || []) {
    const g = aplHazmatGuessOne(t);
    if (g) return g;
  }
  return null;
}

function aplHazmatItem(row, info) {
  const i = info || {};
  const guess = row.hazmat === "auto" ? aplHazmatGuess(i.s15) : null;
  const key = row.hazmat === "auto" ? (guess && guess.key) : (row.hazmat === "none" ? null : row.hazmat);
  const item = key ? aplHazmatItemByKey(key) : null;
  const out = { id: row.id, use: row.use, key, item, guess, amount: null, mult: 0, status: "none", reasons: [] };
  if (!item) {
    if (guess && guess.flags.includes("itemUnknown")) { out.status = "check"; out.reasons.push({ k: "hzItemUnknown", v: { text: guess.text } }); }
    else out.reasons.push({ k: row.hazmat === "none" ? "hzUserNone" : "hzNotFound" });
    return out;
  }
  if (guess) out.reasons.push({ k: "hzFromMsds", v: { text: guess.text } });
  const conc = aplConc(row);
  if (item.minConc && conc < item.minConc) {
    out.status = "belowConc";
    out.reasons.push({ k: "hzBelowConc", v: { conc, need: item.minConc } });
    return out;
  }
  const amt = aplAmount(row, info);
  const amount = item.unit === "L" ? amt.L : amt.kg;
  if (amount == null) {
    out.status = "check";
    out.reasons.push({ k: amt.missing.includes("qty") ? "qtyMissing" : "densityMissing" });
    return out;
  }
  out.amount = amount;
  out.mult = amount / item.qty;
  out.status = "counted";
  const flags = [...((guess && guess.flags) || [])];
  if (item.check) flags.push(item.check);
  if (item.multi && !flags.includes("multiQty")) flags.push("multiQty");
  if (item.typed && !flags.includes("type5")) flags.push("type5");
  for (const f of flags) out.reasons.push({ k: `hzFlag_${f}` });
  if (flags.includes("sg149")) out.status = "conditional";   // 질산은 비중 1.49 이상만 위험물 — 합계에서 빼고 따로 보인다
  else if (flags.length) out.status = "flagged";                // 보수적 값(비수용성·제1종·가장 작은 수량)으로 셈, 확인 필요
  return out;
}

function aplHazmatManagerLow(fac, f) {
  const rules = APL_HAZMAT.managerLow[fac] || [];
  return rules.some(r => (!r.only4 || f.only4) && (!r.kinds || f.keys.every(k => r.kinds.includes(k))) && (r.max == null || f.mult <= r.max));
}

function aplHazmatFacility(fac, its) {
  const counted = its.filter(i => i.status === "counted" || i.status === "flagged");
  const mult = counted.reduce((s, i) => s + i.mult, 0);
  const keys = [...new Set(counted.map(i => i.key))];
  const only4 = counted.length > 0 && counted.every(i => i.item.cls === 4);
  const mult4 = counted.filter(i => i.item.cls === 4).reduce((s, i) => s + i.mult, 0);
  const f = { fac, kind: APL_HAZMAT.facilities[fac].kind, mult, mult4, keys, only4, ids: its.map(i => i.id) };
  f.permit = mult >= 1;
  f.managerLow = f.permit ? aplHazmatManagerLow(fac, f) : null;
  const pv = APL_HAZMAT.prevention[fac];
  f.prevention = f.permit && pv != null && mult >= pv;
  // 일반취급소 단서: 제4류(특수인화물 제외)만 50배 이하·제1석유류·알코올류 10배 이하이고 보일러·버너 소비 또는 옮겨 담기면 제외
  if (f.prevention && fac === "general") {
    const p1al = counted.filter(i => ["c4_p1", "c4_p1s", "c4_alcohol"].includes(i.key)).reduce((s, i) => s + i.mult, 0);
    if (only4 && !keys.includes("c4_special") && mult <= 50 && p1al <= 10) f.preventionMaybe = true;
  }
  f.audit = f.prevention && mult >= APL_HAZMAT.preventionAudit;
  f.inspection = f.permit && (f.prevention || APL_HAZMAT.inspectionAlways.includes(fac));
  if (fac === "tank_out") {
    const liquidL = counted.filter(i => i.item.unit === "L" || i.item.cls === 6).reduce((s, i) => s + (i.item.unit === "L" ? i.amount : 0), 0);
    f.liquidL = liquidL;
    f.regularMaybe = liquidL >= APL_HAZMAT.regularTankL;
  }
  return f;
}

function aplHazmatBrigade(facs) {
  const proc = facs.filter(f => f.fac === "mfg" || f.fac === "general").reduce((s, f) => s + f.mult4, 0);
  const tank = facs.filter(f => f.fac === "tank_out").reduce((s, f) => s + f.mult4, 0);
  const tierProc = APL_HAZMAT.brigade.find(b => proc >= b.min && proc < b.max) || null;
  const tierTank = tank >= APL_HAZMAT.brigadeTank.min ? APL_HAZMAT.brigadeTank : null;
  const pick = [tierProc, tierTank].filter(Boolean).sort((a, b) => b.trucks - a.trucks)[0] || null;
  return { proc, tank, required: Boolean(pick), trucks: pick ? pick.trucks : 0, crew: pick ? pick.crew : 0 };
}

function aplHazmat(rows, infos) {
  const items = rows.filter(r => r.cas || r.name || r.hazmat !== "auto").map(r => aplHazmatItem(r, infos[r.id]));
  const byFac = new Map();
  for (const it of items) {
    if (!APL_HAZMAT.facilities[it.use]) continue;
    byFac.set(it.use, [...(byFac.get(it.use) || []), it]);
  }
  const facilities = [...byFac.entries()].map(([fac, its]) => aplHazmatFacility(fac, its)).filter(f => f.ids.length);
  const brigade = aplHazmatBrigade(facilities);
  const anyPermit = facilities.some(f => f.permit);
  const anyCheck = items.some(i => ["check", "conditional", "flagged"].includes(i.status)) || facilities.some(f => f.preventionMaybe || f.regularMaybe);
  const total = facilities.reduce((s, f) => s + f.mult, 0);
  let verdict = anyPermit ? "applies" : "not";
  if (!anyPermit && anyCheck) verdict = "check";
  const cites = ["hz_act5", "hz_dec_b1", "hz_act6", "hz_act4", "hz_act15", "hz_dec15", "hz_dec16", "hz_dec17", "hz_dec18"];
  return { verdict, items, facilities, brigade, total, anyCheck, cites };
}

Object.assign(window, { aplHazmatItemByKey, aplHazmatGuessOne, aplHazmatGuess, aplHazmatItem, aplHazmatFacility, aplHazmatBrigade, aplHazmat });
