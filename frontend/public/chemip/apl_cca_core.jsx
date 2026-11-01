// 적용 법규 판정기 · 화학물질관리법 규정수량(최하위·하위·상위) 판정 — 순수 함수, 문구 없음. 규칙 설명은 apl_cca_data.jsx 머리 주석.
// table = g/hazchem_quantity.json({ accident: {CAS: [entry]}, hazardous: {CAS: [entry]} }, 단위 톤). 없으면(null) 판정은 "check".
//   aplCcaBand(cas, row, table)  → 행에 맞는 규정수량 { source, no, name, conc, lowest, lower, upper, band, multi } | { belowConc } | null
//   aplCca(rows, infos, table)   → { verdict, tier, groups(CAS별 최대보유량·구간), items, flags, cites }

const APL_CCA_LIQUIDISH = ["liquid", "solid"];   // 저확산 구분을 쓰는 성상(별표 2 일반기준 다)

function aplMinQ(vals) {
  const xs = vals.filter(v => v != null);
  return xs.length ? Math.min(...xs) : null;
}

function aplCcaAccidentBand(entry, row) {
  const conc = aplConc(row);
  const bases = entry.bands.filter(b => b.kind === "base");
  const above = bases.find(b => b.concAbove && conc > b.conc);
  const band = above || bases.find(b => !b.concAbove) || bases[0];
  if (conc < band.conc) return { belowConc: true, need: band.conc, conc, source: "annex3", no: entry.no, name: entry.name, name_en: entry.name_en };
  const sol = row.state === "solution" ? entry.bands.find(b => b.kind === "solution") : null;
  const use = sol || band;
  return { source: "annex3", no: entry.no, name: entry.name, name_en: entry.name_en, conc: band.conc, band: sol ? "solution" : (above ? "above" : "base"),
    lowest: use.lowest, lower: use.lower, upper: use.upper };
}

function aplCcaHazardousBand(entry, row) {
  const conc = aplConc(row);
  const normal = entry.bands.filter(b => !b.kinds.includes("lowdisp") && !b.kinds.includes("solution"));
  const minCrit = aplMinQ(normal.map(b => b.conc));
  const low = entry.bands.find(b => b.kinds.includes("lowdisp"));
  const sol = entry.bands.find(b => b.kinds.includes("solution"));
  const head = { source: "annex2", no: entry.no, id: entry.id, name: entry.name, name_en: entry.name_en };
  if (minCrit != null && conc < minCrit) return { ...head, belowConc: true, need: minCrit, conc };
  if (low && APL_CCA_LIQUIDISH.includes(row.state)) return { ...head, conc: minCrit, band: "lowdisp", lowest: low.lowest, lower: low.lower, upper: low.upper };
  if (sol && row.state === "solution") return { ...head, conc: minCrit, band: "solution", lowest: sol.lowest, lower: sol.lower, upper: sol.upper };
  const hit = normal.filter(b => b.conc == null || conc >= b.conc);
  return { ...head, conc: minCrit, band: hit.map(b => b.kinds.join("+")).join(","),
    lowest: aplMinQ(hit.map(b => b.lowest)), lower: aplMinQ(hit.map(b => b.lower)), upper: aplMinQ(hit.map(b => b.upper)) };
}

function aplCcaBand(cas, row, table) {
  if (!table || !cas) return null;
  const acc = table.accident && table.accident[cas];
  if (acc && acc.length) return aplCcaAccidentBand(acc[0], row);   // 별표 3 먼저(별표 2 일반기준 가)
  const haz = table.hazardous && table.hazardous[cas];
  if (!haz || !haz.length) return null;
  const bands = haz.map(e => aplCcaHazardousBand(e, row));
  if (bands.length === 1) return bands[0];
  const live = bands.filter(b => !b.belowConc);
  if (!live.length) return bands[0];
  // 같은 CAS 의 여러 항목(예: 질산 >70 % / ≤70 %, 납 입자 크기) — 어느 항목인지 화면이 모르므로 가장 작은 수량(보수적)을 쓰고 표시
  return { ...live[0], multi: live.map(b => ({ no: b.no, name: b.name, name_en: b.name_en })),
    lowest: aplMinQ(live.map(b => b.lowest)), lower: aplMinQ(live.map(b => b.lower)), upper: aplMinQ(live.map(b => b.upper)) };
}

function aplCcaTier(Q, b) {
  if (b.upper != null && Q >= b.upper) return "upper";
  if (b.lower != null && Q >= b.lower) return "lower";
  if (b.lowest != null && Q >= b.lowest) return "lowest";
  return "below";
}

function aplCcaHasCategory(info, names) {
  const cats = (info && info.ncis) || [];
  return cats.some(c => names.includes(c));
}

function aplCca(rows, infos, table) {
  const items = [];
  const flags = [];
  const groups = new Map();
  for (const row of rows) {
    if (!row.cas && !row.name) continue;
    const info = infos[row.id] || {};
    const amt = aplAmount(row, info);
    const it = { id: row.id, cas: row.cas, band: null, t: null, status: "none", reasons: [] };
    items.push(it);
    if (!row.cas) { it.status = "check"; it.reasons.push({ k: "noCas" }); continue; }
    if (!table) { it.status = "check"; it.reasons.push({ k: "ccaTableOff" }); continue; }
    const b = aplCcaBand(row.cas, row, table);
    it.band = b;
    if (!b) {
      const listed = aplCcaHasCategory(info, APL_CCA.hazardousCategories.filter(c => !APL_CCA.permitCategories.includes(c)));
      it.status = listed ? "check" : "none";
      it.reasons.push({ k: listed ? "ccaListedNoQty" : "ccaNotListed" });
      if (aplCcaHasCategory(info, APL_CCA.permitCategories)) it.reasons.push({ k: "ccaPermitCat", v: { cats: info.ncis.filter(c => APL_CCA.permitCategories.includes(c)) } });
      continue;
    }
    if (b.belowConc) { it.status = "belowConc"; it.reasons.push({ k: "ccaBelowConc", v: { conc: b.conc, need: b.need } }); continue; }
    if (amt.kg == null) { it.status = "check"; it.reasons.push({ k: amt.missing.includes("qty") ? "qtyMissing" : "densityMissing" }); continue; }
    it.t = amt.kg / 1000;   // 혼합물 전체 양(고시 별표 4 비고 2)
    it.status = "counted";
    if (b.multi) it.reasons.push({ k: "ccaMulti", v: { entries: b.multi } });
    const g = groups.get(row.cas) || { cas: row.cas, Q: 0, lowest: null, lower: null, upper: null, bands: [], ids: [] };
    g.Q += it.t;
    g.lowest = aplMinQ([g.lowest, b.lowest]);
    g.lower = aplMinQ([g.lower, b.lower]);
    g.upper = aplMinQ([g.upper, b.upper]);   // 같은 물질 여러 행(성상이 다름)은 가장 작은 수량 — 보수적
    g.bands.push(b);
    g.ids.push(row.id);
    groups.set(row.cas, g);
  }
  const list = [...groups.values()].map(g => ({ ...g, tier: aplCcaTier(g.Q, g) }));
  const tiers = list.map(g => g.tier);
  let tier = "none";
  if (tiers.includes("upper")) tier = "tier1";
  else if (tiers.includes("lower")) tier = "tier2";
  else if (tiers.includes("lowest")) tier = "lowest";
  else if (list.length) tier = "below";
  // 보관시설만 둔 사업장이 모두 최하위 미만이면 R = Σ Q/QLLT(고시 별표 4 제3호다목)
  let Rlowest = null;
  const storeOnly = rows.filter(r => r.cas || r.name).every(r => APL_CCA.storageOnly.includes(r.use));
  if (tier === "below" && storeOnly) {
    Rlowest = list.reduce((s, g) => s + (g.lowest ? g.Q / g.lowest : 0), 0);
    if (Rlowest >= 1) tier = "lowest";
    flags.push({ k: "ccaStoreR", v: { R: Rlowest } });
  }
  if (list.some(g => g.bands.some(b => b.band === "lowdisp")) && list.length > 1) flags.push({ k: "ccaLowdispMix" });
  const anyCheck = items.some(i => i.status === "check");
  let verdict = tier === "tier1" || tier === "tier2" || tier === "lowest" ? "applies" : "not";
  if (verdict === "not" && anyCheck) verdict = "check";
  const cites = ["cca_act23", "cca_notice", "cca_notice_b4", "cca_r19_2", "cca_r19_8", "cca_r_b4n2", "cca_r23_2", "cca_r27"];
  return { verdict, tier, groups: list, items, flags, Rlowest, cites };
}

Object.assign(window, { aplCcaBand, aplCcaTier, aplCca, aplMinQ });
