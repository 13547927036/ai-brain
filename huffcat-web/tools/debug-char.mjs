import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${e.stack}`));

await page.goto('http://127.0.0.1:5190/', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
console.log('before screen:', await page.evaluate(() => window.__huffcat.state().screen));
await page.click('[data-testid="start-game"]');
await page.waitForTimeout(800);
console.log('after screen:', await page.evaluate(() => window.__huffcat.state().screen));
console.log('after body:', (await page.locator('body').innerText()).replace(/\n+/g, ' | ').slice(0, 300));
console.log('char cards:', await page.locator('.char-card').count());
console.log('logs:', logs.join('\n') || 'none');
await page.screenshot({ path: 'screenshots/debug-char.png' });
await browser.close();