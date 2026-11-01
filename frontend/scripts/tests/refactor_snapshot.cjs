// Refactor regression snapshot: serves a chemip folder (source index.html, babel in the browser) from an in-process
// static server, proxies /api/* to the production backend (gentle: ≤3 request starts per second, read-through disk
// cache so a second run replays the exact same responses), and records per view: full-page screenshot, visible text
// (document.body.innerText) and console/page errors. Views × viewports (1440, 390) × themes (light, dark).
//
//   set NODE_PATH=G:\MSDS\frontend\node_modules
//   node frontend/scripts/tests/refactor_snapshot.cjs --root E:/dev-cache/chemip-refactor/before --out E:/dev-cache/chemip-refactor/shots/before
//   node frontend/scripts/tests/refactor_snapshot.cjs --root G:/MSDS/frontend/public/chemip     --out E:/dev-cache/chemip-refactor/shots/after
//   node frontend/scripts/tests/refactor_diff.cjs --a E:/dev-cache/chemip-refactor/shots/before --b E:/dev-cache/chemip-refactor/shots/after
//
// Does not touch Next, dist/ or any service. Output and the API cache live under E:\dev-cache (never C:).
"use strict";

const fs = require("fs");
const path = require("path");
const http = require("http");
const crypto = require("crypto");
const { chromium } = require("playwright");

function arg(name, dflt) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : dflt;
}
const ROOT = path.resolve(arg("--root", path.join(__dirname, "..", "..", "public", "chemip")));
const OUT = path.resolve(arg("--out", "E:/dev-cache/chemip-refactor/shots/run"));
const CACHE = path.resolve(arg("--cache", "E:/dev-cache/chemip-refactor/api-cache"));
const BACKEND = arg("--backend", "http://127.0.0.1:7011");
const CHEM = arg("--chem", "001008");
const ONLY = arg("--only", ""); // comma list of view keys
const PER_SECOND = 3;

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".jsx": "text/babel; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".png": "image/png",
  ".svg": "image/svg+xml", ".csv": "text/csv; charset=utf-8",
};

/* ── /api proxy: rate limit + read-through cache ── */
let lastStart = 0;
const stats = { live: 0, cached: 0 };
function rateSlot() {
  const gap = 1000 / PER_SECOND;
  const at = Math.max(Date.now(), lastStart + gap);
  lastStart = at;
  return new Promise(r => setTimeout(r, at - Date.now()));
}
function liveRequest(method, url, headers, body) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const req = http.request(u, { method, headers, timeout: 120000 }, res => {
      const chunks = [];
      res.on("data", c => chunks.push(c));
      res.on("end", () => resolve({ status: res.statusCode, type: res.headers["content-type"] || "", body: Buffer.concat(chunks) }));
    });
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", e => resolve({ status: 502, type: "text/plain", body: Buffer.from(String(e.message)) }));
    if (body && body.length) req.write(body);
    req.end();
  });
}
async function proxy(req, res, body) {
  const key = crypto.createHash("sha1").update(`${req.method} ${req.url} ${body.toString("utf8")}`).digest("hex");
  const file = path.join(CACHE, `${key}.json`);
  let hit = null;
  if (fs.existsSync(file)) hit = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!hit) {
    if (req.method !== "GET" && !/^\/api\/ai\/analyze/.test(req.url)) { res.writeHead(405); res.end("blocked"); return; }
    await rateSlot();
    stats.live += 1;
    const headers = { "User-Agent": "chemip-refactor-snapshot-bot/1" };
    if (req.headers["content-type"]) headers["Content-Type"] = req.headers["content-type"];
    const r = await liveRequest(req.method, `${BACKEND}${req.url}`, headers, body);
    hit = { url: req.url, method: req.method, status: r.status, type: r.type, body: r.body.toString("base64") };
    if (r.status < 500) fs.writeFileSync(file, JSON.stringify(hit));
  } else stats.cached += 1;
  res.writeHead(hit.status, { "Content-Type": hit.type || "application/json", "Cache-Control": "no-store" });
  res.end(Buffer.from(hit.body, "base64"));
}

function startServer() {
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on("data", c => chunks.push(c));
    req.on("end", () => {
      const body = Buffer.concat(chunks);
      const url = new URL(req.url, "http://x");
      if (url.pathname.startsWith("/api/")) { proxy(req, res, body).catch(e => { res.writeHead(500); res.end(String(e)); }); return; }
      if (!url.pathname.startsWith("/chemip/")) { res.writeHead(404); res.end(); return; }
      const rel = decodeURIComponent(url.pathname.slice("/chemip/".length)) || "index.html";
      const target = path.join(ROOT, path.normalize(rel));
      if (!target.startsWith(ROOT) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) { res.writeHead(404); res.end("not found"); return; }
      res.writeHead(200, { "Content-Type": TYPES[path.extname(target)] || "application/octet-stream", "Cache-Control": "no-store" });
      res.end(fs.readFileSync(target));
    });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}

/* ── page helpers ── */
function tracker(page) {
  const pending = new Set();
  let lastChange = Date.now();
  const on = r => { if (r.url().includes("/api/")) { pending.add(r); lastChange = Date.now(); } };
  const off = r => { if (pending.delete(r)) lastChange = Date.now(); };
  page.on("request", on);
  page.on("requestfinished", off);
  page.on("requestfailed", off);
  return async function idle(quietMs = 1200, maxMs = 120000) {
    const t0 = Date.now();
    await page.waitForTimeout(300);
    while (Date.now() - t0 < maxMs) {
      if (pending.size === 0 && Date.now() - lastChange >= quietMs) return true;
      await page.waitForTimeout(200);
    }
    return false;
  };
}

async function scrollAll(page, idle) {
  for (let i = 0; i < 12; i++) {
    const done = await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
      return window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
    });
    await page.waitForTimeout(250);
    if (done) { await idle(); const still = await page.evaluate(() => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2); if (still) break; }
  }
  await idle();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(CACHE, { recursive: true });
  const server = await startServer();
  const BASE = `http://127.0.0.1:${server.address().port}/chemip/index.html`;
  const browser = await chromium.launch();
  const manifest = [];
  const only = ONLY ? new Set(ONLY.split(",")) : null;
  try {
    for (const [vw, vh] of [[1440, 900], [390, 844]]) {
      for (const theme of ["light", "dark"]) {
        const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, locale: "ko-KR", timezoneId: "Asia/Seoul" });
        await ctx.addInitScript(t => {
          try { if (!sessionStorage.getItem("__snap_init")) { localStorage.clear(); localStorage.setItem("chemip-tweaks", JSON.stringify({ theme: t })); sessionStorage.setItem("__snap_init", "1"); } } catch (e) {}
        }, theme);
        // 외부 글꼴 CDN 은 막지 않는다(실제 화면과 같게). 대신 document.fonts.ready 를 기다린다.
        const page = await ctx.newPage();
        const idle = tracker(page);
        let errors = [];
        page.on("pageerror", e => errors.push(`pageerror: ${e.message || e}`));
        page.on("console", m => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });

        const snap = async (key) => {
          if (only && !only.has(key)) return;
          await page.evaluate(() => document.fonts && document.fonts.ready);
          await page.waitForTimeout(400);
          const id = `${key}__${vw}_${theme}`;
          const text = await page.evaluate(() => document.body.innerText);
          await page.screenshot({ path: path.join(OUT, `${id}.png`), fullPage: true });
          fs.writeFileSync(path.join(OUT, `${id}.txt`), text);
          manifest.push({ id, key, vw, theme, errors });
          console.log(`${id}  text ${text.length}  errors ${errors.length}`);
          errors = [];
        };
        const go = async (qs) => {
          await page.goto(`${BASE}${qs}`, { waitUntil: "domcontentloaded" });
          await page.waitForSelector("header.topbar", { timeout: 60000 });
          await idle();
        };
        const tab = async (label) => {
          await page.locator(".tabs button").filter({ hasText: label }).first().click();
          await idle(1500);
        };

        await go("?view=landing"); await snap("landing");
        // 검색어 없는 검색 화면(안내 카드) — localStorage 에 검색어가 남기 전에 찍는다
        await go("?view=product&pv=search"); await snap("search_empty");
        await go(`?q=${encodeURIComponent("벤젠")}`);
        await page.locator("tr[tabindex='0']").first().waitFor({ timeout: 60000 }).catch(() => {});
        await idle(); await snap("search_benzene");

        await go(`?view=product&pv=chemical&chem=${CHEM}`);
        await scrollAll(page, idle);
        await snap("chem_msds");
        await tab("규제·인허가 / 수출입"); await page.locator(".tc-body").waitFor({ timeout: 60000 }).catch(() => {}); await idle(); await snap("chem_trade_import");
        await page.locator("select.tc-select").selectOption("US"); await idle(1500); await snap("chem_trade_import_US");
        await page.getByRole("button", { name: /^수출/ }).first().click(); await idle(1500); await snap("chem_trade_export_US");
        await tab("해외 규제"); await snap("chem_regulation");
        await tab("특허"); await snap("chem_patents");
        await tab("시장·뉴스"); await snap("chem_market");
        await tab("안전 가이드"); await snap("chem_guides");
        await tab("AI 요약"); await idle(1500, 120000); await snap("chem_ai");
        // 해외 규제 탭에서 규제 정보 요청이 실패한 경우(서버 끊김 503 → API_LABELS.offline)
        await page.route("**/api/regulations/intelligence/**", r => r.fulfill({ status: 503, body: "offline" }));
        await tab("특허"); await tab("해외 규제"); await snap("chem_regulation_offline");
        await page.unroute("**/api/regulations/intelligence/**");

        // 왼쪽 메뉴의 보조 화면(고른 물질 = 위에서 연 물질)
        for (const pv of ["patents", "trade", "drugs", "guides"]) { await go(`?view=product&pv=${pv}`); await snap(`pv_${pv}`); }

        await go("?view=board"); await snap("board");
        await go("?view=sources"); await snap("sources");
        await go("?view=research"); await snap("research");
        await go("?view=dev"); await snap("dev");
        // 개발자용 소개 펼침. 콘솔 예시 질의가 2.2초마다 바뀌므로 첫 질의("아세톤")일 때 찍는다.
        await page.getByRole("button", { name: /펼치기/ }).first().click().catch(() => {});
        const consoleHas = (want) => page.waitForFunction(w => /"아세톤"/.test(document.querySelector(".query-console")?.innerText || "") === w, want, { timeout: 10000, polling: 50 }).catch(() => {});
        await consoleHas(false); await consoleHas(true);
        await snap("dev_overview");
        await go("?view=benchmark"); await snap("benchmark");
        await page.locator(".bench-tabs button").nth(1).click(); await idle(); await page.waitForTimeout(500); await snap("benchmark_explore");
        await page.locator(".bench-tabs button").nth(2).click(); await idle(); await page.waitForTimeout(800); await snap("benchmark_label");
        await page.locator(".bench-tabs button").nth(0).click(); await page.waitForTimeout(300);
        await ctx.close();
      }
    }
  } finally {
    await browser.close();
    server.close();
  }
  fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify({ root: ROOT, chem: CHEM, stats, views: manifest }, null, 1));
  console.log(`\n${manifest.length} snapshots → ${OUT}  (api live ${stats.live}, cached ${stats.cached})`);
}

main().catch(e => { console.error(e); process.exitCode = 2; });
