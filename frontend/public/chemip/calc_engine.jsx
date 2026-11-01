// 공학 계산기 엔진 — 정의(calc_registry.jsx 형식) + 화면 상태 → 검사·단위 환산·계산 결과. React 없음(순수 함수).
// 화면 상태: 수치 칸 { raw: "입력 글자", unit: "고른 단위" }, 선택 칸 "값", 표 칸 [{ <열 key>: "입력 글자" }].
// 문구는 CALC_LABELS.errors.

function calcChoices(def, state) {
  const out = {};
  def.inputs.forEach(i => { if (i.type === "choice") out[i.key] = state[i.key]; });
  return out;
}

function calcVisible(input, choices) {
  return !input.when || input.when(choices);
}

// "" → null(빈칸), 숫자가 아니면 undefined. 쉼표는 받지 않는다(천 단위 구분과 헷갈림).
function calcParseNumber(raw) {
  const s = String(raw == null ? "" : raw).trim();
  if (!s) return null;
  if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(s)) return undefined;
  return Number(s);
}

// 칸 규칙(positive·min·max, 기준 단위) 검사 → 문구 또는 null
function calcRangeError(spec, value, unitLabel) {
  const E = CALC_LABELS.errors;
  const u = unitLabel === "—" ? "" : unitLabel;
  if (spec.positive && !(value > 0)) return E.positive(u);
  if (spec.min != null && value < spec.min) return E.min(spec.min, u);
  if (spec.max != null && value > spec.max) return E.max(spec.max, u);
  return null;
}

// 입력 글자 → 기준 단위 숫자. { value } 또는 { error }
function calcReadField(spec, raw, unit) {
  const E = CALC_LABELS.errors;
  const n = calcParseNumber(raw);
  if (n === null) return spec.optional ? { value: null } : { error: E.required };
  if (n === undefined) return { error: E.notNumber };
  const value = spec.dim ? calcConvert(spec.dim, n, unit, spec.unit) : n;
  const error = calcRangeError(spec, value, calcUnitLabel(spec.dim, spec.unit));
  return error ? { error } : { value };
}

// 표 칸: 빈 행은 건너뛰고, 값이 있는 행만 읽는다.
function calcReadTable(input, rows, errors) {
  const E = CALC_LABELS.errors;
  const out = [];
  rows.forEach((row, ri) => {
    if (input.columns.every(c => !String(row[c.key] ?? "").trim())) return;
    const rec = {};
    input.columns.forEach(c => {
      if (c.text) { rec[c.key] = String(row[c.key] ?? "").trim(); return; }
      const r = calcReadField(c, row[c.key], c.unit);
      if (r.error) errors[`${input.key}.${ri}.${c.key}`] = E.cell(ri + 1, c.label, r.error);
      else rec[c.key] = r.value;
    });
    out.push(rec);
  });
  if (out.length < (input.minRows || 1)) errors[input.key] = E.minRows(input.minRows || 1);
  return out;
}

function calcTextValue(v) {
  return v == null ? "" : String(v);
}

// 정의 + 주소로 받은 값(prefill, show 단위 글자) → 처음 화면 상태
function calcInitialState(def, prefill = {}) {
  const state = {};
  def.inputs.forEach(i => {
    const p = prefill[i.key];
    if (i.type === "choice") state[i.key] = i.options.some(o => o.v === p) ? p : i.default;
    else if (i.type === "table") state[i.key] = i.rows.map(r => Object.fromEntries(i.columns.map(c => [c.key, calcTextValue(r[c.key])])));
    else state[i.key] = { raw: p != null ? String(p) : calcTextValue(i.default), unit: i.show || i.unit };
  });
  return state;
}

// 주소로 받은 값 가운데 실제로 칸에 들어간 것 → [{ label, value, unit }] (안내 줄용)
function calcPrefillApplied(def, prefill) {
  if (!prefill) return [];
  return def.inputs
    .filter(i => i.type !== "table" && prefill[i.key] != null)
    .filter(i => i.type !== "choice" || i.options.some(o => o.v === prefill[i.key]))
    .map(i => ({
      key: i.key,
      label: i.label,
      value: i.type === "choice" ? i.options.find(o => o.v === prefill[i.key]).label : prefill[i.key],
      unit: i.type === "choice" ? "" : calcUnitLabel(i.dim, i.show || i.unit),
    }));
}

// 단위를 고를 수 있는 칸(dim)마다 화면에서 고른 단위 key — compute(values, { units }) 의 둘째 인자.
// 값은 이미 기준 단위로 바뀌어 들어가지만, 게이지 압력처럼 고른 단위 자체가 뜻을 갖는 계산기(units)가 읽는다.
function calcChosenUnits(def, state) {
  const out = {};
  def.inputs.forEach(i => { if (i.dim) out[i.key] = state[i.key]?.unit || i.show || i.unit; });
  return out;
}

// 화면 상태 → { errors: {칸 key: 문구}, error?: 문구, outputs: {key: 값} | null, warnings: [] }
function calcEvaluate(def, state) {
  const choices = calcChoices(def, state);
  const values = { ...choices };
  const errors = {};
  def.inputs.forEach(i => {
    if (i.type === "choice" || !calcVisible(i, choices)) return;
    if (i.type === "table") { values[i.key] = calcReadTable(i, state[i.key] || [], errors); return; }
    const r = calcReadField(i, state[i.key]?.raw, state[i.key]?.unit || i.unit);
    if (r.error) errors[i.key] = r.error;
    else values[i.key] = r.value;
  });
  if (Object.keys(errors).length) return { errors, outputs: null, warnings: [] };
  let res;
  try { res = def.compute(values, { units: calcChosenUnits(def, state) }) || {}; } catch (e) { return { errors, error: CALC_LABELS.errors.failed, outputs: null, warnings: [] }; }
  if (res.error) return { errors, error: res.error, outputs: null, warnings: [] };
  const outputs = {};
  for (const o of def.outputs) {
    const val = res[o.key];
    if (val == null) continue;
    if (o.type === "text") { outputs[o.key] = String(val); continue; }
    if (o.type === "table") { outputs[o.key] = val; continue; }   // { columns: [{ key, label }], rows: [{ <열 key>: 값 }] } — CalcOutTable
    if (!Number.isFinite(val)) return { errors, error: CALC_LABELS.errors.badOutput, outputs: null, warnings: [] };
    outputs[o.key] = val;
  }
  return { errors, outputs, warnings: res.warnings || [], values };
}

// 정의의 chart(values, outputs) → CalcChart 속성 또는 null. 그래프 함수가 실패해도 결과 패널은 그대로 둔다.
function calcChartFor(def, result) {
  if (typeof def.chart !== "function" || !result?.outputs || !result.values) return null;
  try { return def.chart(result.values, result.outputs) || null; } catch (e) { return null; }
}

const CALC_SUPERSCRIPT = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };

// 유효숫자 digits 자리. 1e-3 ≤ |n| < 1e6 은 보통 표기(천 단위 쉼표), 그 밖은 a × 10ⁿ.
function calcFormatNumber(n, digits = 4) {
  if (n === 0) return "0";
  const a = Math.abs(n);
  if (a >= 1e6 || a < 1e-3) {
    const [m, e] = n.toExponential(digits - 1).split("e");
    const mant = m.includes(".") ? m.replace(/\.?0+$/, "") : m;
    const exp = String(Number(e)).split("").map(ch => CALC_SUPERSCRIPT[ch]).join("");
    return `${mant} × 10${exp}`;
  }
  return Number(n.toPrecision(digits)).toLocaleString("en-US", { maximumFractionDigits: 12 });
}

Object.assign(window, {
  calcChoices, calcVisible, calcParseNumber, calcEvaluate, calcInitialState, calcPrefillApplied, calcFormatNumber, calcChartFor,
});
