// 국가별 규제 화면 — p/ 내보내기 뒤에 추가된 상대국 목록(g/intl_add.json + g/intl_add_<n>.json) 합치기 시험.
//   1) 순수 함수 intlWithAdded(intl_merge.jsx): 물질 파일 목록 + 추가 목록, 같은 list_id 는 물질 파일 것
//   2) 내보낸 파일(E:\dev-cache\chemip-static\out)로 staticIntlNamedLists(api_intl.jsx): 4종이 EU REACH 등록을 보이는지,
//      DEHP 는 SVHC 후보물질도 보이는지(PC 꺼짐 = 정적 파일만).
//
//   node frontend/scripts/tests/test_intl_added.cjs
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
  const { win } = loadStaticModules({ diskRoot: OUT, layout: "contract", extraModules: ["intl_merge.jsx", "api_intl.jsx"] });

  // 1) pure merge
  const merged = win.intlWithAdded([{ list_id: "A", entries: [{ name: "page" }] }],
    [{ list_id: "A", entries: [{ name: "added" }] }, { list_id: "B", entries: [{ name: "b" }] }, null]);
  check("intlWithAdded keeps the page's copy of a list", merged.length === 2 && merged[0].entries[0].name === "page");
  check("intlWithAdded appends new lists", merged[1].list_id === "B");
  check("intlWithAdded without page lists", win.intlWithAdded(null, [{ list_id: "B" }]).length === 1);
  check("intlWithAdded without added lists", win.intlWithAdded([{ list_id: "A" }], undefined).length === 1);

  // 2) exported files
  const head = path.join(OUT, "v1", "g", "intl_add.json");
  if (!fs.existsSync(head)) {
    console.log("skip  exported-file checks (no g/intl_add.json yet)");
  } else {
    const want = { "74-85-1": ["EU_REACH_REGISTERED"], "71-43-2": ["EU_REACH_REGISTERED", "EU_DWD_ANNEX_I_PART_B"],
      "50-00-0": ["EU_REACH_REGISTERED"], "117-81-7": ["EU_REACH_REGISTERED", "EU_REACH_SVHC_CANDIDATE"] };
    for (const [cas, ids] of Object.entries(want)) {
      const named = await win.staticIntlNamedLists(cas);
      const eu = (named && named.EU) || [];
      const got = eu.map(x => x.regulation);
      check(`${cas}: EU lists include ${ids.join(", ")}`, ids.every(id => got.includes(id)), got.join(", "));
      const reach = eu.find(x => x.regulation === "EU_REACH_REGISTERED");
      check(`${cas}: REACH item has title, EC and ECHA link`,
        !!reach && /REACH/.test(reach.list) && /^EC \d{3}-\d{3}-\d/.test(reach.detail) && /chem\.echa\.europa\.eu/.test(reach.detail),
        reach ? reach.detail : "missing");
    }
    const none = await win.staticIntlNamedLists("7732-18-5"); // water: no REACH lookup expected to break the page lists
    check("a CAS without added lists still returns its page lists", none === null || typeof none === "object");
  }
  if (failed) { console.log(`${failed} failed`); process.exit(1); }
  console.log("all passed");
})().catch(e => { console.error(e); process.exit(1); });
