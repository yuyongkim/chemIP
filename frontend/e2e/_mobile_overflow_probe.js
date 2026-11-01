const { chromium, devices } = require('@playwright/test');

(async () => {
  const url = process.argv[2] || 'https://chemip.yule.pics';
  const view = process.argv[3] || 'landing';
  const iphone = devices['iPhone 13'];
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...iphone });
  const page = await ctx.newPage();
  await page.addInitScript((v) => { try { localStorage.setItem('chemip-app-view', v); } catch (e) {} }, view);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  const data = await page.evaluate(() => {
    const vw = window.innerWidth;
    // Find elements with scrollWidth > clientWidth (real overflow within them)
    const out = [];
    document.querySelectorAll('*').forEach((el) => {
      if (el.scrollWidth > el.clientWidth + 1) {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        out.push({
          tag: el.tagName.toLowerCase(),
          cls: (typeof el.className === 'string' ? el.className : '').slice(0, 70),
          sw: el.scrollWidth, cw: el.clientWidth,
          w: Math.round(r.width),
          display: cs.display,
          of: cs.overflowX,
          gtc: cs.gridTemplateColumns,
          text: (el.innerText || '').replace(/\s+/g, ' ').slice(0, 80),
        });
      }
    });
    out.sort((a, b) => (b.sw - b.cw) - (a.sw - a.cw));
    return { vw, bodySW: document.body.scrollWidth, items: out.slice(0, 15) };
  });
  console.log(JSON.stringify(data, null, 2));
  await browser.close();
})();
