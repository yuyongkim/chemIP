const { chromium, devices } = require('@playwright/test');
const path = require('path');

(async () => {
  const url = process.argv[2] || 'https://chemip.yule.pics';
  const view = process.argv[3] || 'landing';
  const out = process.argv[4] || path.join(__dirname, `mobile_${view}.png`);
  const iphone = devices['iPhone 13'];
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...iphone });
  const page = await ctx.newPage();
  await page.addInitScript((v) => { try { localStorage.setItem('chemip-app-view', v); } catch (e) {} }, view);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: out, fullPage: false });
  console.log('saved', out);
  await browser.close();
})();
