// 국가별 규제 화면 — p/ 내보내기 뒤에 적재한 국가별 규제 DB 코드(g/intl_reg_add.json + g/intl_reg_add_<n>.json) 합치기 시험.
//   1) 순수 함수 intlWithRegAdded(intl_reg_add.jsx): 응답 + 추가 항목, 같은 관할·같은 regulation 은 응답 것, 응답 없음도 처리
//   2) 내보낸 파일(E:\dev-cache\chemip-static\out)로 fetchIntlCombined(api_intl.jsx), PC 꺼짐(/api 실패):
//      에틸렌 DOT HMT UN1962·UN1038, 벤젠·암모니아·포름알데히드의 DOT·일본 목록이 보이는지.
//
//   node frontend/scripts/tests/test_intl_reg_add.cjs
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
  const { win } = loadStaticModules({ diskRoot: OUT, layout: "contract", extraModules: ["intl_merge.jsx", "intl_reg_add.jsx", "api_intl.jsx"] });
  win.staticFirst = async (s, l) => { try { const d = await s(); if (d != null) return d; } catch (e) { /* → live */ } return l(); };
  win.originGet = async () => { throw new Error("PC off"); };

  // 1) pure merge
  const intl = { cas_no: "1-1-1", count: 1, jurisdictions: { US: [{ regulation: "CERCLA", detail: "page" }] }, thresholds: [{ x: 1 }] };
  const added = { US: [{ regulation: "CERCLA", detail: "added" }, { regulation: "US_DOT_HMT", detail: "UN1" }], JP: [{ regulation: "JP_PRTR_CLASS1" }] };
  const m = win.intlWithRegAdded(intl, added);
  check("keeps the response's copy of a regulation", m.jurisdictions.US[0].detail === "page" && m.jurisdictions.US.length === 2);
  check("adds a new jurisdiction", m.jurisdictions.JP.length === 1 && m.count === 3);
  check("keeps thresholds and cas_no", m.thresholds.length === 1 && m.cas_no === "1-1-1");
  check("no added items -> same object", win.intlWithRegAdded(intl, null) === intl);
  const only = win.intlWithRegAdded(null, added);
  check("no response -> added items only", only.count === 3 && Object.keys(only.jurisdictions).length === 2);

  // 2) exported files, PC off
  const head = path.join(OUT, "v1", "g", "intl_reg_add.json");
  if (!fs.existsSync(head)) {
    console.log("skip  exported-file checks (no g/intl_reg_add.json yet)");
  } else {
    const want = {
      "74-85-1": { US: ["US_DOT_HMT"], JP: ["JP_ISHL_LABEL_SDS"], CA: ["CA_NPRI"] },
      "71-43-2": { US: ["US_DOT_HMT", "US_DOT_HMT_RQ"], JP: ["JP_PRTR_CLASS1", "JP_ISHL_LABEL_SDS", "JP_ISHL_TOKKA", "JP_CSCL_PRIORITY"], CA: ["CA_NPRI"] },
      "7664-41-7": { US: ["US_DOT_HMT", "US_DOT_HMT_RQ"], JP: ["JP_ISHL_LABEL_SDS", "JP_ISHL_TOKKA"] },
      "50-00-0": { US: ["US_DOT_HMT", "US_DOT_HMT_RQ"], JP: ["JP_PRTR_CLASS1", "JP_ISHL_LABEL_SDS", "JP_ISHL_TOKKA", "JP_CSCL_PRIORITY"], CA: ["CA_NPRI"] },
    };
    for (const [cas, byJ] of Object.entries(want)) {
      const got = await win.fetchIntlCombined(cas);
      for (const [j, ids] of Object.entries(byJ)) {
        const regs = ((got && got.jurisdictions[j]) || []).map(x => x.regulation);
        check(`${cas} ${j}: ${ids.join(", ")}`, ids.every(id => regs.includes(id)), regs.join(", "));
      }
    }
    const eth = await win.fetchIntlCombined("74-85-1");
    const hmt = (eth.jurisdictions.US || []).find(x => x.regulation === "US_DOT_HMT");
    const text = hmt ? JSON.stringify(hmt) : "";
    check("ethylene DOT HMT shows UN1962 and UN1038", /UN1962/.test(text) && /UN1038/.test(text), text.slice(0, 300));
    check("every DOT detail names its match method", /match: /.test(text));
  }
  if (failed) { console.log(`${failed} failed`); process.exit(1); }
  console.log("all passed");
})().catch(e => { console.error(e); process.exit(1); });
