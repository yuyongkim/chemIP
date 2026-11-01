// 온도별 물성 · 표시용 순수 함수(React 없음): 파일(v1/tp/<CAS>.json) + 단위 모드 → 그래프 속성·고른 온도 표·상수 표.
// 계산은 tp_forms.jsx(tpEval·tpNasa9), 물성 묶음·단위는 tp_props.jsx, 문구는 TP_LABELS 를 인자로 받는다(L).

function tpMw(file) {
  const v = tpConst(file, "MW");
  return v > 0 ? v : null;
}

// 기준 단위 값 → 표시 값. 질량 기준인데 분자량이 없으면 null
function tpConvert(q, v, mode, mw) {
  const u = TP_UNITS[q] && TP_UNITS[q][mode];
  if (!u || v == null || !Number.isFinite(v)) return null;
  if (u.mass && !(mw > 0)) return null;
  const x = v * u.f;
  return u.mass === "mul" ? x * mw : u.mass === "div" ? x / mw : x;
}

function tpUnitKey(q, mode) {
  return (TP_UNITS[q] && TP_UNITS[q][mode] && TP_UNITS[q][mode].u) || "none";
}

function tpTempShow(TK, mode) {
  const u = TP_UNITS.temperature[mode];
  return TK + u.off;
}

function tpTempFromShow(x, mode) {
  return x - TP_UNITS.temperature[mode].off;
}

// 입력 글자(표시 온도 단위) → K 또는 null
function tpParseT(raw, mode) {
  const s = String(raw == null ? "" : raw).trim();
  if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(s)) return null;
  const TK = tpTempFromShow(Number(s), mode);
  return TK > 0 ? TK : null;
}

// 묶음 → 그 묶음의 상관식들(curves 가 없으면 alt)
function tpPropCurves(file, prop) {
  const pick = keys => keys.flatMap(k => tpCurves(file, k));
  const main = pick(prop.curves);
  return main.length ? main : pick(prop.alt || []);
}

function tpAvailableProps(file) {
  return TP_PROPS.filter(p => tpPropCurves(file, p).length > 0);
}

function tpFmt(v, digits = 4) {
  if (v == null || !Number.isFinite(v)) return "";
  return calcFormatNumber(v, digits);   // calc_engine.jsx: a × 10ⁿ outside 1e-3…1e6, thousands separators inside
}

function tpSourceShort(src, L) {
  return (L.sources && L.sources[src]) || src;
}

// 상관식 하나의 이름(같은 묶음에 여럿이면 출처를 붙인다)
function tpCurveLabel(rec, L, withSource) {
  const name = L.curves[rec.p] || rec.p;
  return withSource ? `${name} · ${tpSourceShort(rec.src, L)}` : name;
}

// 그래프 속성(CalcChart). T 는 고른 온도[K](null 이면 표시 없음)
function tpChartProps(file, prop, mode, T, L) {
  const mw = tpMw(file);
  const curves = tpPropCurves(file, prop);
  const multiSrc = new Set(curves.map(c => c.src)).size > 1;
  const tU = L.units[tpUnitKey("temperature", mode)];
  const series = curves.map((rec, i) => ({
    key: `${rec.p}-${rec.src}-${i}`,
    label: tpCurveLabel(rec, L, multiSrc),
    dashed: rec.src !== curves[0].src,
    points: tpSample(rec, TP_CHART_POINTS)
      .map(([tk, v]) => [tpTempShow(tk, mode), tpConvert(prop.q, v, mode, mw)])
      .filter(([, y]) => y != null && Number.isFinite(y) && (!prop.log || y > 0)),
  })).filter(s => s.points.length > 1);
  if (!series.length) return null;
  const markers = [];
  if (T != null) {
    curves.forEach(rec => {
      const y = tpConvert(prop.q, tpEval(rec, T), mode, mw);
      if (y != null && (!prop.log || y > 0)) markers.push({ x: tpTempShow(T, mode), y, label: markers.length ? "" : L.point });
    });
  }
  const tb = tpConst(file, "Tb");
  const xs = series.flatMap(s => s.points.map(p => p[0]));
  const inX = x => x >= Math.min(...xs) && x <= Math.max(...xs);
  const vlines = tb && inX(tpTempShow(tb, mode)) ? [{ x: tpTempShow(tb, mode), label: L.tb }] : [];
  const hlines = prop.k === "psat" ? [{ y: tpConvert("pressure", 101325, mode, mw), label: L.atm }] : [];
  return {
    x: { label: L.tLabel, unit: tU },
    y: { label: L.props[prop.k], unit: L.units[tpUnitKey(prop.q, mode)], log: Boolean(prop.log) },
    series, markers, vlines, hlines,
    ariaLabel: L.chartAria(L.props[prop.k], file.name),
  };
}

function tpRangeText(rec, mode, L) {
  return `${tpFmt(tpTempShow(rec.Tmin, mode), 4)}–${tpFmt(tpTempShow(rec.Tmax, mode), 4)} ${L.units[tpUnitKey("temperature", mode)]}`;
}

// 고른 온도의 값 표 줄: 모든 묶음의 상관식 + NASA 이상기체 H°·S°
function tpPointRows(file, T, mode, L) {
  const mw = tpMw(file);
  const rows = [];
  tpAvailableProps(file).forEach(prop => {
    tpPropCurves(file, prop).forEach((rec, i) => {
      const v = T == null ? null : tpConvert(prop.q, tpEval(rec, T), mode, mw);
      rows.push({ key: `${rec.p}-${rec.src}-${i}`, label: L.curves[rec.p] || rec.p, value: v, unit: L.units[tpUnitKey(prop.q, mode)],
        range: tpRangeText(rec, mode, L), src: rec.src });
    });
  });
  tpCurves(file, "cp_ig").filter(rec => rec.form === "nasa9").forEach((rec, i) => {
    const ok = T != null && tpInRange(rec, T);
    const h298 = tpNasa9(rec, 298.15, "h");
    const h = ok ? tpNasa9(rec, T, "h") : null;
    const dh = h != null && h298 != null ? h - h298 : null;
    const s = ok ? tpNasa9(rec, T, "s") : null;
    rows.push({ key: `h-${i}`, label: L.curves.h_ig, value: tpConvert("energy", dh, mode, mw), unit: L.units[tpUnitKey("energy", mode)],
      range: tpRangeText(rec, mode, L), src: rec.src });
    rows.push({ key: `s-${i}`, label: L.curves.s_ig, value: tpConvert("entropy", s, mode, mw), unit: L.units[tpUnitKey("entropy", mode)],
      range: tpRangeText(rec, mode, L), src: rec.src });
  });
  return rows;
}

// 상수 → 표시 묶음 [{ k, label, items: [{ text, src }] }] (한 상수에 출처 여럿이면 모두)
const TP_CONST_ORDER = ["Tc", "Pc", "Vc", "Zc", "omega", "Tb", "Tm", "Tt", "Pt", "MW", "Hf_ig", "Hf_l", "Gf_ig", "S_ig"];
const TP_CONST_SHOW = {   // 기준 단위 → 표시(단위 key, 배수, 온도면 t: true)
  Tc: { t: true }, Tb: { t: true }, Tm: { t: true }, Tt: { t: true },
  Pc: { u: "kPa", f: 1e-3 }, Pt: { u: "Pa", f: 1 }, Vc: { u: "m3_mol", f: 1e6 }, Zc: { u: "none", f: 1 }, omega: { u: "none", f: 1 },
  MW: { u: null, f: 1, text: "g/mol" }, Hf_ig: { u: "kJ_mol", f: 1e-3 }, Hf_l: { u: "kJ_mol", f: 1e-3 }, Gf_ig: { u: "kJ_mol", f: 1e-3 },
  S_ig: { u: "J_molK", f: 1 },
};

function tpConstRows(file, mode, L) {
  const rows = [];
  TP_CONST_ORDER.forEach(k => {
    const items = ((file && file.const) || []).filter(r => r.k === k);
    if (!items.length) return;
    const show = TP_CONST_SHOW[k];
    const seen = new Set();
    rows.push({
      k, label: L.consts[k] || k,
      items: items.filter(r => { const key = `${r.src}:${r.v}`; if (seen.has(key)) return false; seen.add(key); return true; }).map(r => {
        const v = show.t ? tpTempShow(r.v, mode) : r.v * show.f;
        const unit = show.t ? L.units[tpUnitKey("temperature", mode)] : show.text || L.units[show.u] || "";
        return { text: `${tpFmt(v, 5)}${unit ? ` ${unit}` : ""}`, src: r.src };
      }),
    });
  });
  return rows;
}

// Antoine 계산기 딥링크 값(ChemSep 식 10: ln P[Pa] = A − B/(T[K] + C)) 또는 null
function tpAntoineLink(file) {
  const rec = tpCurves(file, "psat_antoine").find(r => r.form === "eq10");
  if (!rec) return null;
  const [A, B, C = 0] = rec.c;
  return { A, B, C, base: "ln", pu: "Pa", tu: "K" };
}

function tpCurveCount(file) {
  return ((file && file.curves) || []).filter(c => TP_FORMS[c.form]).length;
}

Object.assign(window, {
  tpMw, tpConvert, tpUnitKey, tpTempShow, tpTempFromShow, tpParseT, tpPropCurves, tpAvailableProps, tpFmt, tpSourceShort,
  tpCurveLabel, tpChartProps, tpRangeText, tpPointRows, tpConstRows, tpAntoineLink, tpCurveCount, TP_CONST_ORDER,
});
