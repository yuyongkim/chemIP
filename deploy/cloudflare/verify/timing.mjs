// Load-time comparison: each TIMING flow on each base URL, a fresh browser context per run (cold cache).
// Reported per flow: median ms until the ready selector (and text) appears, plus DOMContentLoaded and load.
import { playwright } from "./pw.mjs";
import { TIMING } from "./cases.mjs";

const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };

async function oneRun(browser, url, flow) {
  const context = await browser.newContext({ viewport: { width: 1360, height: 900 }, locale: "ko-KR" });
  const page = await context.newPage();
  try {
    const t0 = Date.now();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: TIMING.timeoutMs });
    await page.locator(flow.ready).first().waitFor({ timeout: TIMING.timeoutMs });
    if (flow.text) await page.waitForFunction((src) => new RegExp(src).test(document.body.innerText), flow.text.source, { timeout: TIMING.timeoutMs });
    const ready = Date.now() - t0;
    const nav = await page.evaluate(() => { const n = performance.getEntriesByType("navigation")[0]; return n ? { dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd) } : {}; });
    return { ready, ...nav };
  } catch (e) {
    return { error: String(e.message || e).split("\n")[0] };
  } finally {
    await context.close();
  }
}

// targets: [{label, base}], vars: {chem}
export async function measure(targets, vars) {
  const { chromium } = playwright();
  const browser = await chromium.launch();
  const out = [];
  try {
    for (const flow of TIMING.flows) {
      const path = flow.path.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
      if (flow.path.includes("{chem}") && !vars.chem) continue;
      for (const t of targets) {
        const runs = [];
        for (let i = 0; i < TIMING.runs; i++) runs.push(await oneRun(browser, t.base + path, flow));
        const ok = runs.filter((r) => !r.error);
        const row = { flow: flow.name, target: t.label, runs: runs.length, errors: runs.length - ok.length,
          ready_ms: median(ok.map((r) => r.ready)), dcl_ms: median(ok.map((r) => r.dcl)), load_ms: median(ok.map((r) => r.load)),
          error: runs.find((r) => r.error)?.error };
        out.push(row);
        console.log(`${flow.name.padEnd(12)} ${t.label.padEnd(10)} ready ${row.ready_ms} ms (dcl ${row.dcl_ms}, load ${row.load_ms})${row.errors ? ` errors ${row.errors}` : ""}`);
      }
    }
  } finally {
    await browser.close();
  }
  return out;
}
