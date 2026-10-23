import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://127.0.0.1:5191/';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push(String(e)));

const bad = [];
page.on('response', (r) => {
  if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`);
});

await page.goto(BASE, { waitUntil: 'networkidle' });
console.log('url:', page.url());
console.log('title:', await page.title());
console.log('brand:', await page.locator('.brand__title').innerText());
console.log('brandEn:', await page.locator('.brand__en').innerText());
console.log('canvas:', await page.locator('canvas').count());
console.log('startBtn:', await page.locator('.btn--primary').first().innerText());
console.log('bad responses:', bad);
console.log('console errors:', errors);
await page.screenshot({ path: 'screenshots/deploy-check.png' });
await browser.close();

if (bad.length || errors.length) process.exit(1);