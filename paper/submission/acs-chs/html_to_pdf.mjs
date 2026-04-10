import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('G:/MSDS/frontend/node_modules/@playwright/test');
import { fileURLToPath } from 'url';
import path from 'path';

const htmlFile = path.resolve('G:/MSDS/paper/submission/acs-chs/SI_ChemIP.html');
const pdfFile = path.resolve('G:/MSDS/paper/submission/acs-chs/SI_ChemIP.pdf');

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`file:///${htmlFile.replace(/\\/g, '/')}`, { waitUntil: 'networkidle' });
await page.pdf({
  path: pdfFile,
  format: 'Letter',
  margin: { top: '0.75in', bottom: '0.75in', left: '0.75in', right: '0.75in' },
  printBackground: true,
});
await browser.close();
console.log(`PDF saved: ${pdfFile}`);
