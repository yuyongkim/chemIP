// HAZOP 워크시트 작성기 순수 모듈 시험 — 화면·서버 없이(hazop_data·hazop_labels(_en)·hazop_core·hazop_ops).
//   (1) 자료: 변수 × 가이드워드 조합마다 이탈 이름, 변수마다 제안 목록(원인·결과·안전조치), ko·en 모양 같음·en 에 한글 없음
//   (2) 위험도 S×L·구간, 저장 자료 정리(망가진 값 → 새 검토), CSV(따옴표·줄바꿈·열 수), H 문구 → 유해성, 사고 사례 → 제안
//   (3) 고치기(hzOp*): 줄 추가·이동·삭제, 제안 한 줄 더하기(겹치지 않게), 검토구간 수 한도
//   node frontend/scripts/tests/test_hazop.cjs
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const CHEMIP = path.join(__dirname, "..", "..", "public", "chemip");
const BABEL_OPTIONS = {
  presets: ["react", "env"],
  plugins: ["transform-class-properties", "transform-object-rest-spread", "transform-flow-strip-types"],
  targets: { browsers: undefined },
  compact: false,
  comments: false,
};
const babel = require(path.join(CHEMIP, "vendor", "babel.min.js"));
const MODULES = ["lang.jsx", "hazop_data.jsx", "hazop_labels.jsx", "hazop_labels_en.jsx", "hazop_core.jsx", "hazop_ops.jsx"];

function load(lang) {
  const sandbox = { console, URLSearchParams, location: { search: `?lang=${lang}` } };
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);
  for (const rel of MODULES) {
    const code = babel.transform(fs.readFileSync(path.join(CHEMIP, rel), "utf8"), { ...BABEL_OPTIONS, filename: rel }).code;
    vm.runInContext(code, ctx, { filename: rel });
  }
  return sandbox;
}

const W = load("ko");
const WE = load("en");
const L = W.HAZOP_LABELS;
const LE = WE.HAZOP_LABELS;
const HANGUL = /[가-힣ㄱ-ㆎ]/;
let pass = 0, fail = 0;
function check(name, ok, note = "") {
  if (ok) pass++; else fail++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${note ? ` — ${note}` : ""}`);
}

// ── (1) 자료 ──
const missingDev = [];
W.HAZOP_PARAMS.forEach(p => p.guides.forEach(g => { if (!L.dev[p.k]?.[g] || !LE.dev[p.k]?.[g]) missingDev.push(`${p.k}.${g}`); }));
check("변수 × 가이드워드 조합마다 이탈 이름(ko·en)", missingDev.length === 0, missingDev.join(", "));
const missingLib = W.HAZOP_PARAMS.filter(p => !["causes", "consequences", "safeguards"].every(f => (L[f][p.k] || []).length && (LE[f][p.k] || []).length && L[f][p.k].length === LE[f][p.k].length)).map(p => p.k);
check("변수마다 원인·결과·안전조치 제안(ko·en 같은 개수)", missingLib.length === 0, missingLib.join(", "));
check("가이드워드 7개 + 일반 이름", [...W.HAZOP_GUIDES, "gen"].every(g => L.guides[g] && LE.guides[g]));
check("설비 이름·설비 원인 목록", W.HAZOP_EQUIPMENT.every(e => L.equipment[e] && LE.equipment[e] && Array.isArray(L.equipmentCauses[e]) && L.equipmentCauses[e].length === LE.equipmentCauses[e].length));
check("유해성 key 마다 결과 문장", W.HAZOP_H_HAZARDS.every(h => L.hazards[h.k] && LE.hazards[h.k]));
check("기록지 열 이름", W.HAZOP_COLUMNS.every(k => L.cols[k] && LE.cols[k]));

function shapeDiff(a, b, at = "") {
  if (typeof a === "function") return typeof b === "function" ? [] : [at];
  if (Array.isArray(a)) return Array.isArray(b) ? [] : [at];
  if (a && typeof a === "object") return Object.keys(a).flatMap(k => (b && k in b ? shapeDiff(a[k], b[k], `${at}.${k}`) : [`${at}.${k}`]));
  return typeof b === typeof a ? [] : [at];
}
const diff = shapeDiff(W.HAZOP_LABELS_KO, W.HAZOP_LABELS_EN);
check("ko 문구 경로가 en 에 모두 있음", diff.length === 0, diff.join(", "));
const enText = JSON.stringify(W.HAZOP_LABELS_EN) + Object.values(W.HAZOP_LABELS_EN).filter(v => typeof v === "function").join("");
function allStrings(o) {
  if (typeof o === "string") return [o];
  if (typeof o === "function") { try { return [String(o("x", "y"))]; } catch (e) { return []; } }
  if (Array.isArray(o)) return o.flatMap(allStrings);
  if (o && typeof o === "object") return Object.values(o).flatMap(allStrings);
  return [];
}
const hangulEn = allStrings(W.HAZOP_LABELS_EN).filter(t => HANGUL.test(t));
check("en 문구에 한글 없음", hangulEn.length === 0 && enText.length > 0, hangulEn.slice(0, 3).join(" | "));

// ── (2) 순수 함수 ──
check("이탈 이름: 유량 + 없음 → 유량 없음", W.hzDeviationName("flow", "no", L) === "유량 없음");
check("이탈 이름: en", WE.hzDeviationName("flow", "reverse", LE) === "Reverse flow");
check("이름 없는 조합 → 변수 + 가이드워드", W.hzDeviationName("pressure", "reverse", L) === "압력 반대");
check("연속공정은 시간·순서 변수 없음", !W.hzParamsFor("continuous").some(p => p.k === "time" || p.k === "sequence"));
check("회분식은 시간·순서 변수 있음", W.hzParamsFor("batch").some(p => p.k === "time") && W.hzParamsFor("batch").some(p => p.k === "sequence"));

const cfg = { ...W.HAZOP_RISK_DEFAULT };
check("위험도 S 4 × L 3 = 12 → 높음", W.hzRiskScore({ S: 4, L: 3 }, cfg) === 12 && W.hzRiskBand(12, cfg) === "high");
check("위험도 2 × 2 = 4 → 보통", W.hzRiskBand(W.hzRiskScore({ S: 2, L: 2 }, cfg), cfg) === "mid");
check("위험도 1 × 3 = 3 → 낮음", W.hzRiskBand(W.hzRiskScore({ S: 1, L: 3 }, cfg), cfg) === "low");
check("빈 값·척도 밖 → 위험도 없음", W.hzRiskScore({ S: null, L: 2 }, cfg) === null && W.hzRiskScore({ S: 5, L: 2 }, cfg) === null && W.hzRiskBand(null, cfg) === "none");
const nr = W.hzNormalizeRisk({ sMax: 5, lMax: 5, high: 99, mid: 30 });
check("위험도 설정 정리: 경계 ≤ 최대, mid ≤ high", nr.high === 25 && nr.mid === 25, JSON.stringify(nr));

const bad = W.hzNormalizeStudy({ nodes: "x" });
check("망가진 저장 값 → 새 검토(구간 1개)", bad.nodes.length === 1 && bad.processType === "continuous");
const fixed = W.hzNormalizeStudy({ processType: "batch", nodes: [{ no: 3, equipment: "nope", rows: [{ S: "4", status: "weird", causes: 5 }] }] });
check("저장 값 정리: 숫자 → 글, 모르는 설비 → other, 모르는 진행 → open",
  fixed.processType === "batch" && fixed.nodes[0].no === "3" && fixed.nodes[0].equipment === "other" && fixed.nodes[0].rows[0].S === 4 && fixed.nodes[0].rows[0].status === "open" && fixed.nodes[0].rows[0].causes === "5");

const ex = W.hzExampleStudy(L);
check("예시: 구간 1개·줄 2개·물질 톨루엔", ex.nodes.length === 1 && ex.nodes[0].rows.length === 2 && ex.nodes[0].substance.cas_no === "108-88-3");
const csv = W.hzCsv(ex, L);
const csvLines = csv.split("\r\n");
check("CSV: 머리 줄 + 2줄", csvLines[0].startsWith("검토구간,") && /"P-101 정지\nXV-101 잘못 닫힘"/.test(csv));
check("CSV: 머리 열 수 = 5 + 기록지 열", csvLines[0].split(",").length === 5 + W.HAZOP_COLUMNS.length);
check("CSV: 위험도 칸 4×2 = 8 (높음)", csv.includes("8 (높음)"));
check("CSV 칸: 따옴표·쉼표", W.hzCsvCell('a,"b"') === '"a,""b"""' && W.hzCsvCell("plain") === "plain");
const csvEn = WE.hzCsv(WE.hzExampleStudy(LE), LE);
check("CSV en: 한글 없음", !HANGUL.test(csvEn), csvEn.split("\r\n")[0]);

check("H 문구 → 유해성 key", JSON.stringify(W.hzHazardKeys([{ code: "H225" }, { code: "H304" }, { code: "H315" }, { code: "H361d" }, { code: "H373" }, { code: "H336" }])) === JSON.stringify(["flammable", "cmr"]));
check("H 문구 합친 코드(H300+H310)", W.hzHazardKeys([{ code: "H300+H310" }]).includes("acuteFatal"));
const hints = W.hzIncidentHints({ cases: [{ causes: ["Corrosion", "corrosion", "Overfill"] }, { causes: ["Static"] }], disciplines: [{ key: "mech", label: "Mechanical", standards: "API 650" }] }, { mech: "기계" });
check("사고 원인: 대소문자 겹침 빼기", JSON.stringify(hints.causes) === JSON.stringify(["Corrosion", "Overfill", "Static"]));
check("설계 분야: 화면 이름 먼저", hints.disciplines[0].name === "기계" && hints.disciplines[0].standards === "API 650");
const groups = W.hzSuggestions({ param: "level", equipment: "tank", hazardKeys: ["flammable"], factsItems: [{ label: "인화점", text: "4 ℃" }], incidentHints: hints }, L);
check("제안 묶음: 일반·설비·유해성·물성·사고·분야", groups.map(g => g.k).join() === "library,equipment,hazards,facts,incidents,disciplines", groups.map(g => g.k).join());
check("제안: 사고 설비 → 개선권고 문장", groups.find(g => g.k === "disciplines").items[0].field === "rec" && /기계/.test(groups.find(g => g.k === "disciplines").items[0].text));
check("제안: 줄을 고르지 않으면 일반 예시 없음", !W.hzSuggestions({ param: "", equipment: "other" }, L).length);

check("한 줄 더하기: 빈 칸", W.hzAppendLine("", "A") === "A");
check("한 줄 더하기: 다음 줄", W.hzAppendLine("A", "B") === "A\nB");
check("한 줄 더하기: 이미 있으면 그대로", W.hzAppendLine("A\nB", "B") === "A\nB");

// ── (3) 고치기 ──
let s = W.hzNewStudy();
const nid = s.nodes[0].id;
s = W.hzOpAddRows(s, nid, [W.hzNewRow("flow", "no", L), W.hzNewRow("flow", "more", L), W.hzNewRow("pressure", "more", L)]);
check("줄 3개 추가", s.nodes[0].rows.length === 3 && W.hzRowCount(s.nodes[0], "flow", "no") === 1);
const [r1, r2] = s.nodes[0].rows;
s = W.hzOpMoveRow(s, nid, r2.id, -1);
check("줄 위로", s.nodes[0].rows[0].id === r2.id);
const before = s;
s = W.hzOpMoveRow(s, nid, r2.id, -1);
check("맨 위 줄은 더 못 올림", s.nodes[0].rows[0].id === r2.id && JSON.stringify(s) === JSON.stringify(before));
s = W.hzOpAppendToRow(s, nid, r1.id, "causes", "펌프 정지");
s = W.hzOpAppendToRow(s, nid, r1.id, "causes", "펌프 정지");
check("제안 더하기는 한 번만", s.nodes[0].rows.find(r => r.id === r1.id).causes === "펌프 정지");
s = W.hzOpRemoveRow(s, nid, r1.id);
check("줄 지우기", s.nodes[0].rows.length === 2 && !s.nodes[0].rows.some(r => r.id === r1.id));
check("이탈번호 = 구간-순번", W.hzRowNo(s.nodes[0], 1) === "1-2");
let big = W.hzNewStudy();
for (let i = 0; i < W.HAZOP_MAX_NODES + 5; i++) big = W.hzOpAddNode(big);
check(`검토구간은 ${W.HAZOP_MAX_NODES}개까지`, big.nodes.length === W.HAZOP_MAX_NODES);
check("새 구간 번호 = 가장 큰 번호 + 1", W.hzOpAddNode(W.hzNewStudy()).nodes[1].no === "2");
check("마지막 구간을 지우면 빈 구간 하나", W.hzOpRemoveNode(W.hzNewStudy(), W.hzNewStudy().nodes[0].id).nodes.length === 1);

console.log(`\n${pass}/${pass + fail} PASS`);
process.exit(fail ? 1 : 0);
