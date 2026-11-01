// Playwright: GHS 그림문자·경고표지 만들기 — 집 PC 가 꺼진 모양(정적 자료만, /api 503)으로 확인한다.
//   - 물질 상세 MSDS 탭 2항 "그림문자"가 그림(<img>, 대체 글)으로, 머리에 "경고표지 만들기" 링크
//   - ?view=ghslabel&chem=<벤젠> 이 MSDS 2항(그림문자·신호어·H/P)으로 채워지고 표지 미리 보기가 보임, ko·en × 1440·390, 가로 넘침 없음
//   - 인쇄 흉내: 인쇄 단추 → body.gl-printing, media print 에서 앱 화면 숨김·표지만 보임·표지 실제 크기(mm)
//   - PDF(preferCSSPageSize) 쪽 크기 = 고른 크기(A4 가로 842×595pt · A5 가로 595×420pt · 소형 100×70mm 283×198pt)
//
//   set NODE_PATH=G:\MSDS\frontend\node_modules
//   node frontend/scripts/tests/browser_ghs_label_check.cjs [--out E:/dev-cache/chemip-ghs-label-check] [--skip-build] [--pc]
//   --pc 이면 정적 빌드 대신 지금 켜진 PC 사이트(http://127.0.0.1:7000/chemip)를 본다(새 그림 파일은 Next 재시작 뒤에야 보인다).
// 결과 캡처는 --out 아래(E: — C: 에 두지 않는다). 운영 dist 를 건드리지 않는다(빌드는 --out/build).
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { chromium } = require("playwright");
const { startOffServer } = require("./verify_portal_server.cjs");
const { loadDeployRules, areaDir } = require("./verify_portal_deploy.cjs");
const spec = require("./verify_portal_spec.cjs");

function arg(name, dflt) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : dflt;
}
const OUT = path.resolve(arg("--out", "E:/dev-cache/chemip-ghs-label-check"));
const SKIP_BUILD = process.argv.includes("--skip-build");
const USE_PC = process.argv.includes("--pc");
const REPO = path.join(__dirname, "..", "..", "..");
const BENZENE_CAS = "71-43-2";
const PT_PER_MM = 72 / 25.4;
const PAGE_MM = { a4: [297, 210], a5: [210, 148], small: [100, 70] };
const SHEET_MM = { a4: [285, 198], a5: [200, 138], small: [100, 70] };

const results = [];
function check(name, ok, note = "") {
  results.push(Boolean(ok));
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${note ? ` — ${note}` : ""}`);
}

function buildScratch() {
  const buildDir = path.join(OUT, "build");
  if (SKIP_BUILD && fs.existsSync(path.join(buildDir, "app.js"))) return buildDir;
  fs.rmSync(buildDir, { recursive: true, force: true });
  const r = spawnSync(process.execPath, [path.join(REPO, "frontend", "scripts", "build_chemip.cjs"), "--out", buildDir], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`scratch build failed: ${r.stderr || r.stdout}`);
  return buildDir;
}

async function startSite() {
  if (USE_PC) return { base: "http://127.0.0.1:7000/chemip", close: async () => {} };
  const rules = await loadDeployRules();
  const buildDir = buildScratch();
  const pageHtml = rules.injectStatic(fs.readFileSync(path.join(buildDir, "index.html"), "utf8"));
  const areaRoots = {};
  for (const a of new Set([...[...rules.workerAreas].map(x => x.split("/")[0]), ...Object.keys(spec.STATIC_AREAS)])) {
    const def = spec.STATIC_AREAS[a] || { dir: a };
    areaRoots[def.patent ? rules.patentArea : def.dir] = areaDir(def, rules.staticOut);
  }
  const off = await startOffServer({
    pageHtml, bundleFile: path.join(buildDir, "app.js"), copies: rules.copies, areaRoots,
    functionRoutes: rules.functionRoutes, workerAreas: rules.workerAreas, patentArea: rules.patentArea,
    dataPrefix: rules.dataPrefix, appPath: rules.appPath,
  });
  return { base: `${off.origin}${rules.appPath}`, close: () => off.close() };
}

// PDF 첫 쪽 MediaBox [x0 y0 x1 y1] (pt)
function pdfPageSize(buf) {
  const m = buf.toString("latin1").match(/\/MediaBox\s*\[\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\]/);
  return m ? [Number(m[3]) - Number(m[1]), Number(m[4]) - Number(m[2])] : null;
}

async function openPage(context, url, errors) {
  const page = await context.newPage();
  page.on("pageerror", e => errors.push(String(e.message || e)));
  page.on("response", r => { if (r.status() >= 400 && !/\/api\//.test(r.url())) errors.push(`${r.status()} ${new URL(r.url()).pathname}`); });
  await page.goto(url, { waitUntil: "networkidle" });
  return page;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const site = await startSite();
  const browser = await chromium.launch();
  try {
    console.log(`site: ${site.base}${USE_PC ? " (PC)" : " (PC-off scratch build, /api → 503)"}`);
    for (const lang of ["ko", "en"]) {
      for (const width of [1440, 390]) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, locale: lang === "ko" ? "ko-KR" : "en-US" });
        await context.addInitScript(() => { window.__printCalls = 0; window.print = () => { window.__printCalls += 1; }; });
        const errors = [];
        const tag = `${lang} ${width}`;

        // 1) 물질 상세 MSDS 탭 — 2항 그림문자 그림, 머리 링크
        const pd = await openPage(context, `${site.base}?view=product&pv=chemical&chem=${BENZENE_CAS}&lang=${lang}`, errors);
        await pd.waitForSelector(".msds-grid", { timeout: 20000 });
        await pd.click(".msds-item:nth-child(2)");
        await pd.waitForSelector(".ghs-row-msds img", { timeout: 15000 });
        const imgs = await pd.$$eval(".ghs-row-msds img", els => els.map(e => ({ alt: e.alt, ok: e.complete && e.naturalWidth > 0, src: e.getAttribute("src") })));
        const altRe = lang === "ko" ? /^GHS0\d [가-힣]/ : /^GHS0\d [A-Z]/;
        check(`[${tag}] MSDS 탭 2항 그림문자 = 그림(읽힘)·대체 글`, imgs.length >= 1 && imgs.every(i => i.ok && altRe.test(i.alt)), imgs.map(i => i.alt).join(" | "));
        const linkHref = await pd.$eval(".chem-hdr a[href*='view=ghslabel']", a => a.getAttribute("href")).catch(() => "");
        check(`[${tag}] 물질 머리 "경고표지 만들기" 링크`, /view=ghslabel&chem=/.test(linkHref), linkHref);
        await pd.screenshot({ path: path.join(OUT, `msds_${lang}_${width}.png`) });

        // 2) 경고표지 만들기 — MSDS 2항으로 채움
        const gl = await openPage(context, `${site.base}${linkHref || `?view=ghslabel&chem=${BENZENE_CAS}`}&lang=${lang}`, errors);
        await gl.waitForSelector(".gl-sheet", { timeout: 20000 });
        await gl.waitForFunction(() => document.querySelectorAll(".gl-preview .gl-sheet .ghs-pict").length > 0, null, { timeout: 15000 });
        const info = await gl.evaluate(() => {
          const sheet = document.querySelector(".gl-preview .gl-sheet");
          const imgs = [...sheet.querySelectorAll(".ghs-pict")];
          return {
            picts: imgs.map(i => i.alt), loaded: imgs.every(i => i.complete && i.naturalWidth > 0),
            signal: sheet.querySelector(".gl-signal b")?.textContent || "",
            h: sheet.querySelectorAll(".gl-block:first-child li").length,
            name: sheet.querySelector(".gl-name b")?.textContent || "",
            text: sheet.innerText,
            overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            frameW: document.querySelector(".gl-preview-frame").getBoundingClientRect().width,
            sheetW: sheet.getBoundingClientRect().width,
          };
        });
        const signalOk = lang === "ko" ? info.signal === "위험" : info.signal === "Danger";
        check(`[${tag}] 표지: 벤젠 MSDS 2항 그림문자·신호어·H 문구`, info.picts.length >= 2 && info.loaded && signalOk && info.h >= 3 && info.name,
          `${info.name} · ${info.signal} · ${info.picts.join(", ")} · H ${info.h}`);
        if (lang === "en") check(`[${tag}] 영어 표지: H 문장 영어(문구표)`, /Highly flammable|flammable liquid/i.test(info.text) && !/고인화성/.test(info.text), info.text.slice(0, 120));
        check(`[${tag}] 미리 보기가 틀 안에(줄여 보임), 가로 넘침 없음`, info.sheetW <= info.frameW + 1 && info.overflowX <= 0, `sheet ${info.sheetW.toFixed(0)} / frame ${info.frameW.toFixed(0)}, overflow ${info.overflowX}`);
        await gl.screenshot({ path: path.join(OUT, `label_${lang}_${width}.png`), fullPage: true });

        // 3) 인쇄 흉내 + PDF 쪽 크기 (1440 에서만 세 크기 모두)
        const sizes = width === 1440 ? ["a4", "a5", "small"] : ["a5"];
        for (const size of sizes) {
          const btn = gl.locator(".gl-toolbar .seg").first().locator("button").nth(["a4", "a5", "small"].indexOf(size));
          await btn.click();
          await gl.click(".gl-toolbar .btn.primary");
          await gl.waitForFunction(() => document.body.classList.contains("gl-printing") && window.__printCalls > 0, null, { timeout: 5000 });
          await gl.emulateMedia({ media: "print" });
          const pr = await gl.evaluate(() => {
            const root = document.querySelector(".gl-print-root");
            const sheet = root && root.querySelector(".gl-sheet");
            const r = sheet ? sheet.getBoundingClientRect() : { width: 0, height: 0 };
            const probe = document.createElement("div");
            probe.style.width = "100mm";
            document.body.appendChild(probe);
            const pxPerMm = probe.getBoundingClientRect().width / 100;
            probe.remove();
            return {
              appHidden: getComputedStyle(document.getElementById("app-root")).display === "none",
              rootShown: root ? getComputedStyle(root).display !== "none" : false,
              size: root?.getAttribute("data-size"), wMm: r.width / pxPerMm, hMm: r.height / pxPerMm,
              bg: sheet ? getComputedStyle(sheet).backgroundColor : "",
            };
          });
          const [ew, eh] = SHEET_MM[size];
          check(`[${tag}] 인쇄(${size}): 앱 숨김·표지만·표지 ${ew}×${eh} mm`, pr.appHidden && pr.rootShown && pr.size === size
            && Math.abs(pr.wMm - ew) < 1 && Math.abs(pr.hMm - eh) < 1, `${pr.wMm.toFixed(1)}×${pr.hMm.toFixed(1)} mm, bg ${pr.bg}`);
          if (width === 1440 && lang === "ko") {
            const pdf = await gl.pdf({ preferCSSPageSize: true, printBackground: true });
            fs.writeFileSync(path.join(OUT, `label_${size}.pdf`), pdf);
            const ps = pdfPageSize(pdf);
            const [pw, ph] = PAGE_MM[size].map(mm => mm * PT_PER_MM);
            const pages = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;
            check(`[${tag}] PDF(${size}): 쪽 크기 ${PAGE_MM[size].join("×")} mm 한 쪽`, ps && Math.abs(ps[0] - pw) < 2 && Math.abs(ps[1] - ph) < 2 && pages === 1,
              ps ? `${ps[0].toFixed(0)}×${ps[1].toFixed(0)} pt, ${pages}쪽` : "MediaBox 없음");
          }
          await gl.emulateMedia({ media: "screen" });
          await gl.evaluate(() => window.dispatchEvent(new Event("afterprint")));
          await gl.waitForFunction(() => !document.body.classList.contains("gl-printing") && !document.querySelector(".gl-print-root"), null, { timeout: 5000 });
        }
        check(`[${tag}] 페이지 오류·4xx/5xx(/api 제외) 없음`, errors.length === 0, errors.slice(0, 5).join(" | "));
        await context.close();
      }
    }
  } finally {
    await browser.close();
    await site.close();
  }
  const failed = results.filter(r => !r).length;
  console.log(`\n${results.length - failed}/${results.length} passed · captures: ${OUT}`);
  process.exit(failed ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
