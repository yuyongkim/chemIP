// EU REACH 등록 항목 — 정리(reach_format.jsx)·국가별 규제에 넣기(intl_reach.jsx)·API 층(api_reach.jsx)·정적 조각 합치기(api_static_intl.jsx) 시험.
//   1) 톤수 구간 → "연 1천만~1억 t" / "10,000,000–100,000,000 t per year", 모르는 글은 그대로
//   2) 항목 줄: EC·활성 등록 n건 (정식 n · 중간체 n)·톤수(원문 함께)·최초 등록일·최근 갱신일
//   3) intlWithReach: 확인 중·미등록·조회 불가는 상태 항목(건수에 안 셈), 등록이면 facts 가 붙은 항목(건수에 셈)
//   4) 내보낸 파일(E:\dev-cache\chemip-static\out)로: 묶어 둔 250종은 정적 답(bundled), 그 밖은 /api/reach — 서버가 없으면 unknown
//   5) 정적 named_lists 순서·구조 칸, 목록 머리 합치기 순서
//
//   node frontend/scripts/tests/test_reach_format.cjs
"use strict";

const fs = require("fs");
const path = require("path");
const { loadStaticModules } = require("./static_vm_loader.cjs");

const OUT = "E:\\dev-cache\\chemip-static\\out";
let failed = 0;
function check(name, ok, info = "") {
  if (!ok) failed += 1;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok || !info ? "" : `  — ${info}`}`);
}

(async () => {
  const { win } = loadStaticModules({
    diskRoot: OUT, layout: "contract",
    extraModules: ["api_core.jsx", "reach_labels.jsx", "reach_labels_en.jsx", "reach_format.jsx", "intl_reach.jsx", "api_reach.jsx"],
  });
  const KO = win.REACH_LABELS_KO;
  const EN = win.langMerge(win.REACH_LABELS_KO, win.REACH_LABELS_EN);

  // 1) tonnage bands as ECHA prints them (EU_REACH_REGISTERED.json, 2026-11-01)
  const ko = b => win.reachTonnage(b, KO, "ko");
  const en = b => win.reachTonnage(b, EN, "en");
  check("10,000,000 - 100,000,000 tonnes → 연 1천만~1억 t [calc]", ko("10,000,000 - 100,000,000 tonnes") === "연 1천만~1억 t", ko("10,000,000 - 100,000,000 tonnes"));
  check("1,000,000 - 10,000,000 → 연 100만~1천만 t", ko("1,000,000 - 10,000,000 tonnes") === "연 100만~1천만 t", ko("1,000,000 - 10,000,000 tonnes"));
  check("100,000 - 1,000,000 → 연 10만~100만 t", ko("100,000 - 1,000,000 tonnes") === "연 10만~100만 t");
  check("1,000 - 10,000 → 연 1천~1만 t", ko("1,000 - 10,000 tonnes") === "연 1천~1만 t");
  check("1 - 10 → 연 1~10 t", ko("1 - 10 tonnes") === "연 1~10 t");
  check("English keeps ECHA's numbers", en("10,000,000 - 100,000,000 tonnes") === "10,000,000–100,000,000 t per year", en("10,000,000 - 100,000,000 tonnes"));
  check("Intermediate use only → 중간체 용도만", ko("Intermediate use only") === "중간체 용도만" && en("Intermediate use only") === "Intermediate use only");
  check("an unknown band is shown as printed", ko("Something new") === "Something new");

  // 2) rows of acetone (bundled entry, ECHA CHEM 2026-11-01)
  const acetone = { ec: "200-662-2", tonnage_band: "1,000,000 - 10,000,000 tonnes", active_registrations: 113,
    registration_types: { "full registration (Art. 10)": 109, "transported isolated intermediate (Art. 18)": 4 }, nons: 0,
    first_registered: "2010-08-26", last_updated: "2026-10-09", url: "https://chem.echa.europa.eu/100.000.602" };
  const facts = win.reachFacts(acetone);
  check("facts: full 109, intermediate 4 (on-site 0, transported 4)", facts.full === 109 && facts.intermediate === 4 && facts.onsite === 0 && facts.transported === 4);
  const rows = win.reachRows(facts, KO, "ko");
  const byKey = Object.fromEntries(rows.map(r => [r.key, r]));
  check("rows: EC 번호, 활성 등록, 톤수 구간, 최초 등록일, 최근 갱신일 (no NONS row when 0)", rows.map(r => r.key).join(",") === "ec,active,tonnage,first,last", rows.map(r => r.key).join(","));
  check("활성 등록 113건 (정식 109 · 중간체 4)", byKey.active.value === "113건 (정식 109 · 중간체 4)" && byKey.active.sub === "현장 분리 0 · 운송 분리 4", JSON.stringify(byKey.active));
  check("톤수 구간 shows ECHA's original text too", byKey.tonnage.value === "연 100만~1천만 t" && byKey.tonnage.sub === "ECHA 원문: 1,000,000 - 10,000,000 tonnes");
  check("dates unchanged", byKey.first.value === "2010-08-26" && byKey.last.value === "2026-10-09");
  const enRows = win.reachRows(facts, EN, "en");
  check("English rows", enRows.find(r => r.key === "active").value === "113 (full 109 · intermediate 4)" && enRows[0].label === "EC number");
  check("English tonnage = ECHA's text as printed, no extra line", enRows.find(r => r.key === "tonnage").value === "1,000,000 - 10,000,000 tonnes" && !enRows.find(r => r.key === "tonnage").sub);
  check("no Hangul in English rows", !/[\uac00-\ud7a3]/.test(JSON.stringify(enRows.map(r => [r.label, r.value, r.sub]))));

  // 3) intlWithReach
  const data = { cas_no: "1634-04-4", count: 2, named: 1, thresholds: [], jurisdictions: { US: [{ regulation: "TSCA" }, { regulation: "X" }] } };
  const ent = { cas: "1634-04-4", name: "tert-butyl methyl ether", detail: "EC 216-653-1; REACH registered — …", ...acetone, ec: "216-653-1" };
  const reg = win.intlWithReach(data, { loading: false, error: null, data: { status: "registered", entry: ent, checked: "2026-11-01", cas: "1634-04-4" } }, KO);
  const item = reg.jurisdictions.EU[0];
  check("registered → EU item with facts, counted", item.regulation === "EU_REACH_REGISTERED" && item.facts.ec === "216-653-1" && reg.count === 3 && !item.status_only && item.list === KO.listTitle);
  const chk = win.intlWithReach(data, { loading: true }, KO);
  check("checking → status-only EU item, not counted", chk.jurisdictions.EU[0].reach_state === "checking" && chk.jurisdictions.EU[0].status_only && chk.count === 2
    && win.intlListingCount(chk.jurisdictions.EU) === 0);
  const none = win.intlWithReach(data, { loading: false, data: { status: "not_registered", checked: "2026-11-01" } }, KO);
  check("not registered → state none with the check date", none.jurisdictions.EU[0].reach_state === "none" && none.jurisdictions.EU[0].checked === "2026-11-01");
  check("ECHA 등록 기록 없음 (조회 시점 …)", KO.none("2026-11-01") === "ECHA 등록 기록 없음 (조회 시점 2026-11-01)");
  const down = win.intlWithReach(data, { loading: false, error: "지금 연결할 수 없습니다", data: null }, KO);
  check("request failed → unknown", down.jurisdictions.EU[0].reach_state === "unknown");
  const amb = win.intlWithReach(data, { loading: false, data: { status: "unknown", reason: "ambiguous: 2 rmlCas / 2 casNumber hits" } }, KO);
  check("ambiguous ECHA match → its own state", amb.jurisdictions.EU[0].reach_state === "ambiguous");
  check("nothing listed anywhere + not registered → no EU box made", win.intlWithReach({ jurisdictions: {} }, { loading: false, data: { status: "not_registered" } }, KO).jurisdictions.EU === undefined);
  const have = { ...data, jurisdictions: { ...data.jurisdictions, EU: [{ regulation: "EU_REACH_REGISTERED", facts: {} }] } };
  check("bundled REACH item present → unchanged", win.intlHasReach(have) && win.intlWithReach(have, { loading: true }, KO) === have);
  const entry = win.reachEntryOf({ loading: false, data: { status: "registered", entry: ent, checked: "2026-11-01", echa_url: ent.url } });
  check("reachEntryOf → ReachEntry props", entry.reachState === "registered" && entry.facts.active_registrations === 113 && entry.onDemand === true);

  // 4) API layer with the exported files (PC off: no /api here)
  if (!fs.existsSync(path.join(OUT, "v1", "g", "intl_add.json"))) {
    console.log("skip  exported-file checks (no g/intl_add.json)");
  } else {
    const b = await win.fetchReachRegistration("67-64-1");
    check("bundled CAS (acetone) → static answer, no /api", b && b.bundled === true && b.status === "registered" && b.entry.ec === "200-662-2"
      && b.attribution === "Source: European Chemicals Agency, https://echa.europa.eu/", JSON.stringify(b).slice(0, 200));
    const o = await win.fetchReachRegistration("1634-04-4");
    check("other CAS with no /api server → status unknown (graceful)", o && o.status === "unknown" && o.registered === null, JSON.stringify(o));

    // 5) static named_lists = backend intl_named_lists.py shape, file-name order, structured REACH fields
    const intl = await win.staticIntl("71-43-2");
    const ids = (intl.named_lists || []).map(m => m.list_id);
    const sorted = [...ids].sort();
    check("staticIntl named_lists in file-name order and include the added lists", ids.join() === sorted.join() && ids.includes("EU_REACH_REGISTERED") && ids.includes("EU_DWD_ANNEX_I_PART_B"), ids.join(","));
    const r = intl.named_lists.find(m => m.list_id === "EU_REACH_REGISTERED");
    check("REACH named list keeps ECHA fields (ec, tonnage_band, registration_types, url)", r && r.entries[0].ec === "200-753-7" && r.entries[0].url && r.entries[0].registration_types && r.title.includes("REACH"));
    check("named list title no longer says 대표 물질 조회분", r && !/대표 물질/.test(r.title), r && r.title);
    check("staticIntl merges intl_reg_add codes (US DOT HMT for benzene)", (intl.jurisdictions.US || []).some(x => x.regulation === "US_DOT_HMT"));
  }
  const meta = win.staticIntlMetaWithAdded([{ list_id: "A", file: "intl_lists/A.json" }, { list_id: "C", file: "intl_lists/C.json" }],
    [{ list_id: "B" }, { list_id: "A", title: "dup" }]);
  check("added list heads are inserted in file-name order, rulebook copy wins", meta.map(m => m.list_id).join() === "A,B,C" && meta[0].title === undefined && meta[1].file === "intl_lists/B.json");

  if (failed) { console.log(`${failed} failed`); process.exit(1); }
  console.log("all passed");
})().catch(e => { console.error(e); process.exit(1); });
