/**
 * 压力帧率：真实 Chrome + 手机竖屏视口，第 11 波同屏 40 个敌人时测 3 秒。
 *
 * 运行：先 `npm run dev`，再 `npm run perf:stress`。
 * 这是桌面 Chrome 数据，不等于低端手机；真机仍需人工确认。
 */
import { chromium } from 'playwright';

const BASE = process.env.HACHICAT_URL || 'http://127.0.0.1:5190/';
const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: 'zh-CN',
  reducedMotion: 'reduce',
});
const page = await context.newPage();
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.locator('[data-testid="start-game"]').click();
await page.locator('[data-testid="start-run"]').click();
await page.waitForTimeout(1200);

const measure = () =>
  page.evaluate(
    () =>
      new Promise((resolve) => {
        const frames = [];
        let last = performance.now();
        const t0 = last;
        function tick(now) {
          frames.push(now - last);
          last = now;
          if (now - t0 < 3000) requestAnimationFrame(tick);
          else {
            const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
            resolve({
              fps: Math.round(1000 / avg),
              avgMs: Math.round(avg * 10) / 10,
              worstMs: Math.round(Math.max(...frames) * 10) / 10,
              frames: frames.length,
              enemies: window.__hachicat.hero().enemies,
              mode: window.__hachicat.state().mode,
            });
          }
        }
        requestAnimationFrame(tick);
      })
  );

await page.evaluate(() => {
  const g = window.__hachicat.controller.game;
  g.world.player.stats.maxHp = 99999;
  g.world.player.hp = 99999;
  window.__hachicat.jumpWave(11);
});
await page.waitForTimeout(4500);
await page.evaluate(() => {
  for (let i = 0; i < 28; i++) {
    window.__hachicat.spawn('fluff', { x: -160 + (i % 7) * 48, y: -180 + Math.floor(i / 7) * 62 });
  }
  // 排除拾取物特效干扰，只压敌人绘制
  window.__hachicat.controller.game.world.pickups.length = 0;
});
await page.waitForTimeout(400);
const result = await measure();
console.log(JSON.stringify(result));
console.log(`控制台错误：${errors.length ? errors.slice(0, 3).join(' | ') : '无'}`);
await browser.close();

if (result.enemies < 30 || result.fps < 50 || errors.length) process.exit(1);
