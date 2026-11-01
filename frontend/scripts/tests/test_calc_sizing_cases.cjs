// 설비 사이징 묶음(calc_pump_system·control_valve·compressor·hx_ntu·fittings_dp·separator) 기준값 시험.
// test_calculators.cjs 가 한 줄로 불러 같은 run·near·check 로 돌린다(ko·en 비교도 그쪽 run 이 한다).
// 사례 표시: [src] 출처에 인쇄된 값, [calc] 손계산·해석해 또는 MIT 라이브러리(fluids 1.3.1·ht 1.2.0)로 낸 대조값.
"use strict";

module.exports = function sizingCases({ W, runX, near, check }) {
  const H = 3600;
  const kpa = (x) => ({ raw: x, unit: "kPa" });
  const K = (x) => ({ raw: x, unit: "K" });

  // ── 펌프 운전점 ── R5 §2.4: 펌프 H = 50 − 0.002Q², 계통 H = 20 + 0.001Q² (Q m³/h) → Q = 100, H = 30
  let r = runX("pump_system", { sys: "k", k: 0.001, Hs: 20, change: "none" });
  near("[calc] 펌프 운전점 Q = 100 m³/h (R5 손계산)", r.outputs?.Q_op * H, 100, 1e-9);
  near("[calc] 펌프 운전점 H = 30 m", r.outputs?.H_op, 30, 1e-9);
  near("[calc] 운전점 축동력 ρgQH/η (η 70 %)", r.outputs?.P_op, 998.2 * 9.80665 * (100 / H) * 30 / 0.7, 1e-9);
  near("[calc] 3점 2차식 맞춤 — 차단 양정 50 m", r.outputs?.H0, 50, 1e-9);
  r = runX("pump_system", { sys: "k", k: 0.001, Hs: 20, change: "speed", N0: 1450, N1: 1750 });
  const s = 1750 / 1450;
  near("[calc] 상사비 s = 1750/1450 = 1.2069", r.outputs?.ratio, s, 1e-12);
  near("[calc] 회전수 변경 후 운전점 Q = √((50s² − 20)/0.003)", r.outputs?.Q_new * H, Math.sqrt((50 * s * s - 20) / 0.003), 1e-8);
  near("[calc] 변경 후 축동력 = ρgQH/η", r.outputs?.P_new, 998.2 * 9.80665 * r.outputs?.Q_new * r.outputs?.H_new / 0.7, 1e-9);
  {
    const coef = W.calcQuadFit([[0, 50], [50, 45], [100, 30]]);
    near("[calc] 상사법칙: 곡선 위 점 (Q, H) → (s·Q, s²·H) — R5 'Q ×1.207, H ×1.457'", W.calcPumpHead(coef, 80 * s, s), (50 - 0.002 * 6400) * s * s, 1e-12);
    near("[calc] s² = 1.4566 (R5 1.457)", s * s, 1.457, 5e-4);
  }
  r = runX("pump_system", { sys: "k", k: 0.001, Hs: 20, change: "none" }, { pts: [{ Q: 0, H: 50 }, { Q: 40, H: 46.8 }, { Q: 80, H: 37.2 }, { Q: 120, H: 21.2 }] });
  near("[calc] 4점 최소제곱(정확히 2차식 위의 점) → 같은 운전점", r.outputs?.Q_op * H, 100, 1e-8);
  // 배관 방식: 운전점의 양정 = 정수두 + 배관 계산기(pipe_dp) 손실 + ΣK·v²/2g
  r = runX("pump_system", { sys: "pipe", Hs: 20, change: "none", Ksum: 5 });
  {
    const Q = r.outputs?.Q_op;
    const p = runX("pipe_dp", { mode: "flow", Q: Q * H, D: 102.3, L: 200 });
    const vel = p.outputs.vel;
    near("[calc] 배관 방식: H_op = H_s + h_f(pipe_dp) + ΣK·v²/2g", r.outputs?.H_op, 20 + p.outputs.hf + 5 * vel * vel / (2 * 9.80665), 1e-9);
  }
  r = runX("pump_system", { sys: "k", k: 0.001, Hs: 60, change: "none" });
  check("정수두 > 차단 양정 → 계산 오류", Boolean(r.error), r.error);

  // ── 조절밸브 ── IEC 60534-2-1 예제 1–4, python fluids 문서의 재현값 [src]
  r = runX("control_valve", { phase: "liquid", detail: "full", Ql: 360, rho: 965.4, Pv: 70.1, Pc: 22120, P1: 680, P2: 220, FL: 0.9, Fd: 0.46, mu: 0.31472, D1: 150, D2: 150, d: 150 });
  near("[src] IEC 예제 1 액체 Kv = 164.995 (fluids 문서)", r.outputs?.Kv, 164.9954763704956, 1e-5);
  check("[src] 예제 1 초크 아님", r.outputs?.state === "초크 아님", r.outputs?.state);
  near("[calc] FF = 0.96 − 0.28√(70.1/22120) = 0.94424", r.outputs?.FF, 0.9442375225233299, 1e-9);
  near("[calc] Cv = Kv/0.865", r.outputs?.Cv, 164.9954763704956 / 0.865, 1e-5);
  r = runX("control_valve", { phase: "liquid", detail: "full", Ql: 360, rho: 965.4, Pv: 70.1, Pc: 22120, P1: 680, P2: 220, FL: 0.6, Fd: 0.98, mu: 0.31472, D1: 100, D2: 100, d: 100 });
  near("[src] IEC 예제 2 액체 Kv = 238.058 (초크)", r.outputs?.Kv, 238.05817216710483, 1e-5);
  check("[src] 예제 2 초크", r.outputs?.state === "초크 유동" && r.warnings.length >= 1, r.outputs?.state);
  r = runX("control_valve", { phase: "gas", detail: "full", gasflow: "std", Qn: 3800, M: 44.01, T: K(433), gamma: 1.3, Z: 0.988, P1: 680, P2: 310,
    FL: 0.85, Fd: 0.42, xT: 0.6, mu: 0.14665, D1: 80, D2: 100, d: 50 });
  near("[src] IEC 예제 3 CO₂ 기체(감속관) Kv = 72.587", r.outputs?.Kv, 72.5866454539105, 1e-4);
  near("[calc] 예제 3 FP = [1 + Σζ/N2·(Kv/d²)²]^−½ (수렴 1 % 이내)", r.outputs?.FP, 1 / Math.sqrt(1 + 0.6580810546875 / 1.6e-3 * (r.outputs?.Kv / 2500) ** 2), 0.01);
  near("[calc] 예제 3 Y = 0.67446", r.outputs?.Y, 0.6744595274007039, 1e-9);
  near("[calc] 감속관 손실 Σζ(d 50, D1 80, D2 100) = 0.65808 (fluids 문서)", W.calcCvPipingLoss(50, 80, 100), 0.6580810546875, 1e-12);
  r = runX("control_valve", { phase: "gas", detail: "full", gasflow: "std", Qn: 0.46, M: 39.95, T: K(320), gamma: 1.67, Z: 1, P1: 280, P2: 130,
    FL: 0.98, Fd: 0.07, xT: 0.8, mu: 0.05625, D1: 15, D2: 15, d: 15 });
  near("[src] IEC 예제 4 소유량 트림(층류) Kv = 0.0164988 (fluids 문서, 표준값과 약 3 % 차 명시)", r.outputs?.Kv, 0.016498765335995726, 1e-4);
  check("예제 4: 점성 영역 경고", r.warnings.some(w => /FR/.test(w)));
  near("[src] Reynolds_factor(FL .98, C .015483, d 15, Rev 1202, 축소 트림) = 0.71488 (fluids 문서)", W.calcCvReynoldsFactor(0.98, 0.015483, 15, 1202, true), 0.7148753122302025, 1e-9);
  {
    const W1 = 3800 * 44.01 / (8.314462618 * 273.15 / 101.325);   // kg/h, 이상기체 표준 밀도
    const a = runX("control_valve", { phase: "gas", detail: "basic", gasflow: "std", Qn: 3800, M: 44.01, T: K(433), gamma: 1.3, Z: 0.988, P1: 680, P2: 310, xT: 0.6 });
    const b = runX("control_valve", { phase: "gas", detail: "basic", gasflow: "mass", W: W1, M: 44.01, T: K(433), gamma: 1.3, Z: 0.988, P1: 680, P2: 310, xT: 0.6 });
    near("[calc] 질량 유량 입력 = 같은 표준 부피 유량", b.outputs?.Kv, a.outputs?.Kv, 1e-9);
    near("[calc] 기체 기본식 Kv = Q/(N9·P₁·Y)·√(MTZ/x)", a.outputs?.Kv, 3800 / (24.6 * 680 * (1 - (370 / 680) / (3 * 1.3 / 1.4 * 0.6))) * Math.sqrt(44.01 * 433 * 0.988 / (370 / 680)), 1e-9);
    const c = runX("control_valve", { phase: "gas", detail: "basic", gasflow: "std", Qn: 3800, M: 44.01, T: K(433), gamma: 1.3, Z: 0.988, P1: 680, P2: 100, xT: 0.6 });
    check("[calc] x > Fγ·xT → 초크, Y = 2/3", c.outputs?.state === "초크 유동" && Math.abs(c.outputs.Y - 2 / 3) < 1e-12);
  }
  r = runX("control_valve", { phase: "liquid", detail: "basic", P2: 700 });
  check("P₂ ≥ P₁ → 계산 오류", Boolean(r.error));

  // ── 압축기 ── R5 §2.7 [calc], Çengel & Boles 예제 7-13 [src]: 공기 100 kPa·300 K → 900 kPa
  r = runX("compressor", { method: "isentropic", M: 28.966, k: 1.4, T1: K(300), P1: 1, P2: 5, etaS: 100, etaM: 100, N: 1 });
  near("[calc] 등엔트로피 T₂s = 300·5^0.2857 = 475.1 K (R5)", r.outputs?.T2, 475.1, 5e-4);
  near("[calc] 등엔트로피 w = 176 kJ/kg (R5, cp 1.005)", r.outputs?.w, 176, 3e-3);
  r = runX("compressor", { method: "isentropic", M: 28.966, k: 1.4, T1: K(300), P1: 1, P2: 5, etaS: 100, etaM: 100, N: 2 });
  near("[calc] 2단 완전 중간 냉각 w = 156 kJ/kg (R5)", r.outputs?.w, 156, 3e-3);
  near("[calc] 단당 압력비 √5 = 2.236", r.outputs?.rStage, Math.sqrt(5), 1e-12);
  const cen = { M: 28.97, k: 1.4, T1: K(300), P1: kpa(100), P2: kpa(900), etaM: 100 };
  r = runX("compressor", { ...cen, method: "isentropic", etaS: 100, N: 1 });
  near("[src] Çengel 예제 7-13 (a) 등엔트로피 263.2 kJ/kg", r.outputs?.w, 263.2, 1e-3);
  r = runX("compressor", { ...cen, method: "polytropic", poly: "n", n: 1.3, N: 1 });
  near("[src] Çengel 예제 7-13 (b) 폴리트로픽 n = 1.3 → 246.4 kJ/kg", r.outputs?.w, 246.4, 1e-3);
  r = runX("compressor", { ...cen, method: "polytropic", poly: "n", n: 1.3, N: 2 });
  near("[src] Çengel 예제 7-13 (d) 2단 중간 냉각 n = 1.3 → 215.3 kJ/kg", r.outputs?.w, 215.3, 1e-3);
  r = runX("compressor", { M: 28.966, k: 1.4, T1: K(300), P1: 1, P2: 5, method: "polytropic", poly: "eta", etaP: 80, etaM: 100, N: 1 });
  {
    const m = 0.4 / (1.4 * 0.8), cp = 8.314462618 / 0.028966 * 3.5;
    near("[calc] 폴리트로픽 ηp: 실제 일 = cp·(T₂ − T₁) (이상기체 에너지 수지)", r.outputs?.w * 1000, cp * (r.outputs?.T2 - 300), 1e-9);
    near("[calc] 폴리트로픽 n = 1/(1 − (k−1)/(kηp))", r.outputs?.nOut, 1 / (1 - m), 1e-12);
  }
  r = runX("compressor", { M: 28.966, k: 1.4, T1: K(300), P1: 1, P2: 5, method: "isentropic", etaS: 75, etaM: 98, N: 1, mdot: 3600 });
  near("[calc] 축동력 = ṁ·w/ηm", r.outputs?.Pshaft, r.outputs?.w * 1000 / 0.98, 1e-12);
  check("토출 > 150 °C → 경고", r.warnings.some(w => /150/.test(w)));

  // ── 열교환기 ε-NTU ── [calc] 해석식 + ht 1.2.0 effectiveness_from_NTU 대조, [src] Incropera 예제 11.1
  const hx = (arr, extra = {}) => runX("hx_ntu", { arr, mode: "rating", mh: 1, cph: 1000, mc: 1, cpc: 2000, ubuild: "direct", U: 100, ...extra });
  near("[calc] 향류 NTU 2, C_r 0.5 → ε = 0.7746 (R5·ht)", hx("counter", { A: 20 }).outputs?.eps, 0.7746003264394359, 1e-9);
  near("[calc] 병류 NTU 2, C_r 0.5 → ε = 0.63348 (ht)", hx("parallel", { A: 20 }).outputs?.eps, 0.6334752877547574, 1e-9);
  near("[calc] 셸 1개(1-2) NTU 1, C_r 0.5 → ε = 0.53994 (Incropera 식 11.30a·ht; R5 의 0.565 는 오기)", hx("shell", { A: 10, shells: 1 }).outputs?.eps, 0.5399395561060546, 1e-9);
  near("[calc] 셸 2개 NTU 3, C_r 0.5 → ε = 0.83590 (식 11.31b·ht)", hx("shell", { A: 30, shells: 2 }).outputs?.eps, 0.8358970687745874, 1e-9);
  near("[calc] 직교류 비혼합(근사식) NTU 2, C_r 0.5 → 0.73876 (ht 'crossflow approximate')", hx("cross_uu", { A: 20 }).outputs?.eps, 0.7387584625420098, 1e-9);
  near("[calc] 직교류 C_max 혼합 → 0.70201 (ht)", hx("cross_cmax_mixed", { A: 20 }).outputs?.eps, 0.7020127152802531, 1e-9);
  near("[calc] 직교류 C_min 혼합 → 0.71755 (ht)", hx("cross_cmin_mixed", { A: 20 }).outputs?.eps, 0.7175464361494597, 1e-9);
  near("[calc] C_r → 0: ε = 1 − e^(−2) = 0.8647", hx("counter", { A: 20, mc: 1e12 }).outputs?.eps, 1 - Math.exp(-2), 1e-6);
  for (const arr of W.CALC_HX_ARR || ["counter", "parallel", "shell", "cross_uu", "cross_cmax_mixed", "cross_cmin_mixed"]) {
    const a = hx(arr, { A: 7, shells: 1 });
    const b = runX("hx_ntu", { arr, mode: "sizing", mh: 1, cph: 1000, mc: 1, cpc: 2000, ubuild: "direct", U: 100, shells: 1, target: "Tho",
      Tt: { raw: a.outputs.Tho, unit: "K" } });
    near(`[calc] ${arr}: 설계(목표 출구) → 평가 면적 7 m² 되돌림`, b.outputs?.A_out, 7, 1e-7);
  }
  r = runX("hx_ntu", { arr: "counter", mode: "sizing", mh: 0.1, cph: 2131, Thi: 100, mc: 0.2, cpc: 4178, Tci: 30, target: "Tho", Tt: 60, ubuild: "direct", U: 38.1 });
  near("[src] Incropera 예제 11.1 관 길이 L = A/(π·0.025) = 65.9 m (U 38.1, ΔT_lm 43.2 °C)", r.outputs?.A_out / (Math.PI * 0.025), 65.9, 2e-3);
  near("[calc] 예제 11.1 열량 q = 0.1·2131·40 = 8524 W", r.outputs?.q, 8524, 1e-9);
  {
    const l = runX("lmtd", { flow: "counter", Thi: 100, Tho: 60, Tci: 30, Tco: { raw: r.outputs.Tco, unit: "K" } });
    near("[src] 예제 11.1 ΔT_lm = 43.2 °C (LMTD 계산기)", l.outputs?.lmtd, 43.2, 1e-3);
    near("[calc] ε-NTU 면적 = q/(U·ΔT_lm) (LMTD 계산기와 일치)", r.outputs?.A_out, 8524 / (38.1 * l.outputs.lmtd), 1e-9);
  }
  r = runX("hx_ntu", { arr: "counter", mode: "rating", A: 5, ubuild: "films", hi: 2250, ho: 40, Rfi: 0, Rfo: 0, Do: 25, Di: 25, kw: "" });
  near("[calc] 막 계수만: U = 1/(1/h_i + 1/h_o)", r.outputs?.U_out, 1 / (1 / 2250 + 1 / 40), 1e-12);
  r = runX("hx_ntu", { arr: "counter", mode: "rating", A: 5, ubuild: "films", hi: 1000, ho: 500, Rfi: 0.0002, Rfo: 0.0003, Do: 25.4, Di: 21.2, kw: 45 });
  near("[calc] 오염·관벽 포함 U_o 손계산", r.outputs?.U_out,
    1 / (1 / 500 + 0.0003 + 0.0254 * Math.log(25.4 / 21.2) / 90 + 0.0002 * 25.4 / 21.2 + 25.4 / (21.2 * 1000)), 1e-12);
  r = runX("hx_ntu", { arr: "parallel", mode: "sizing", target: "Tho", Tt: 40, mh: 1, cph: 1000, mc: 1, cpc: 1000, Thi: 100, Tci: 30, ubuild: "direct", U: 100 });
  check("병류로 닿을 수 없는 목표 → 계산 오류", Boolean(r.error), r.error);

  // ── 피팅 손실 ── fluids 문서 예제 [src], 손계산 [calc]
  {
    const globe = W.CALC_FITTINGS.find(f => f.key === "globe");
    near("[src] Hooper2K(D 2 in, Re 10⁴, 글로브 표준) = 6.15 (fluids 문서)", W.calcK2(globe.hooper, 1e4, 2), 6.15, 1e-12);
    near("[src] Hooper2K(D 2 in, Re 10⁴, K1 900, K∞ 4) = 6.09", W.calcK2([900, 4], 1e4, 2), 6.09, 1e-12);
    near("[src] Darby3K(NPS 2, Re 10⁴, 앵글 밸브 45° K 950/0.25/4) = 1.15725", W.calcK3([950, 0.25, 4], 1e4, 2), 1.1572523963562356, 1e-12);
    near("[src] Darby3K(NPS 12, Re 10⁴, 950/0.25/4) = 0.81951", W.calcK3([950, 0.25, 4], 1e4, 12), 0.819510280626355, 1e-12);
  }
  const none = Object.fromEntries((W.CALC_FITTINGS || []).map(f => [`n_${f.key}`, 0]));
  r = runX("fittings_dp", { method: "3k", ...none, n_entrance: 1, n_exit: 1, Kx: 0, L: 0 });
  {
    const vel = (50 / H) / (Math.PI * 0.1023 * 0.1023 / 4);
    near("[calc] 입구+출구만: ΣK = 1.5", r.outputs?.Ksum, 1.5, 1e-12);
    near("[calc] ΔP = 1.5·ρv²/2", r.outputs?.dp, 1.5 * 998.2 * vel * vel / 2, 1e-12);
  }
  r = runX("fittings_dp", { method: "2k", ...none, n_globe: 1, n_entrance: 0, n_exit: 0, Kx: 0, L: 0 });
  {
    const Re = r.outputs?.Re;
    near("[calc] 2-K 글로브 1개: ΣK = 1500/Re + 4(1 + 1/D[in])", r.outputs?.Ksum, 1500 / Re + 4 * (1 + 0.0254 / 0.1023), 1e-12);
  }
  r = runX("fittings_dp", { method: "3k", ...none, n_gate: 2, NPS: 4, n_entrance: 0, n_exit: 0, Kx: 0, L: 0 });
  near("[calc] 3-K 게이트 2개, NPS 4: ΣK = 2·(300/Re + 0.037(1 + 3.9/4^0.3))", r.outputs?.Ksum, 2 * (300 / r.outputs?.Re + 0.037 * (1 + 3.9 / Math.pow(4, 0.3))), 1e-12);
  {
    const p = runX("pipe_dp", { mode: "flow", Q: 50, D: 102.3, L: 50 });
    r = runX("fittings_dp", { method: "k", L: 50 }, { krows: [{ name: "x", n: 2, K: 0.5 }] });
    near("[calc] 직관 손실 = 배관 압력손실 계산기와 같음", r.outputs?.dpPipe, p.outputs.dp, 1e-12);
    near("[calc] K 직접: ΣK = 2 × 0.5", r.outputs?.Ksum, 1, 1e-12);
    near("[calc] 상당 길이 = ΣK·D/f", r.outputs?.Leq, 0.1023 / p.outputs.f, 1e-12);
    const ch = W.calcChartFor(W.calcFind("fittings_dp"), r);
    check("Moody 선도: 층류 + 조도 곡선 5개, 로그 축, 운전점 표시", ch && ch.series.length === 6 && ch.x.log && ch.y.log && ch.markers.length === 1);
  }

  // ── 기액분리기 ── fluids 문서 [src], 손계산 [calc]
  near("[src] v_Souders_Brown(K 0.08, ρl 985.4, ρg 1.3) = 2.2011 m/s (fluids 문서)", W.calcSouders(0.08, 985.4, 1.3), 2.2010906387516167, 1e-12);
  near("[src] K_separator_demister_York(975 psia) = 0.082815 m/s (fluids 문서)", W.calcSepKYork(975 * 6894.757293168), 0.08281536035331669, 1e-9);
  near("[calc] York 15–40 psia → 0.35 ft/s", W.calcSepKYork(20 * 6894.757293168), 0.35 * 0.3048, 1e-12);
  r = runX("separator", { orient: "vertical", Qg: 7200, rhog: 12, rhol: 700, kmode: "user", K: 0.107, Ql: 10, th: 5 });
  {
    const vmax = 0.107 * Math.sqrt(688 / 12);
    near("[calc] 세운 형 v_max = K√((ρl−ρg)/ρg)", r.outputs?.vmax, vmax, 1e-12);
    near("[calc] 세운 형 D = √(4Q/(π v_max)) (2 m³/s → 1.766 m)", r.outputs?.D, Math.sqrt(4 * 2 / (Math.PI * vmax)), 1e-12);
    near("[calc] 체류 액 높이 = Q_l·t/(πD²/4)", r.outputs?.hliq, (10 / H) * 300 / (Math.PI * r.outputs.D ** 2 / 4), 1e-12);
  }
  near("[calc] 활꼴 넓이 비 φ(0.5) = 0.5", W.calcSegmentFraction(0.5), 0.5, 1e-12);
  r = runX("separator", { orient: "horizontal", Qg: 7200, rhog: 12, rhol: 700, kmode: "york", P: 10, Ql: 100, th: 10, LD: 3, hl: 0.5 });
  {
    const Kh = W.calcSepKYork(1e6, true);
    near("[calc] 눕힌 형 York K = 세운 형 × 1.25", r.outputs?.Kused, W.calcSepKYork(1e6) * 1.25, 1e-12);
    const vmax = Kh * Math.sqrt(688 / 12);
    const Dg = Math.sqrt(4 * 2 / (Math.PI * vmax * 0.5));
    const Dl = Math.cbrt(4 * (100 / H * 600) / (Math.PI * 0.5 * 3));
    near("[calc] 눕힌 형 D = max(기체 조건, 액 체류 조건)", r.outputs?.D, Math.max(Dg, Dl), 1e-12);
    near("[calc] 눕힌 형 L = (L/D)·D", r.outputs?.L, 3 * Math.max(Dg, Dl), 1e-12);
  }
  r = runX("separator", { rhog: 800, rhol: 700 });
  check("ρg ≥ ρl → 계산 오류", Boolean(r.error));
};
