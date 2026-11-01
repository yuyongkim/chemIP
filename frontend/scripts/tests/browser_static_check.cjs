// Browser check of the "home PC off" mode: the SOURCE index.html (babel in the browser) served by static_serve.cjs,
// window.CHEMIP_STATIC pointing at a second static server (pilot out/, CORS), and every /api/** request aborted.
//
//   set NODE_PATH=G:\MSDS\frontend\node_modules
//   node frontend/scripts/tests/browser_static_check.cjs [--layout pilot|contract] [--data DIR] [--out DIR] [--chem 001008]
//
// Starts both servers itself (free ports), stops them at the end (only its own child processes).
"use strict";

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { chromium } = require("playwright");

function arg(name, dflt) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : dflt;
}
const LAYOUT = arg("--layout", "pilot"); // pilot: pilot out/ under the contract paths (shim); contract: exporter output
const DATA = arg("--data", LAYOUT === "pilot" ? "E:/dev-cache/chemip-static-pilot/out" : "E:/dev-cache/chemip-static/out");
const OUT = arg("--out", "E:/dev-cache/chemip-static-frontend-tests/screens");
const CHEM = arg("--chem", "001008"); // 벤젠 (71-43-2), in the pilot sample
const CHEMIP = path.join(__dirname, "..", "..", "public", "chemip");
const OFFLINE_TEXT = "지금 연결할 수 없습니다";       // API_LABELS.offline (Worker routes: news, KOTRA, AI)
const LIVE_ONLY_TEXT = "실시간 조회 자료라";             // API_LABELS.liveOnly (home-PC-only routes, api_origin.jsx)
// home-PC-only /api routes (everything the Worker does not answer itself); at most the one probe may be sent
const PC_ONLY_RE = /\/api\/(chemicals|regulations\/(trade-controls|international|intelligence)|integrations|guides|handlers)\b/;

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

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const app = await serve(["--root", CHEMIP, "--prefix", "/chemip"]);
  const data = await serve(["--root", DATA, "--cors", ...(LAYOUT === "pilot" ? ["--pilot-shim"] : [])]);
  const APP = `http://127.0.0.1:${app.port}/chemip/index.html`;
  const results = [];
  const check = (name, ok, note = "") => { results.push({ name, ok: Boolean(ok), note }); console.log(`${ok ? "PASS" : "FAIL"} ${name}${note ? ` — ${note}` : ""}`); };
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1360, height: 900 }, locale: "ko-KR" });
    await context.addInitScript(([base, version]) => { window.CHEMIP_STATIC = { base, version }; },
      [`http://127.0.0.1:${data.port}`, LAYOUT === "pilot" ? "" : "v1"]);
    const apiCalls = [];
    const staticCalls = [];
    await context.route("**/api/**", route => { apiCalls.push(route.request().url()); return route.abort("connectionrefused"); });
    context.on("request", r => { if (r.url().includes(`:${data.port}/`)) staticCalls.push(r.url()); });
    const page = await context.newPage();
    const jsErrors = [];
    const consoleErrors = [];
    page.on("pageerror", e => jsErrors.push(String(e.message || e)));
    page.on("console", m => { if (m.type() === "error") consoleErrors.push(m.text()); });
    const shot = async name => { const p = path.join(OUT, `${name}.png`); await page.screenshot({ path: p, fullPage: false }); return p; };
    const body = () => page.locator("body").innerText();

    // 1) search
    for (const [i, q] of ["벤젠", "toluene", "67-64-1"].entries()) {
      await page.goto(`${APP}?q=${encodeURIComponent(q)}`, { waitUntil: "domcontentloaded" });
      const rows = page.locator("tr[tabindex='0']");
      await rows.first().waitFor({ timeout: 60000 }).catch(() => {});
      const n = await rows.count();
      const text = await body();
      check(`search "${q}" shows results`, n > 0 && !text.includes(OFFLINE_TEXT), `${n} rows`);
      await shot(`0${i + 1}_search_${q.replace(/[^\w-]/g, "") || "benzene"}`);
    }

    // 2) substance page: MSDS
    await page.goto(`${APP}?view=product&pv=chemical&chem=${CHEM}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => /MSDS/.test(document.body.innerText) && !/…/.test(document.querySelector(".tabs")?.innerText || "…"), null, { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const msdsText = await body();
    const msdsTab = await page.locator(".tabs button").first().innerText();
    check("substance MSDS renders from static detail", /Benzene/.test(msdsText) && /16\/16/.test(msdsTab), `${CHEM}, tab "${msdsTab.replace(/\s+/g, " ")}"`);
    await shot("04_substance_msds");

    // 3) 규제·인허가 / 수출입 tab, then country + direction switch
    await page.getByRole("button", { name: /규제·인허가 \/ 수출입/ }).click();
    await page.locator(".tc-body").waitFor({ timeout: 60000 }).catch(() => {});
    check("trade tab renders (import, no country)", await page.locator(".tc-body").count() > 0);
    await shot("05_trade_import");
    await page.locator("select.tc-select").selectOption("US");
    await page.waitForTimeout(1500);
    const usText = await body();
    check("trade tab country switch → US", (await page.locator(".tc-body").count()) > 0 && /미국|US/.test(usText));
    await shot("06_trade_import_US");
    await page.getByRole("button", { name: /^수출/ }).first().click();
    await page.waitForTimeout(2500);
    const exText = await body();
    check("trade tab export + US shows KOTRA offline notice", exText.includes("KOTRA 수입규제는 실시간 조회라"));
    await page.getByText("KOTRA 수입규제 품목").first().scrollIntoViewIfNeeded().catch(() => {});
    await shot("07_trade_export_US_kotra_offline");
    await page.locator("select.tc-select").selectOption("CN");
    await page.waitForTimeout(1500);
    check("trade tab country switch → CN", (await page.locator(".tc-body").count()) > 0);
    await shot("08_trade_export_CN");

    // 4) tabs: regulation (home-PC live data) → neutral live-only note; market (Worker routes, blocked here) →
    //    offline message; patents → either; guides → from static files (no offline / live-only note)
    const tabExpect = {
      regulation: t => t.includes(LIVE_ONLY_TEXT),
      patents: t => t.includes(OFFLINE_TEXT) || t.includes(LIVE_ONLY_TEXT),
      market: t => t.includes(OFFLINE_TEXT),
      guides: t => !t.includes(OFFLINE_TEXT) && !t.includes(LIVE_ONLY_TEXT) && /KOSHA 가이드|가이드/.test(t),
    };
    const liveTabs = [["regulation", "해외 규제"], ["patents", "특허"], ["market", "시장·뉴스"], ["guides", "안전 가이드"]];
    for (const [k, label] of liveTabs) {
      const tab = page.locator(".tabs button").filter({ hasText: label });
      if (!(await tab.count())) { check(`tab ${k} found`, false); continue; }
      await tab.first().click();
      await page.waitForTimeout(2500);
      check(`tab ${k} shows the expected state`, tabExpect[k](await body()));
      await shot(`09_tab_${k}`);
    }
    // AI tab: run is manual (button). Check the tab renders without crash.
    const aiTab = page.locator(".tabs button").filter({ hasText: "AI 요약" });
    if (await aiTab.count()) {
      await aiTab.first().click();
      await page.waitForTimeout(800);
      const btn = page.locator("button").filter({ hasText: /분석|실행|Run/ }).first();
      if (await btn.count()) { await btn.click().catch(() => {}); await page.waitForTimeout(2000); }
      check("AI tab shows offline message after run", (await body()).includes(OFFLINE_TEXT));
      await shot("10_tab_ai");
    }
    // lower panels (intl map from static; incidents/enforcement/handlers live-only)
    await page.locator(".tabs button").first().click();
    await page.mouse.wheel(0, 20000);
    await page.waitForTimeout(3000);
    await page.mouse.wheel(0, 20000);
    await page.waitForTimeout(2000);
    const lower = await body();
    check("lower panels (intl, incidents, enforcement, handlers) come from static files — no offline message",
      !lower.includes(OFFLINE_TEXT));
    await page.screenshot({ path: path.join(OUT, "11_lower_panels_full.png"), fullPage: true });

    const realConsole = consoleErrors.filter(t => !/Failed to load resource/.test(t) && !/ERR_CONNECTION_REFUSED|ERR_FAILED/.test(t));
    check("no uncaught JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
    check("no console errors other than blocked network requests", realConsole.length === 0, realConsole.slice(0, 3).join(" | "));
    const staticCapable = apiCalls.filter(u => /\/api\/(chemicals|regulations\/(trade-controls|international)\/|integrations\/(kr-permit-context|incidents|enforcement)|handlers|guides\/recommend)/.test(u));
    const pcOnly = apiCalls.filter(u => PC_ONLY_RE.test(u));
    check("home-PC-only /api requests: at most the one probe", pcOnly.length <= 1, `${pcOnly.length}: ${pcOnly.slice(0, 3).join(" ")}`);
    console.log(`\nstatic requests: ${staticCalls.length}, /api requests aborted: ${apiCalls.length} (static-capable endpoints among them: ${staticCapable.length})`);
    if (staticCapable.length) console.log(`  ${[...new Set(staticCapable)].slice(0, 10).join("\n  ")}`);
    fs.writeFileSync(path.join(OUT, "browser_check.json"), JSON.stringify({ results, jsErrors, consoleErrors, apiCalls, staticCount: staticCalls.length }, null, 1));
  } finally {
    await browser.close();
    app.child.kill();
    data.child.kill();
  }
  const failed = results.filter(r => !r.ok).length;
  console.log(`\n${results.length - failed} / ${results.length} checks passed. Screenshots: ${OUT}`);
  process.exitCode = failed ? 1 : 0;
}

main().catch(e => { console.error(e); process.exitCode = 2; });
