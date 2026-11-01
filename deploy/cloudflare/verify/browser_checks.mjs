// Browser checks with Playwright against a deployed base URL: landing, static search, substance pages from R2,
// 규제·인허가 / 수출입 tab (import, US, export), board list + one TEST post. Screenshots go to outDir.
import fs from "node:fs";
import path from "node:path";
import { playwright } from "./pw.mjs";
import { OFFLINE_TEXT, SEARCH_QUERIES, SELECTORS as S, TEST_POST } from "./cases.mjs";

function recorder(results) {
  return (name, ok, note = "") => {
    results.push({ name, ok: Boolean(ok), note });
    console.log(`${ok ? "PASS" : "FAIL"} ${name}${note ? ` — ${note}` : ""}`);
  };
}

function trackRequests(page) {
  const log = [];
  page.on("response", (r) => {
    const u = new URL(r.url());
    if (u.pathname.startsWith("/api/") || u.pathname.startsWith("/data/")) log.push({ path: u.pathname + u.search, status: r.status(), method: r.request().method() });
  });
  return log;
}

async function landing(page, base, check, shot) {
  await page.goto(`${base}/chemip`, { waitUntil: "domcontentloaded" });
  await page.locator(S.appReady).waitFor({ timeout: 60000 });
  await page.waitForTimeout(1500);
  const text = await page.locator("body").innerText();
  check("landing renders", text.length > 200 && !text.includes(OFFLINE_TEXT), `${text.length} chars`);
  await shot("01_landing");
}

async function search(page, base, check, shot, log) {
  for (const [i, q] of SEARCH_QUERIES.entries()) {
    const before = log.length;
    await page.goto(`${base}/chemip?q=${encodeURIComponent(q)}`, { waitUntil: "domcontentloaded" });
    await page.locator(S.searchRow).first().waitFor({ timeout: 60000 }).catch(() => {});
    const n = await page.locator(S.searchRow).count();
    const calls = log.slice(before);
    const api = calls.filter((c) => c.path.startsWith("/api/chemicals"));
    const stat = calls.filter((c) => c.path.startsWith("/data/v1/search/"));
    check(`search "${q}"`, n > 0, `${n} rows, ${stat.length} static search files, ${api.length} /api/chemicals calls`);
    await shot(`02_search_${i}`);
  }
}

async function substance(page, base, chem, check, shot, log, requireR2) {
  const before = log.length;
  await page.goto(`${base}/chemip?view=product&pv=chemical&chem=${encodeURIComponent(chem)}`, { waitUntil: "domcontentloaded" });
  await page.locator(S.tabs).first().waitFor({ timeout: 60000 }).catch(() => {});
  await page.waitForFunction(() => /MSDS/.test(document.body.innerText), null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const tab = (await page.locator(S.tabs).first().innerText().catch(() => "")).replace(/\s+/g, " ");
  const calls = log.slice(before);
  const p = calls.filter((c) => c.path.startsWith("/data/v1/p/"));
  const api = calls.filter((c) => c.path.startsWith("/api/chemicals/"));
  const source = p.some((c) => c.status === 200) ? "R2" : api.some((c) => c.status === 200) ? "/api fallback" : "none";
  check(`substance ${chem} renders`, /MSDS/.test(tab) && source !== "none", `source ${source}, tab "${tab}", p/ ${p.map((c) => c.status).join(",")}`);
  if (requireR2) check(`substance ${chem} served from R2`, source === "R2");
  await shot(`03_substance_${chem}`);
}

async function trade(page, check, shot) {
  await page.getByRole("button", { name: /규제·인허가 \/ 수출입/ }).click();
  await page.locator(S.tradeBody).waitFor({ timeout: 60000 }).catch(() => {});
  check("trade tab: import (default)", (await page.locator(S.tradeBody).count()) > 0);
  await shot("04_trade_import");
  await page.locator(S.countrySelect).selectOption("US");
  await page.waitForTimeout(2000);
  check("trade tab: import + US", (await page.locator(S.tradeBody).count()) > 0 && /미국|US/.test(await page.locator("body").innerText()));
  await shot("05_trade_import_US");
  await page.getByRole("button", { name: /^수출/ }).first().click();
  await page.waitForTimeout(4000);
  const text = await page.locator("body").innerText();
  check("trade tab: export + US", (await page.locator(S.tradeBody).count()) > 0, /KOTRA/.test(text) ? "KOTRA section shown" : "");
  await shot("06_trade_export_US");
}

async function board(page, base, check, shot) {
  await page.goto(`${base}/chemip?view=board`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: S.boardWrite }).first().waitFor({ timeout: 60000 });
  await page.waitForTimeout(1000);
  check("board list renders", !(await page.locator("body").innerText()).includes(OFFLINE_TEXT));
  await shot("07_board_list");
  await page.getByRole("button", { name: S.boardWrite }).first().click();
  await page.locator("form.fb-form").waitFor({ timeout: 30000 });
  await page.locator("form.fb-form .seg button", { hasText: TEST_POST.category }).click();
  await page.locator("form.fb-form input.fb-input").first().fill(TEST_POST.title);
  await page.locator("form.fb-form textarea").fill(TEST_POST.body);
  const [resp] = await Promise.all([
    page.waitForResponse((r) => new URL(r.url()).pathname === "/api/feedback" && r.request().method() === "POST", { timeout: 30000 }),
    page.locator("form.fb-form button[type=submit]").click(),
  ]);
  const body = await resp.json().catch(() => ({}));
  const id = body.id ?? body.item?.id ?? null;
  check("board create (TEST post)", resp.status() === 201 || resp.status() === 200, `status ${resp.status()}, id ${id}`);
  await page.waitForTimeout(1500);
  await shot("08_board_created");
  return id;
}

export async function runBrowserChecks(base, chems, outDir, { board: withBoard = true, requireR2 = true } = {}) {
  fs.mkdirSync(outDir, { recursive: true });
  const results = [];
  const check = recorder(results);
  const { chromium } = playwright();
  const browser = await chromium.launch();
  const jsErrors = [];
  let postId = null;
  let log = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1360, height: 900 }, locale: "ko-KR" });
    const page = await context.newPage();
    page.on("pageerror", (e) => jsErrors.push(String(e.message || e)));
    log = trackRequests(page);
    const shot = (name) => page.screenshot({ path: path.join(outDir, `${name}.png`) });
    await landing(page, base, check, shot);
    await search(page, base, check, shot, log);
    if (!chems.length) check("substance pages (needs p/ objects in R2, or --chem)", false, "no p/ object in R2 yet");
    for (const chem of chems) await substance(page, base, chem, check, shot, log, requireR2);
    if (chems.length) await trade(page, check, shot);
    if (withBoard) postId = await board(page, base, check, shot);
    check("no uncaught JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  } finally {
    await browser.close();
  }
  return { results, jsErrors, postId, requests: log };
}
