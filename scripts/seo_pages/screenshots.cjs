// Playwright screenshots of a few generated pages at phone and desktop widths. Static files only (file:// URLs).
// Usage: node screenshots.cjs <outDir> <shotDir> <widths comma> <page files...>
// Page files come from run.py (urls.file_for), so the URL -> file mapping lives only in urls.py.
// NODE_PATH must point at G:\MSDS\frontend\node_modules (run.py sets it).
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");

(async () => {
  const [outDir, shotDir, widthsArg, ...pages] = process.argv.slice(2);
  const widths = widthsArg.split(",").map(Number);
  fs.mkdirSync(shotDir, { recursive: true });
  const browser = await chromium.launch();
  const written = [];
  for (const file of pages) {
    const p = path.relative(outDir, file).replace(/\\/g, "/");
    for (const w of widths) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      await page.goto("file:///" + file.replace(/\\/g, "/"));
      const name = p.replace(/\.html$/, "").replace(/\//g, "_") + `_${w}.png`;
      const out = path.join(shotDir, name);
      await page.screenshot({ path: out, fullPage: true });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      written.push({ page: p, width: w, file: out, horizontalOverflow: overflow });
      await ctx.close();
    }
  }
  await browser.close();
  console.log(JSON.stringify(written));
})().catch((e) => { console.error(e); process.exit(1); });
