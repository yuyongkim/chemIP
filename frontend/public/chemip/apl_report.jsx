// 적용 법규 판정기 · 보고서(CSV) 순수 함수 — 판정 결과 + 문구(APL_LABELS) → 표 행 → CSV 글자. 화면 단추는 apl_export.jsx.
//   aplReasonText(reason, L)          { k, v } → 문장
//   aplCsvRows(res, rows, names, L)   [[구분, 항목, 판정, 값, 이유, 근거, 원문], ...]
//   aplCsvString(table)               RFC 4180 따옴표, 첫 줄 BOM(엑셀 한글)

function aplReasonText(r, L) {
  const f = L.reasons[r.k];
  return f ? f(r.v || {}) : r.k;
}

function aplCiteList(keys) {
  return keys.map(aplCite).filter(Boolean);
}

function aplCsvRows(res, rows, names, L) {
  const out = [L.csv.head];
  const V = L.verdicts;
  const cites = (keys) => aplCiteList(keys);
  const joinC = (keys) => cites(keys).map(c => c.name).join(" / ");
  const joinU = (keys) => cites(keys).map(c => c.url).join(" ");
  out.push([L.csv.summary, L.summary.laws.psm, V[res.psm.verdict], L.summary.psmKey(res.psm), res.psm.industry ? L.psm.industry(tr(res.psm.industry.ko, res.psm.industry.en)) : L.psm.applies, joinC(res.psm.cites), joinU(res.psm.cites)]);
  out.push([L.csv.summary, L.summary.laws.cca, V[res.cca.verdict], L.summary.ccaKey(res.cca, L), L.cca.tierText[res.cca.tier] || "", joinC(res.cca.cites), joinU(res.cca.cites)]);
  out.push([L.csv.summary, L.summary.laws.hazmat, V[res.hazmat.verdict], L.summary.hazmatKey(res.hazmat), L.hz.place, joinC(res.hazmat.cites), joinU(res.hazmat.cites)]);
  for (const g of res.psm.groups) {
    const name = g.key.startsWith("flam_") ? tr(g.ref.ko, g.ref.en) : `${g.ref.no}. ${tr(g.ref.ko, g.ref.en)}`;
    out.push([L.psm.title, name, "", `C/T = ${aplFmt(g.ratio, 3)}`, "", APL_CITES.psm_dec43_1 ? tr(APL_CITES.psm_dec43_1.ko, APL_CITES.psm_dec43_1.en) : "", APL_CITES.psm_dec43_1.url]);
  }
  for (const g of res.cca.groups) {
    out.push([L.cca.title, `${g.cas} ${names[g.ids[0]] || ""}`.trim(), L.cca.tierCell[g.tier], `${aplFmt(g.Q)} t (${aplFmt(g.lowest)} / ${aplFmt(g.lower)} / ${g.upper == null ? L.cca.noUpper : aplFmt(g.upper)})`, "", tr(APL_CITES.cca_notice.ko, APL_CITES.cca_notice.en), APL_CITES.cca_notice.url]);
  }
  for (const f of res.hazmat.facilities) {
    const fac = APL_HAZMAT.facilities[f.fac];
    out.push([L.hz.title, tr(fac.ko, fac.en), f.permit ? L.hz.permitYes : L.hz.permitNo, `${aplFmt(f.mult)}×`, f.permit ? (f.managerLow ? L.hz.managerLow : L.hz.managerHigh) : "", tr(APL_CITES.hz_act5.ko, APL_CITES.hz_act5.en), APL_CITES.hz_act5.url]);
  }
  const byId = (list) => Object.fromEntries(list.map(i => [i.id, i]));
  const P = byId(res.psm.items), C = byId(res.cca.items), H = byId(res.hazmat.items);
  rows.filter(r => r.cas || r.name).forEach((r) => {
    const reasons = [...(P[r.id]?.reasons || []), ...(C[r.id]?.reasons || []), ...(H[r.id]?.reasons || [])].map(x => aplReasonText(x, L)).join(" | ");
    out.push([L.csv.inventory, `${r.cas || ""} ${names[r.id] || r.name || ""}`.trim(), "", `${r.qty} ${L.inv.units[r.unit] || r.unit} · ${r.conc || 100}% · ${L.inv.states[r.state]} · ${tr(APL_HAZMAT.facilities[r.use]?.ko, APL_HAZMAT.facilities[r.use]?.en)}`, reasons, "", ""]);
  });
  return out;
}

function aplCsvString(table) {
  const cell = (v) => {
    const s = String(v == null ? "" : v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + table.map(row => row.map(cell).join(",")).join("\r\n") + "\r\n";
}

Object.assign(window, { aplReasonText, aplCiteList, aplCsvRows, aplCsvString });
