const { chromium, devices } = require('@playwright/test');

(async () => {
  const iphone = devices['iPhone 13'];
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...iphone });
  const page = await ctx.newPage();
  // Start on product view
  await page.addInitScript(() => { try { localStorage.setItem('chemip-app-view', 'product'); } catch (e) {} });
  await page.goto('https://chemip.yule.pics?v=' + Date.now(), { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const before = await page.evaluate(() => localStorage.getItem('chemip-app-view'));
  console.log('before click:', before);
  // Click the brand
  await page.click('.topbar .brand');
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => localStorage.getItem('chemip-app-view'));
  console.log('after click:', after);
  // Verify landing UI is showing
  const hasLandingHero = await page.evaluate(() => !!document.querySelector('section.hero h1'));
  console.log('landing hero visible:', hasLandingHero);
  await browser.close();
})();
