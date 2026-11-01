// Capture publication-grade screenshots of the live ChemIP front (chemip.yule.pics)
// for the paper figures. Each shot maps to one paper — see SHOTS below.
//
//   node e2e/capture_paper_screens.js [baseUrl] [outDir] [--anon]
//
// --anon strips the product name from the UI (topbar brand, page text) so the
// same screens can go into the double-anonymous submissions (Paper A, Paper B).

const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BASE = process.argv[2] || 'https://chemip.yule.pics';
const OUT = process.argv[3] || path.join(__dirname, '..', '..', 'paper2', '_screenshots');
const ANON = process.argv.includes('--anon');

// A chemical with real data across every panel: MSDS, §15 regulation, PRTR sites.
// chem_id is the KOSHA internal id, not the CAS — MSDS sections are keyed on it.
const BENZENE = {
  chem_id: '001008', cas_no: '71-43-2', name: '벤젠 (Benzene)',
  name_en: 'Benzene', source: 'KOSHA', has_msds: true,
};

const SHOTS = [
  { key: 'landing', paper: '1', appView: 'landing', desc: 'Landing / platform overview' },
  { key: 'search', paper: 'A', appView: 'product', view: 'search', query: '벤젠',
    desc: 'Search results grouped by source — the entity-resolution surface' },
  { key: 'chemical_msds', paper: '1', appView: 'product', view: 'chemical', desc: 'Chemical detail, 16 MSDS sections' },
  { key: 'regulation', paper: 'B', appView: 'product', view: 'chemical', clip: 'aside',
    desc: 'Section 15 regulation panel with obligation flags' },
  { key: 'handlers', paper: 'D', appView: 'product', view: 'chemical', clip: 'handlers',
    desc: 'PRTR handling-site panel — release/transfer by facility' },
  { key: 'patents', paper: '1', appView: 'product', view: 'patents', desc: 'Patent search (KIPRIS)' },
  { key: 'benchmark', paper: 'C', appView: 'benchmark', desc: 'ChemSafety-HalBench results console' },
  { key: 'research', paper: '-', appView: 'research', desc: 'Research hub' },
];

// Blank the product name everywhere it is rendered as text.
const ANON_SCRIPT = () => {
  const scrub = () => {
    document.querySelectorAll('.topbar .brand').forEach(el => { el.style.visibility = 'hidden'; });
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const hits = [];
    while (walker.nextNode()) if (/ChemIP/i.test(walker.currentNode.nodeValue)) hits.push(walker.currentNode);
    hits.forEach(n => { n.nodeValue = n.nodeValue.replace(/ChemIP/gi, 'the system'); });
  };
  scrub();
  new MutationObserver(scrub).observe(document.body, { childList: true, subtree: true });
};

async function shoot(ctx, shot) {
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  await page.addInitScript(s => {
    localStorage.setItem('chemip-app-view', s.appView);
    if (s.view) localStorage.setItem('chemip-view', s.view);
    localStorage.setItem('chemip-selected', JSON.stringify(s.chem));
  }, { appView: shot.appView, view: shot.view, chem: BENZENE });

  const url = shot.query ? `${BASE}/chemip/index.html?q=${encodeURIComponent(shot.query)}` : `${BASE}/chemip/index.html`;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  if (ANON) await page.evaluate(ANON_SCRIPT);
  await page.waitForTimeout(3500);

  let target = page;
  if (shot.clip === 'handlers') {
    const sec = page.locator('section', { hasText: 'Handling Companies' }).first();
    await sec.waitFor({ timeout: 25000 });
    await sec.scrollIntoViewIfNeeded();
    await page.waitForTimeout(8000);   // lazy PRTR fetch
    target = sec;
  } else if (shot.clip === 'aside') {
    const panel = page.locator('.panel', { hasText: 'Regulation' }).first();
    await panel.waitFor({ timeout: 25000 });
    await panel.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1200);
    target = panel;
  }

  const file = path.join(OUT, `${shot.key}${ANON ? '_anon' : ''}.png`);
  await target.screenshot({ path: file });
  const { width, height } = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
  console.log(`${shot.key.padEnd(16)} paper ${shot.paper.padEnd(2)} -> ${path.basename(file)}  ${errors.length ? 'ERRORS: ' + errors.join(' | ') : 'ok'}`);
  await page.close();
  return { ...shot, file: path.basename(file), viewport: `${width}x${height}` };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  // deviceScaleFactor 3 → a 1440px-wide shot prints well past 300 dpi at column width
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 3 });
  const done = [];
  for (const shot of SHOTS) {
    try { done.push(await shoot(ctx, shot)); }
    catch (e) { console.log(`${shot.key.padEnd(16)} FAILED: ${String(e).split('\n')[0]}`); }
  }
  fs.writeFileSync(path.join(OUT, `manifest${ANON ? '_anon' : ''}.json`),
    JSON.stringify({ base: BASE, captured: done, anonymized: ANON }, null, 2));
  await browser.close();
})();
