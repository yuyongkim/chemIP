// 계산기: 용기·탱크 부피 — 원통 동체 + 양쪽 헤드(평판·반구·2:1 타원·접시형), 세움·눕힘, 액위별 액체 부피.
// 타원·반구 헤드는 닫힌 식, 접시형(torispherical)은 회전체 단면을 Simpson 적분한다.

// 헤드 형상(안지름 D 기준 비율). depth 는 D 에 대한 깊이 비, crown·knuckle 은 접시형 반지름 비.
const CALC_HEADS = {
  flat: { label: tr("평판", "Flat"), kind: "flat" },
  hemi: { label: tr("반구", "Hemispherical"), kind: "ellipsoid", ratio: 0.5 },          // 깊이 = D/2
  ell21: { label: tr("2:1 타원", "2:1 semi-ellipsoidal"), kind: "ellipsoid", ratio: 0.25 },     // 깊이 = D/4
  asme: { label: tr("접시형 ASME F&D (R = D, r = 0.06D)", "Torispherical ASME F&D (R = D, r = 0.06D)"), kind: "tori", crown: 1.0, knuckle: 0.06 },
  klopper: { label: tr("접시형 10 % (R = D, r = 0.1D)", "Torispherical 10 % (R = D, r = 0.1D)"), kind: "tori", crown: 1.0, knuckle: 0.1 },
};

// 반지름 r 인 원에서 중심 기준 높이 y 아래 넓이(활꼴)
function calcCircleSegment(r, y) {
  if (r <= 0 || y <= -r) return 0;
  if (y >= r) return Math.PI * r * r;
  return r * r * Math.acos(-y / r) + y * Math.sqrt(r * r - y * y);
}

// 헤드 단면 반지름 r(s), s = 헤드 꼭지점에서 동체 쪽으로 잰 거리 [m]. { depth, r(s), joints[] }
function calcHeadProfile(head, D) {
  const R = D / 2;
  if (head.kind === "flat") return { depth: 0, r: () => R, joints: [] };
  if (head.kind === "ellipsoid") {
    const a = head.ratio * D;
    return { depth: a, r: s => R * Math.sqrt(Math.max(0, 1 - ((a - s) / a) ** 2)), joints: [] };
  }
  const Rc = head.crown * D, rk = head.knuckle * D, c = R - rk;
  const zk = Rc - Math.sqrt((Rc - rk) ** 2 - c * c);                 // 헤드 깊이 = 너클 중심 높이
  const zj = Rc * (1 - Math.sqrt((Rc - rk) ** 2 - c * c) / (Rc - rk)); // 크라운–너클 접점
  return {
    depth: zk,
    r: s => (s <= zj ? Math.sqrt(Math.max(0, Rc * Rc - (Rc - s) ** 2)) : c + Math.sqrt(Math.max(0, rk * rk - (zk - s) ** 2))),
    joints: [zj],
  };
}

// [a, b] Simpson 적분, 이음점에서 나눈다
function calcSimpson(f, a, b, joints = [], n = 400) {
  const cuts = [a, ...joints.filter(j => j > a && j < b), b];
  let sum = 0;
  for (let i = 0; i < cuts.length - 1; i++) {
    const lo = cuts[i], hi = cuts[i + 1], h = (hi - lo) / n;
    let s = f(lo) + f(hi);
    for (let k = 1; k < n; k++) s += f(lo + k * h) * (k % 2 ? 4 : 2);
    sum += s * h / 3;
  }
  return sum;
}

// 헤드 하나의 액체 부피. 세움(바닥 헤드): 꼭지점에서 높이 hh 까지. 눕힘: 관 바닥에서 액위 h.
function calcHeadLiquid(head, D, orient, level) {
  const p = calcHeadProfile(head, D);
  if (p.depth === 0) return 0;
  const R = D / 2;
  if (orient === "vertical") {
    const hh = Math.min(Math.max(level, 0), p.depth);
    if (head.kind === "ellipsoid") { const a = p.depth; return Math.PI * R * R * hh * hh * (3 * a - hh) / (3 * a * a); }
    return calcSimpson(s => Math.PI * p.r(s) ** 2, 0, hh, p.joints);
  }
  if (head.kind === "ellipsoid") {
    const h = Math.min(Math.max(level, 0), D);
    return (p.depth / R) * Math.PI * h * h * (3 * R - h) / 6;        // 두 헤드 합 = 구의 활꼴 부피 × (a/R), 헤드 하나는 그 절반
  }
  return calcSimpson(s => calcCircleSegment(p.r(s), level - R), 0, p.depth, p.joints);
}

function calcHeadFull(head, D) {
  return calcHeadLiquid(head, D, "vertical", Infinity);
}

// 용기 전체·액체 부피 [m³]. L = 동체(접선 사이) 길이, level = 세움: 바닥 헤드 꼭지점부터, 눕힘: 동체 바닥부터
function calcVesselVolumes({ orient, head, D, L, level }) {
  const H = CALC_HEADS[head];
  const R = D / 2;
  const depth = calcHeadProfile(H, D).depth;
  const Vhead = calcHeadFull(H, D);
  const total = Math.PI * R * R * L + 2 * Vhead;
  const height = orient === "vertical" ? L + 2 * depth : D;
  if (level == null) return { total, Vhead, depth, height };
  let liquid;
  if (orient === "vertical") {
    const bottom = calcHeadLiquid(H, D, "vertical", level);
    const shell = Math.PI * R * R * Math.min(Math.max(level - depth, 0), L);
    const topEmpty = level > depth + L ? calcHeadLiquid(H, D, "vertical", height - level) : Vhead;
    liquid = bottom + shell + (Vhead - topEmpty);
  } else {
    liquid = calcCircleSegment(R, level - R) * L + 2 * calcHeadLiquid(H, D, "horizontal", level);
  }
  return { total, Vhead, depth, height, liquid };
}

const CALC_DEF_VESSEL_VOLUME = {
  key: "vessel_volume",
  group: "process",
  title: tr("용기·탱크 부피 (헤드·액위)", "Vessel and tank volume (heads · level)"),
  summary: tr("원통형 용기의 전체 부피와, 액위(액체 높이)에 따른 액체 부피를 구합니다. 세운 용기·눕힌 용기와 헤드 모양을 고릅니다.",
    "Computes the total volume of a cylindrical vessel and the liquid volume at a given liquid level. Choose a vertical or horizontal vessel and the head type."),
  inputs: [
    { key: "orient", type: "choice", label: tr("놓인 방향", "Orientation"), default: "horizontal",
      options: [{ v: "horizontal", label: tr("눕힘 (가로)", "Horizontal") }, { v: "vertical", label: tr("세움 (세로)", "Vertical") }] },
    { key: "head", type: "choice", label: tr("헤드 모양", "Head type"), term: "vessel_head", default: "ell21",
      options: Object.entries(CALC_HEADS).map(([v, h]) => ({ v, label: h.label })) },
    { key: "D", label: tr("안지름 D", "Inside diameter D"), dim: "length", unit: "m", show: "m", default: 2, positive: true },
    { key: "L", label: tr("동체 길이 (접선 사이)", "Shell length (tangent to tangent)"), term: "tangent_line", dim: "length", unit: "m", show: "m", default: 6, min: 0 },
    { key: "level", label: tr("액위 (선택)", "Liquid level (optional)"), term: "liquid_level", dim: "length", unit: "m", show: "m", default: 1, optional: true, min: 0,
      hint: tr("눕힘: 동체 바닥부터, 세움: 바닥 헤드 맨 아래부터", "Horizontal: from the shell bottom; vertical: from the bottom of the lower head") },
  ],
  outputs: [
    { key: "total", label: tr("전체 부피", "Total volume"), dim: "volume", unit: "m3", show: "m3", digits: 5 },
    { key: "liquid", label: tr("액체 부피", "Liquid volume"), dim: "volume", unit: "m3", show: "m3", digits: 5 },
    { key: "fill", label: tr("채움률", "Fill fraction"), unit: "%", digits: 4 },
    { key: "Vhead", label: tr("헤드 하나 부피", "Volume of one head"), dim: "volume", unit: "m3", show: "m3", digits: 5 },
    { key: "depth", label: tr("헤드 깊이", "Head depth"), dim: "length", unit: "m", show: "mm" },
    { key: "height", label: tr("액위 최댓값 (용기 안 높이)", "Maximum level (inside height)"), dim: "length", unit: "m", show: "m" },
  ],
  compute(v) {
    const r = calcVesselVolumes({ orient: v.orient, head: v.head, D: v.D, L: v.L, level: v.level });
    if (v.level != null && v.level > r.height * (1 + 1e-12)) return { error: tr(`액위가 용기 안 높이(${calcFormatNumber(r.height)} m)를 넘습니다.`, `The liquid level exceeds the vessel inside height (${calcFormatNumber(r.height)} m).`) };
    if (v.L === 0 && v.head === "flat") return { error: tr("동체 길이가 0 이면 평판 헤드 용기는 부피가 없습니다.", "With zero shell length, a flat-head vessel has no volume.") };
    return { ...r, fill: r.liquid != null ? 100 * r.liquid / r.total : undefined };
  },
  formula: [
    tr("전체 = π R² L + 2 V_head,   2:1 타원 V_head = π D³ / 24,  반구 V_head = π D³ / 12",
      "Total = π R² L + 2 V_head,   2:1 semi-ellipsoidal V_head = π D³ / 24,  hemispherical V_head = π D³ / 12"),
    tr("눕힘 동체: V = L · [ R² cos⁻¹((R − h)/R) − (R − h) √(2Rh − h²) ]", "Horizontal shell: V = L · [ R² cos⁻¹((R − h)/R) − (R − h) √(2Rh − h²) ]"),
    tr("눕힘 타원·반구 헤드 두 개: V = (a/R) · π h² (3R − h) / 3   (a = 헤드 깊이)",
      "Two horizontal ellipsoidal/hemispherical heads: V = (a/R) · π h² (3R − h) / 3   (a = head depth)"),
    tr("세움 타원 헤드(꼭지점부터 높이 h ≤ a): V = π R² h² (3a − h) / (3a²)",
      "Vertical ellipsoidal head (height h ≤ a from the apex): V = π R² h² (3a − h) / (3a²)"),
    tr("접시형(크라운 R_c, 너클 r_k): 단면 반지름 r(s) 를 회전체로 적분 — 세움 ∫ π r² ds, 눕힘 ∫ 활꼴(r(s), h − R) ds",
      "Torispherical (crown R_c, knuckle r_k): integrate the section radius r(s) as a solid of revolution — vertical ∫ π r² ds, horizontal ∫ segment(r(s), h − R) ds"),
  ],
  notes: [
    tr("안지름·안쪽 치수 기준입니다. 헤드 직선부(스트레이트 플랜지)는 동체 길이에 넣습니다.",
      "Based on inside diameter and inside dimensions. Include the head straight flange in the shell length."),
    tr("ASME F&D 헤드는 크라운 반지름 = D, 너클 반지름 = 0.06D 로 보았습니다(실제 규격은 바깥지름 기준이므로 약간 다릅니다). 거래·법정 계량은 검정된 용량표(스트래핑 표)를 씁니다.",
      "ASME F&D heads are taken as crown radius = D, knuckle radius = 0.06D (the actual standard is based on outside diameter, so values differ slightly). For custody transfer or legal metrology, use a certified strapping table."),
  ],
  reference: [
    tr("Jones, D. (2002). Computing Fluid Tank Volumes. Chemical Processing (2002년 11월) — 눕힘·세움 원통과 타원·반구·접시형 헤드의 부분 부피(타원체 V = π a b h²(1 − h/3c)/c)",
      "Jones, D. (2002). Computing Fluid Tank Volumes. Chemical Processing (November 2002) — partial volumes of horizontal and vertical cylinders with ellipsoidal, hemispherical and torispherical heads (ellipsoid V = π a b h²(1 − h/3c)/c)"),
    tr("Perry's Chemical Engineers' Handbook 8판(2008), 10절 — 눕힌 원통 부분 채움 부피, 2:1 타원 헤드 부피 πD³/24",
      "Perry's Chemical Engineers' Handbook, 8th ed. (2008), Sec. 10 — partially filled horizontal cylinder volume, 2:1 semi-ellipsoidal head volume πD³/24"),
    tr("Wiencke, B. (2010). Computing the partial volume of pressure vessels. Int. J. Refrigeration 33(4) — 헤드 형상별 부분·전체 부피, 접시형 헤드는 수치 적분",
      "Wiencke, B. (2010). Computing the partial volume of pressure vessels. Int. J. Refrigeration 33(4) — partial and total volumes by head type, numerical integration for torispherical heads"),
  ],
};

Object.assign(window, { CALC_DEF_VESSEL_VOLUME, CALC_HEADS, calcVesselVolumes, calcHeadProfile, calcHeadLiquid, calcCircleSegment, calcSimpson });
