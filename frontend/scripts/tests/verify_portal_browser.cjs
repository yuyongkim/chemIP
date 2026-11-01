// Playwright part of verify_portal_local.cjs: one page task = service page × lang × width in one mode.
// Checks: expected selectors/text, no uncaught page errors, no unexpected 4xx/5xx, no horizontal scroll,
// no Hangul in the EN screen outside source-data regions, ?view= registered in APP_SCREENS.
"use strict";

const { chromium } = require("playwright");

const HANGUL_RE = /[가-힣ㄱ-ㆎ]/;

function withLang(base, query, lang) {
  const q = query || "";
  const sep = q.includes("?") ? "&" : "?";
  return `${base}${q}${sep}lang=${lang}`;
}

function matchesAllow(allow, url, status, mode) {
  return allow.some(a => a.re.test(url) && (a.status === undefined || a.status === status) && (!a.modes || a.modes.includes(mode)));
}

async function waitExpect(page, item, timeout) {
  if (typeof item === "string" || item instanceof RegExp) {
    const src = item instanceof RegExp ? { s: item.source, f: item.flags } : { s: item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), f: "" };
    await page.waitForFunction(({ s, f }) => new RegExp(s, f).test(document.body ? document.body.innerText : ""), src, { timeout });
    return;
  }
  if (item.sel) { await page.locator(item.sel).first().waitFor({ state: "attached", timeout }); return; }
  if (item.notText) {
    const ok = await page.evaluate(t => !(document.body.innerText || "").includes(t), item.notText);
    if (!ok) throw new Error(`text present: ${item.notText}`);
    return;
  }
  throw new Error(`unknown expect item ${JSON.stringify(item)}`);
}

function describe(item) {
  if (item instanceof RegExp) return String(item);
  if (typeof item === "string") return JSON.stringify(item);
  return JSON.stringify(item);
}

async function runActions(page, actions) {
  for (const a of actions || []) {
    if (a.scroll) {
      for (let i = 0; i < 12; i += 1) {
        await page.mouse.wheel(0, 2500);
        await page.waitForTimeout(400);
      }
    }
    if (a.click) await page.locator(a.click).first().click({ timeout: 10000 });
    if (a.fill) await page.locator(a.fill[0]).first().fill(a.fill[1]);
    if (a.press) await page.keyboard.press(a.press);
    if (a.wait) await page.waitForTimeout(a.wait);
  }
}

// In-page: Hangul text nodes outside excluded regions → [{text, where}]
function hangulScan(excludes) {
  const re = /[가-힣ㄱ-ㆎ]/;
  const ex = excludes.join(",");
  const out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    const t = n.nodeValue;
    if (!t || !re.test(t)) continue;
    const el = n.parentElement;
    if (!el || (ex && el.closest(ex))) continue;
    if (el.checkVisibility && !el.checkVisibility()) continue;
    const where = [];
    for (let e = el; e && e !== document.body && where.length < 3; e = e.parentElement) {
      where.push(e.tagName.toLowerCase() + (e.id ? `#${e.id}` : "") + (e.classList.length ? `.${[...e.classList].slice(0, 2).join(".")}` : ""));
    }
    out.push({ text: t.trim().slice(0, 60), where: where.join(" < ") });
  }
  return out;
}

// In-page: horizontal overflow → {overflow, offenders}
function overflowScan() {
  const de = document.documentElement;
  const vw = de.clientWidth;
  const overflow = Math.max(de.scrollWidth, document.body.scrollWidth) - vw;
  const offenders = [];
  if (overflow > 1) {
    for (const el of document.body.querySelectorAll("*")) {
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1 && r.width > 0) {
        offenders.push({ el: el.tagName.toLowerCase() + (el.className && typeof el.className === "string" ? `.${el.className.trim().split(/\s+/).slice(0, 2).join(".")}` : ""), right: Math.round(r.right) });
        if (offenders.length >= 4) break;
      }
    }
  }
  return { overflow, offenders };
}

async function runTask(browser, task, ctx) {
  const { mode, base, defaults, allowHttp, hangulExclude } = ctx;
  const url = withLang(base, task.page.path, task.lang);
  const context = await browser.newContext({
    viewport: { width: task.width, height: defaults.heights[task.width] || 900 },
    locale: task.lang === "en" ? "en-US" : "ko-KR",
  });
  const local = new URL(base).host;
  await context.route("**/*", route => {
    const h = new URL(route.request().url()).host;
    return h === local ? route.continue() : route.abort("blockedbyclient");
  });
  const page = await context.newPage();
  const pageErrors = [];
  const http = [];
  const consoleErrors = [];
  page.on("pageerror", e => pageErrors.push(String(e.message || e).slice(0, 300)));
  page.on("console", m => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 200)); });
  page.on("response", r => { if (r.status() >= 400) http.push({ url: r.url(), status: r.status(), tag: r.headers()["x-verify"] || "" }); });
  const checks = [];
  const check = (name, ok, note = "") => checks.push({ name, ok: Boolean(ok), note });
  const t0 = Date.now();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: defaults.timeoutMs });
    await page.waitForFunction(() => document.querySelector(".shell"), null, { timeout: defaults.timeoutMs })
      .then(() => check("app shell rendered", true), () => check("app shell rendered", false, "no .shell"));
    await runActions(page, task.page.actions).catch(e => check("actions", false, String(e.message).split("\n")[0]));
    const items = [...(task.page.expect?.any || []), ...(task.page.expect?.[task.lang] || [])];
    for (const item of items) {
      const ok = await waitExpect(page, item, defaults.timeoutMs).then(() => true, e => String(e.message).split("\n")[0]);
      check(`expect ${describe(item)}`, ok === true, ok === true ? "" : ok);
    }
    for (const v of task.views || []) {
      const reg = await page.evaluate(k => (typeof APP_SCREENS !== "undefined" ? APP_SCREENS.some(s => s.k === k) : null), v);
      check(`view "${v}" registered in APP_SCREENS`, reg === true, reg === null ? "APP_SCREENS not visible" : "");
    }
    await page.waitForTimeout(defaults.settleMs);
    const ov = await page.evaluate(overflowScan);
    check("no horizontal scroll", ov.overflow <= 1, ov.overflow > 1 ? `+${ov.overflow}px ${ov.offenders.map(o => `${o.el}@${o.right}`).join(", ")}` : "");
    if (task.lang === "en" && task.page.hangul !== false) {
      const hits = await page.evaluate(hangulScan, [...hangulExclude, ...(task.page.hangulExclude || [])]);
      const max = task.page.hangulMax ?? defaults.hangulMax;
      const report = task.page.hangul === "report";
      const note = hits.length ? `${hits.length}: ${hits.slice(0, 4).map(h => `"${h.text}" @ ${h.where}`).join(" | ")}` : "";
      check(report ? "Hangul in EN (report only)" : "no Hangul in EN", report || hits.length <= max, note);
      task.hangulHits = hits.slice(0, 40);
    }
  } catch (e) {
    check("page load", false, String(e.message).split("\n")[0]);
  }
  // unrouted / missing-area 404s (PC-off server tags) are deploy-readiness findings of the area's owner, reported apart
  const allow = [...allowHttp, ...(task.page.allowHttp || [])];
  if (ctx.restartReason) for (const h of http) if (h.status === 404 && !h.tag && !matchesAllow(allow, h.url, h.status, mode)) {
    const why = ctx.restartReason(new URL(h.url).pathname);
    if (why) { h.tag = "pc-restart"; h.why = why; }
  }
  const pending = http.filter(h => h.tag === "unrouted" || h.tag === "missing-area" || h.tag === "pc-restart");
  const unexpected = http.filter(h => !pending.includes(h) && !matchesAllow(allow, h.url, h.status, mode));
  check("no page errors", pageErrors.length === 0, pageErrors.slice(0, 2).join(" | "));
  check("no unexpected 4xx/5xx", unexpected.length === 0, unexpected.slice(0, 4).map(h => `${h.status} ${h.url.replace(/^https?:\/\/[^/]+/, "")}`).join(", "));
  const apiCount = http.filter(h => /\/api\//.test(h.url)).length;
  await context.close();
  return {
    service: task.service, mode, url: task.page.path, lang: task.lang, width: task.width, ms: Date.now() - t0,
    ok: checks.every(c => c.ok), checks, pending: pending.map(h => `${h.tag} ${h.url.replace(/^https?:\/\/[^/]+/, "")}`), pageErrors, consoleErrors: consoleErrors.slice(0, 10), http, apiFailures: apiCount,
    hangulHits: task.hangulHits,
  };
}

async function runPool(tasks, ctx, concurrency) {
  const browser = await chromium.launch();
  const results = [];
  let next = 0;
  try {
    const worker = async () => {
      while (next < tasks.length) {
        const t = tasks[next++];
        const r = await runTask(browser, t, ctx);
        results.push(r);
        const bad = r.checks.filter(c => !c.ok).map(c => `${c.name}${c.note ? ` (${c.note})` : ""}`);
        console.log(`  ${r.ok ? "ok  " : "FAIL"} ${ctx.mode} ${r.service} ${r.lang} ${r.width} ${r.url || "/"}${bad.length ? ` — ${bad.join("; ")}` : ""}`);
      }
    };
    await Promise.all(Array.from({ length: concurrency }, worker));
  } finally {
    await browser.close();
  }
  return results;
}

module.exports = { runPool, withLang, HANGUL_RE };
