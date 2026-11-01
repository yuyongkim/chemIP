// Request budget of one substance page on a static deployment with the home PC unreachable (Playwright).
// Serves public/chemip (assets) with the chosen bundle (dist/index.html + dist/app.js) and the exporter output
// (E:/dev-cache/chemip-static/out, v1/p and v1/g gzip) as window.CHEMIP_STATIC. Every /api/** request is answered
// like the Worker does with the PC off (503 {"error":"offline"}), so the page behaves as on chemip-test today.
//
//   set NODE_PATH=G:\MSDS\frontend\node_modules
//   node frontend/scripts/tests/browser_request_budget.cjs [--dist DIR] [--data DIR] [--chem 001008] [--out FILE]
//
// --dist  bundle folder holding app.js (default public/chemip/dist = the build before a change;
//         a fresh build: node frontend/scripts/build_chemip.cjs --out E:\dev-cache\chemip-agent-build)
// Flow: open the substance page → MSDS → 규제·인허가/수출입 (import, US, export, export+US, export+CN) → every other
// tab → scroll to the bottom panels. Prints /api requests grouped by endpoint, static requests and time to MSDS.
"use strict";

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { chromium } = require("playwright");

function arg(name, dflt) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : dflt;
}
const CHEMIP = path.join(__dirname, "..", "..", "public", "chemip");
const DIST = path.resolve(arg("--dist", path.join(CHEMIP, "dist")));
const DATA = arg("--data", "E:/dev-cache/chemip-static/out");
const CHEM = arg("--chem", "001008");
const OUT = arg("--out", "");
const TABS = ["해외 규제", "특허", "시장·뉴스", "안전 가이드", "AI 요약"];

function serve(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(__dirname, "static_serve.cjs"), ...args, "--port", "0"]);
    child.stdout.on("data", d => {
      const m = String(d).match(/http:\/\/127\.0\.0\.1:(\d+)/);
      if (m) resolve({ child, port: Number(m[1]) });
    });
    child.on("error", reject);
    child.on("exit", code => reject(new Error(`server exited ${code}`)));
  });
}

// /api/regulations/trade-controls/71-43-2?direction=… → "regulations/trade-controls"
function endpointGroup(url) {
  const p = new URL(url).pathname.replace(/^\/api\//, "").split("/");
  const fixed = { regulations: 2, integrations: 2, guides: 2, chemicals: 1, handlers: 1, patents: 1, trade: 2, drugs: 2, ai: 2, usage: 2, feedback: 1 };
  return p.slice(0, fixed[p[0]] || 1).join("/");
}

async function main() {
  const app = await serve(["--root", CHEMIP, "--prefix", "/chemip"]);
  const data = await serve(["--root", DATA, "--cors"]);
  const APP = `http://127.0.0.1:${app.port}`;
  const api = [];
  const statics = [];
  const browser = await chromium.launch();
  const jsErrors = [];
  let msdsMs = 0;
  try {
    const context = await browser.newContext({ viewport: { width: 1360, height: 900 }, locale: "ko-KR" });
    await context.addInitScript(base => { window.CHEMIP_STATIC = { base, searchBase: base, version: "v1" }; }, `http://127.0.0.1:${data.port}`);
    // The page is public/chemip/dist/index.html; only its bundle (dist/app.js?v=…) is swapped for DIST/app.js.
    // (Fulfilling the document itself from a route made the cross-origin data fetches fail in Chromium.)
    await context.route(/\/chemip\/dist\/app\.js/, route => route.fulfill({
      status: 200, contentType: "text/javascript; charset=utf-8", body: fs.readFileSync(path.join(DIST, "app.js")),
    }));
    await context.route("**/api/**", route => {
      api.push(route.request().url());
      return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "offline", message: "PC off" }) });
    });
    context.on("request", r => { if (r.url().includes(`:${data.port}/`)) statics.push(r.url()); });
    const page = await context.newPage();
    page.on("pageerror", e => jsErrors.push(String(e.message || e)));

    const t0 = Date.now();
    await page.goto(`${APP}/chemip/dist/index.html?view=product&pv=chemical&chem=${CHEM}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => /\d+\/16/.test(document.querySelector(".tabs")?.innerText || ""), null, { timeout: 60000 }).catch(() => {});
    msdsMs = Date.now() - t0;
    if (!(await page.locator(".tabs button").count())) throw new Error(`substance page did not open: ${(await page.locator("body").innerText()).slice(0, 300)}`);
    await page.waitForTimeout(1500);

    await page.getByRole("button", { name: /규제·인허가 \/ 수출입/ }).click();
    await page.locator(".tc-body").waitFor({ timeout: 60000 }).catch(() => {});
    await page.locator("select.tc-select").selectOption("US");
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: /^수출/ }).first().click();
    await page.waitForTimeout(2500);
    await page.locator("select.tc-select").selectOption("CN");
    await page.waitForTimeout(2000);
    for (const label of TABS) {
      const tab = page.locator(".tabs button").filter({ hasText: label });
      if (await tab.count()) { await tab.first().click(); await page.waitForTimeout(2500); }
    }
    await page.locator(".tabs button").first().click();
    for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, 20000); await page.waitForTimeout(2000); }
  } finally {
    await browser.close();
    app.child.kill();
    data.child.kill();
  }
  const groups = {};
  for (const u of api) groups[endpointGroup(u)] = (groups[endpointGroup(u)] || 0) + 1;
  const sorted = Object.entries(groups).sort((a, b) => b[1] - a[1]);
  const report = { dist: DIST, chem: CHEM, apiTotal: api.length, apiByEndpoint: Object.fromEntries(sorted), staticTotal: statics.length, msdsMs, jsErrors };
  console.log(`bundle: ${DIST}\nsubstance: ${CHEM}\ntime to MSDS tab: ${msdsMs} ms\n/api requests: ${api.length}`);
  for (const [k, v] of sorted) console.log(`  ${String(v).padStart(4)}  ${k}`);
  console.log(`static data requests: ${statics.length}\nJS errors: ${jsErrors.length}`);
  if (OUT) { fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify({ ...report, api, statics }, null, 1)); }
  process.exitCode = jsErrors.length ? 1 : 0;
}

main().catch(e => { console.error(e); process.exitCode = 2; });
