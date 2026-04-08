import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('G:/MSDS/frontend/node_modules/@playwright/test');
import path from 'path';

const BASE = 'https://chemip.yule.pics';
const OUT = 'G:/MSDS/paper/submission/acs-chs/screenshots';

const pages = [
  { name: 'home',      path: '/',               waitFor: 2500 },
  { name: 'chemical',  path: '/chemical/001008', waitFor: 5000 },
  { name: 'patents',   path: '/patents',         waitFor: 2000 },
  { name: 'drugs',     path: '/drugs',           waitFor: 2000 },
  { name: 'trade',     path: '/trade',           waitFor: 3000 },
  { name: 'guide',     path: '/guide',           waitFor: 2000 },
];

async function capture(lang) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  // Set locale in localStorage before navigating
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
  await page.evaluate((locale) => {
    localStorage.setItem('chemip-locale', locale);
  }, lang);
  await page.waitForTimeout(500);

  for (const pg of pages) {
    const url = `${BASE}${pg.path}`;
    console.log(`[${lang}] ${pg.name}: ${url}`);

    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(pg.waitFor);

    const filename = `${pg.name}_${lang}.png`;
    await page.screenshot({
      path: path.join(OUT, filename),
      fullPage: false,
    });
    console.log(`  -> ${filename}`);
  }

  await browser.close();
}

const fs = require('fs');
fs.mkdirSync(OUT, { recursive: true });

await capture('ko');
await capture('en');

console.log('\nDone! Screenshots saved to:', OUT);
