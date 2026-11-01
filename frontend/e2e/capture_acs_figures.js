// Re-capture the four ChemIP UI figures for the ACS CHS manuscript.
//
// The editorial office asked for figures whose text is legible at 100% zoom.
// The originals were 1440-px-wide screenshots printed 5.5 in wide, which puts
// 13-px UI text at roughly 4 pt on paper. Capturing the same screens at a
// narrower viewport with deviceScaleFactor 3 keeps the content identical while
// making each glyph both larger on the page and sharper than 300 dpi.
//
//   node e2e/capture_acs_figures.js [baseUrl] [outDir]

const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BASE = process.argv[2] || 'http://127.0.0.1:7000';
const OUT = process.argv[3] || path.join(__dirname, '..', '..', 'papers', 'acs-chs', 'figures', 'v2');

// 700 px wide keeps 13 px UI type at ~8.7 pt when printed 6.5 in; 800 px tall keeps
// the figure under 7.5 in so a caption still fits on the page.
const VIEWPORT = { width: 700, height: 800 };
const SCALE = 4;                                 // 700 x 4 = 2800 px => 430 dpi at 6.5 in

// Chrome that only makes sense on screen.
const FLOATING_CHROME = '[class*="fixed"][class*="bottom-"], [class*="AI assistant"], button[aria-label*="assistant" i]';

const SHOTS = [
  { file: 'cap_main.png', url: '/home', wait: 4000, width: 820,
    desc: 'Figure 3 - main interface (820 px keeps the nav labels the caption names)' },
  { file: 'cap_chemical.png', url: '/chemical/001008', wait: 7000,
    desc: 'Figure 4 - substance safety lookup' },
  { file: 'cap_patents.png', url: '/patents?q=benzene', wait: 8000, scroll: 200,
    desc: 'Figure 5 - patent landscape search' },
  { file: 'cap_drugs.png', url: '/drugs?q=ibuprofen', wait: 8000, scroll: 250,
    desc: 'Figure 6 - pharmaceutical cross-reference' },
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: SCALE });
  for (const s of SHOTS) {
    const page = await ctx.newPage();
    if (s.width) await page.setViewportSize({ width: s.width, height: VIEWPORT.height });
    const errs = [];
    page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
    try {
      const resp = await page.goto(BASE + s.url, { waitUntil: 'networkidle', timeout: 60000 });
      if (!resp || resp.status() !== 200) throw new Error(`HTTP ${resp && resp.status()} for ${s.url}`);
      await page.waitForTimeout(s.wait);

      // The floating assistant button sits on top of the content it would obscure
      // in print, and the figures are about the data panels, not the widget.
      await page.addStyleTag({ content: FLOATING_CHROME + ' { display: none !important; }' });
      await page.waitForTimeout(300);

      // Cut the frame at a card boundary instead of mid-sentence: walk the top-level
      // blocks and stop at the last one that fits the height budget.
      const clip = await page.evaluate(({ budget, scroll }) => {
        const main = document.querySelector('main') || document.body;
        const blocks = [...main.children].filter(el => el.getBoundingClientRect().height > 24);
        const top = scroll || 0;
        let bottom = 0;
        for (const el of blocks) {
          const r = el.getBoundingClientRect();
          const end = r.bottom + window.scrollY;
          if (end <= top) continue;
          if (end - top > budget) break;
          bottom = end;
        }
        // A single tall card can leave the frame nearly empty; fall back to a full frame.
        if (bottom - top < budget * 0.7) bottom = top + budget;
        return { x: 0, y: top, width: document.documentElement.clientWidth, height: Math.ceil(bottom - top) };
      }, { budget: VIEWPORT.height, scroll: s.scroll });

      const out = path.join(OUT, s.file);
      await page.screenshot({ path: out, clip, fullPage: true });
      const vw = s.width || VIEWPORT.width;
      const px = vw * SCALE;
      const pt = (13 / vw * 6.5 * 72).toFixed(1);
      console.log(`${s.file.padEnd(18)} ${px}x${VIEWPORT.height * SCALE}  ` +
                  `(${Math.round(px / 6.5)} dpi, body type ~${pt} pt at 6.5 in)  ${errs.length ? 'ERR: ' + errs[0] : 'ok'}`);
    } catch (e) {
      console.log(`${s.file.padEnd(18)} FAILED ${String(e).split('\n')[0]}`);
    }
    await page.close();
  }
  await browser.close();
})();
