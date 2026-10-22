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
await page.waitForTimeout(400);
await page.evaluate(() => window.__huffcat.start('ginger'));
await page.waitForTimeout(1200);
console.log('before:', await page.evaluate(() => {
  const s = window.__huffcat.state();
  return { mode: s.mode, wave: s.wave, money: s.money, hp: s.hp };
}));

const out = await page.evaluate(() => {
  try {
    window.__huffcat.endWave();
    const s = window.__huffcat.state();
    return { ok: true, mode: s.mode, wave: s.wave, shop: !!s.shop, offers: s.shop?.offers?.length, upg: (s.upgradeOptions || []).length };
  } catch (err) {
    return { ok: false, error: String(err && err.stack || err) };
  }
});
console.log('endWave:', JSON.stringify(out, null, 2));
await page.waitForTimeout(500);
console.log('after 500ms:', await page.evaluate(() => {
  const s = window.__huffcat.state();
  return { mode: s.mode, shop: !!s.shop, upg: (s.upgradeOptions || []).length };
}));
console.log('logs:', logs.filter((l) => l.includes('error') || l.includes('pageerror')).join('\n') || 'none');
await page.screenshot({ path: 'screenshots/debug-shop.png' });
await browser.close();