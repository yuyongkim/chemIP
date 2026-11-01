// 적용 법규 판정기 · 수량 환산(순수 함수). 입력 행의 양·단위·밀도 → kg·L. 밀도는 kg/L(= 비중). React 없음.
//   aplNum("1,500") → 1500, 빈칸·글자 → null
//   aplAmount(row, info) → { kg, L, densityUsed, densityFrom: "row"|"facts"|null, missing: [] }  missing: ["qty"] | ["density"]

const APL_UNITS = ["kg", "t", "L", "m3"];
const APL_MASS_UNITS = ["kg", "t"];

function aplNum(raw) {
  const s = String(raw == null ? "" : raw).replace(/,/g, "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// 행의 밀도 칸이 비면 물질 자료(MSDS 9항 비중)를 쓴다
function aplDensity(row, info) {
  const own = aplNum(row.density);
  if (own != null && own > 0) return { d: own, from: "row" };
  const f = info && info.density;
  if (f != null && f > 0) return { d: f, from: "facts" };
  return { d: null, from: null };
}

function aplAmount(row, info) {
  const q = aplNum(row.qty);
  const out = { kg: null, L: null, densityUsed: null, densityFrom: null, missing: [] };
  if (q == null || q < 0) { out.missing.push("qty"); return out; }
  const { d, from } = aplDensity(row, info);
  const unit = APL_UNITS.includes(row.unit) ? row.unit : "kg";
  if (unit === "kg") out.kg = q;
  if (unit === "t") out.kg = q * 1000;
  if (unit === "L") out.L = q;
  if (unit === "m3") out.L = q * 1000;
  if (out.kg == null && d != null) out.kg = out.L * d;
  if (out.L == null && d != null) out.L = out.kg / d;
  if (d != null) { out.densityUsed = d; out.densityFrom = from; }
  return out;
}

// 농도(중량 %) — 비우면 100 %
function aplConc(row) {
  const c = aplNum(row.conc);
  return c == null ? 100 : Math.min(100, Math.max(0, c));
}

// 화면·CSV 숫자 표기: 1,234.5 · 0.0125 · 2.55 (자릿수는 크기에 맞춰)
function aplFmt(n, digits) {
  if (n == null || !Number.isFinite(n)) return "—";
  const a = Math.abs(n);
  const d = digits != null ? digits : a >= 1000 ? 0 : a >= 10 ? 1 : a >= 1 ? 2 : a >= 0.01 ? 3 : 4;
  return n.toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: 0 });
}

Object.assign(window, { APL_UNITS, APL_MASS_UNITS, aplNum, aplDensity, aplAmount, aplConc, aplFmt });
