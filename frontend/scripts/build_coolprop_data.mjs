// CoolProp 8.0.0(vendor/coolprop, MIT)로 계산기 자료 파일 두 개를 만든다. 화면은 이 결과(정적 자료)만 읽는다.
//   public/chemip/calc_fluid_data.jsx      유체 목록: 이름(CoolProp key)·CAS·분류·임계점·삼중점·적용 범위·몰질량·ASHRAE 34 안전 등급
//   public/chemip/calc_vle_antoine_data.jsx  VLE 사전 설정 물질의 Antoine 상수(CoolProp 포화압력 곡선에 맞춘 값)·맞춘 범위·최대 오차
// 손으로 고치지 않는다. 다시 만들 때: node frontend/scripts/build_coolprop_data.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CHEMIP = path.join(HERE, "..", "public", "chemip");
const CP = await (await import(pathToFileURL(path.join(CHEMIP, "vendor", "coolprop", "coolprop.js")).href)).default();
const VERSION = `${CP.get_global_param_string("version")} (${CP.get_global_param_string("gitrevision").slice(0, 10)})`;

// ── 분류(화면 고르기 묶음). 냉매 = R 번호 + 천연 냉매(ASHRAE 34 번호가 별칭에 있는 것) ──
const NATURAL_REFRIGERANT = { Ammonia: "R717", CarbonDioxide: "R744", "n-Propane": "R290", IsoButane: "R600a", "n-Butane": "R600", Propylene: "R1270", DimethylEther: "RE170" };
const GASES = ["Air", "Argon", "CarbonMonoxide", "CarbonylSulfide", "Chlorine", "Deuterium", "Fluorine", "HeavyWater", "Helium", "Hydrogen",
  "HydrogenChloride", "HydrogenSulfide", "Krypton", "Neon", "Nitrogen", "NitrousOxide", "OrthoDeuterium", "OrthoHydrogen", "Oxygen",
  "ParaDeuterium", "ParaHydrogen", "SulfurDioxide", "SulfurHexafluoride", "Water", "Xenon"];
const OTHER = ["D4", "D5", "D6", "MD2M", "MD3M", "MD4M", "MDM", "MM", "MethylLinoleate", "MethylLinolenate", "MethylOleate", "MethylPalmitate",
  "MethylStearate", "Novec649", "SES36", "HFE143m", "n-Perfluorobutane", "n-Perfluoropentane", "n-Perfluorohexane"];
const ORGANIC = ["Acetone", "DiethylEther", "DimethylCarbonate", "Dichloroethane", "Ethanol", "EthyleneOxide", "Methanol", "PropyleneGlycol",
  "Tetrahydrofuran", "VinylChloride"];

function category(id) {
  if (NATURAL_REFRIGERANT[id] || /^R(C)?\d/.test(id)) return "ref";
  if (GASES.includes(id)) return "gas";
  if (OTHER.includes(id)) return "other";
  if (ORGANIC.includes(id)) return "org";
  return "hc";
}

function num(key, id) {
  const v = CP.PropsSI(key, "", 0, "", 0, id);
  return Number.isFinite(v) ? Number(v.toPrecision(7)) : null;
}

function fluidRow(id) {
  const casRaw = CP.get_fluid_param_string(id, "CAS");
  const cas = /^\d{2,7}-\d{2}-\d$/.test(casRaw) ? casRaw : null;   // 혼합 냉매(.PPF)·ortho/para 수소는 CAS 없음
  const sg = CP.get_fluid_param_string(id, "ASHRAE34");
  return {
    id, cas, cat: category(id), ash: NATURAL_REFRIGERANT[id] || null,
    pure: CP.get_fluid_param_string(id, "pure") === "true",
    sg: /^[AB][123]L?$/.test(sg) ? sg : null,
    M: num("molar_mass", id), Tc: num("Tcrit", id), pc: num("pcrit", id), Tt: num("Ttriple", id), pt: num("ptriple", id),
    Tmin: num("Tmin", id), Tmax: num("Tmax", id), pmax: num("pmax", id),
  };
}

// ── Antoine 맞춤: ln P[Pa] = A − B / (T[K] + C). 범위 = 포화압력 1 kPa ~ 500 kPa (삼중점·0.95 Tc 안쪽) ──
const VLE_FLUIDS = ["Water", "Methanol", "Ethanol", "Acetone", "Benzene", "Toluene", "EthylBenzene", "o-Xylene", "m-Xylene", "p-Xylene",
  "n-Pentane", "n-Hexane", "n-Heptane", "n-Octane", "CycloHexane", "DiethylEther", "Tetrahydrofuran", "Dichloroethane"];

function satT(id, p) {
  const AS = CP.factory("HEOS", id);
  AS.update(CP.input_pairs.PQ_INPUTS, p, 0);
  return AS.T();
}

function fitAntoine(id) {
  const AS = CP.factory("HEOS", id);
  const Tt = CP.PropsSI("Ttriple", "", 0, "", 0, id), Tc = CP.PropsSI("Tcrit", "", 0, "", 0, id);
  const lo = Math.max(Tt + 0.5, satT(id, 1e3)), hi = Math.min(0.95 * Tc, satT(id, 5e5));
  const pts = [];
  for (let i = 0; i <= 80; i++) {
    const T = lo + (hi - lo) * i / 80;
    AS.update(CP.input_pairs.QT_INPUTS, 0, T);
    pts.push([T, Math.log(AS.p())]);
  }
  // C 를 고르면 A·B 는 선형 최소제곱. C 는 황금 분할로 찾는다.
  const solve = (C) => {
    let sx = 0, sy = 0, sxx = 0, sxy = 0;
    const n = pts.length;
    for (const [T, y] of pts) { const x = -1 / (T + C); sx += x; sy += y; sxx += x * x; sxy += x * y; }
    const B = (n * sxy - sx * sy) / (n * sxx - sx * sx), A = (sy - B * sx) / n;
    let sse = 0, maxRel = 0;
    for (const [T, y] of pts) { const e = A - B / (T + C) - y; sse += e * e; maxRel = Math.max(maxRel, Math.abs(Math.exp(e) - 1)); }
    return { A, B, C, sse, maxRel };
  };
  let a = -lo + 5, b = 50;
  const g = (Math.sqrt(5) - 1) / 2;
  for (let i = 0; i < 200; i++) {
    const c1 = b - g * (b - a), c2 = a + g * (b - a);
    if (solve(c1).sse < solve(c2).sse) b = c2; else a = c1;
  }
  const f = solve((a + b) / 2);
  const r = (x, d) => Number(x.toFixed(d));
  return { id, A: r(f.A, 6), B: r(f.B, 3), C: r(f.C, 4), Tmin: r(lo, 2), Tmax: r(hi, 2), maxErr: Number(f.maxRel.toPrecision(2)) };
}

const ids = CP.get_global_param_string("FluidsList").split(",").sort((x, y) => x.localeCompare(y, "en"));
const rows = ids.map(fluidRow);
const head = (what) => `// ${what}\n// 만든 곳: frontend/scripts/build_coolprop_data.mjs — CoolProp ${VERSION}, MIT 라이선스(vendor/coolprop/LICENSE). 손으로 고치지 않는다.\n`;

const fluidJs = `${head("유체 목록(CoolProp 순수·유사순수 유체) — 고르기 칸·CAS 연결·적용 범위 검사에 쓴다. React 없음(자료만).")}`
  + "// 칸: id = CoolProp 이름, cas(없으면 null), cat = ref 냉매 | hc 탄화수소 | org 유기 용제 | gas 기체·물 | other, ash = 천연 냉매 ASHRAE 번호,\n"
  + "//     pure = 순수 유체(false = 유사순수 혼합 냉매, 2상 건도 계산 불가), sg = ASHRAE 34 안전 등급, M [kg/mol], Tc·Tt·Tmin·Tmax [K], pc·pt·pmax [Pa]\n"
  + `const CALC_FLUID_DATA = [\n${rows.map(r => `  ${JSON.stringify(r)},`).join("\n")}\n];\n\nObject.assign(window, { CALC_FLUID_DATA });\n`;
fs.writeFileSync(path.join(CHEMIP, "calc_fluid_data.jsx"), fluidJs);

const fits = VLE_FLUIDS.map(fitAntoine);
const antoineJs = `${head("VLE 사전 설정 물질의 Antoine 상수 — CoolProp 포화압력(ln P[Pa] = A − B/(T[K] + C))에 맞춘 값. React 없음(자료만).")}`
  + "// Tmin·Tmax [K] = 맞춘 범위(포화압력 1–500 kPa), maxErr = 그 범위에서 CoolProp 대비 최대 상대 오차.\n"
  + `const CALC_VLE_ANTOINE_DATA = {\n${fits.map(f => `  ${JSON.stringify(f.id)}: ${JSON.stringify({ A: f.A, B: f.B, C: f.C, Tmin: f.Tmin, Tmax: f.Tmax, maxErr: f.maxErr })},`).join("\n")}\n};\n\nObject.assign(window, { CALC_VLE_ANTOINE_DATA });\n`;
fs.writeFileSync(path.join(CHEMIP, "calc_vle_antoine_data.jsx"), antoineJs);

console.log(`fluids ${rows.length} (with CAS ${rows.filter(r => r.cas).length}), antoine fits ${fits.length}, worst ${Math.max(...fits.map(f => f.maxErr))}`);
fits.forEach(f => console.log(`  ${f.id}: A=${f.A} B=${f.B} C=${f.C} [${f.Tmin}, ${f.Tmax}] K maxErr=${f.maxErr}`));
