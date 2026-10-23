/**
 * 端到端验收：真实浏览器（系统 Chrome）+ 手机竖屏视口。
 *
 * 检查项：
 *  - 菜单 / 选角 / 战斗 / 升级 / 商店 / 暂停 / 结算 全流程
 *  - 触摸摇杆真的能推动角色（CDP 触摸事件）
 *  - Canvas 真的画出了东西（像素采样）
 *  - HUD 不越界、不横向溢出
 *  - 主题切换、存档、重开
 *  - 收集 console / pageerror
 *
 * 运行：npm run test:e2e
 * 需要先启动 `npm run dev`（默认 5190）。
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.HACHICAT_URL || 'http://127.0.0.1:5190/';
const OUT = 'screenshots';
mkdirSync(OUT, { recursive: true });

const results = [];
let failures = 0;

function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
}

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
  if (m.type() === 'error') errors.push(`console: ${m.text()}`);
});
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

const cdp = await context.newCDPSession(page);
const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });

async function touchDrag(from, to, steps = 10, hold = 650) {
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: from.x, y: from.y, radiusX: 6, radiusY: 6, force: 1 }],
  });
  for (let i = 1; i <= steps; i++) {
    const x = from.x + ((to.x - from.x) * i) / steps;
    const y = from.y + ((to.y - from.y) * i) / steps;
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y, radiusX: 6, radiusY: 6, force: 1 }],
    });
    await page.waitForTimeout(16);
  }
  await page.waitForTimeout(hold);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

async function layout() {
  return page.evaluate(() => {
    const rect = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    };
    return {
      innerW: window.innerWidth,
      innerH: window.innerHeight,
      scrollW: document.documentElement.scrollWidth,
      scrollH: document.documentElement.scrollHeight,
      pause: rect('[data-testid="pause"]'),
      wave: rect('.hud__wave'),
      money: rect('.hud__money'),
      hp: rect('.bar--hp'),
      weapons: rect('.hud__weapons'),
      canvas: rect('.game__canvas'),
    };
  });
}

async function canvasStats() {
  return page.evaluate(() => {
    const c = document.querySelector('canvas.game__canvas');
    if (!c) return null;
    const ctx = c.getContext('2d');
    const w = c.width;
    const h = c.height;
    const data = ctx.getImageData(0, 0, w, h).data;
    let min = 255;
    let max = 0;
    let sum = 0;
    let n = 0;
    const colors = new Set();
    for (let i = 0; i < data.length; i += 4 * 211) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const v = (r + g + b) / 3;
      sum += v;
      n += 1;
      if (v < min) min = v;
      if (v > max) max = v;
      if (colors.size < 220) colors.add(`${r >> 4},${g >> 4},${b >> 4}`);
    }
    return { w, h, min: Math.round(min), max: Math.round(max), avg: Math.round(sum / n), colors: colors.size };
  });
}

/* ---------------- 1. 主菜单 ---------------- */
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await shot('01-menu');

check('标题渲染', (await page.title()).includes('哈气猫'));
check(
  '主菜单主按钮可见',
  await page.locator('[data-testid="start-game"]').isVisible()
);
const menuLayout = await page.evaluate(() => ({
  innerW: innerWidth,
  scrollW: document.documentElement.scrollWidth,
  btn: (() => {
    const r = document.querySelector('[data-testid="start-game"]').getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height, bottom: r.bottom };
  })(),
}));
check('菜单无横向溢出', menuLayout.scrollW <= menuLayout.innerW + 1, `scrollW=${menuLayout.scrollW}`);
check('主按钮高度足够（≥48）', menuLayout.btn.h >= 48, `h=${menuLayout.btn.h}`);
check('主按钮在首屏内', menuLayout.btn.bottom <= 844, `bottom=${menuLayout.btn.bottom}`);
check('主菜单展示讨伐委托', (await page.locator('.menu__stamp').innerText()).includes('讨伐委托'));
check(
  '主按钮文案为接取委托',
  (await page.locator('[data-testid="start-game"]').innerText()).includes('接取讨伐委托')
);

/* ---------------- 2. 选角 ---------------- */
await page.locator('[data-testid="start-game"]').click();
await page.waitForTimeout(250);
await shot('02-characters');

const cards = await page.locator('.char-card').count();
check('角色卡 4 张', cards === 4, `count=${cards}`);
check('未解锁角色被禁用', await page.locator('[data-testid="char-shadow"]').isDisabled());
check('选角页展示委托', (await page.locator('.screen__title').innerText()).includes('讨伐委托'));

await page.locator('[data-testid="char-soot"]').click();
await page.waitForTimeout(120);
check(
  '选角高亮切换',
  (await page.locator('[data-testid="char-soot"]').getAttribute('aria-pressed')) === 'true'
);
await page.locator('[data-testid="char-ginger"]').click();
await page.waitForTimeout(120);

await page.locator('[data-testid="start-run"]').click();
await page.waitForTimeout(1400);
await shot('03-battle');

const battle = await page.evaluate(() => window.__hachicat.state());
check('进入战斗模式', battle.mode === 'battle', `mode=${battle.mode}`);
check('第 1 波开始', battle.wave === 1, `wave=${battle.wave}`);
check('HUD 显示波次', (await page.locator('.hud__wave-main').innerText()).includes('第 1 波'));
check('初始武器 1 件', battle.weapons.length === 1, `weapons=${battle.weapons.length}`);

const stats = await canvasStats();
check('Canvas 有实际渲染内容', !!stats && stats.max - stats.min > 30, JSON.stringify(stats));
check(
  'Canvas 尺寸匹配视口（DPR 2）',
  stats && stats.w > 700 && stats.h > 1500,
  `${stats?.w}x${stats?.h}`
);

const heroBefore = await page.evaluate(() => window.__hachicat.hero());
await touchDrag({ x: 110, y: 620 }, { x: 210, y: 560 }, 12, 700);
const heroAfter = await page.evaluate(() => window.__hachicat.hero());
check(
  '虚拟摇杆能移动角色',
  !!heroBefore && !!heroAfter && Math.hypot(heroAfter.x - heroBefore.x, heroAfter.y - heroBefore.y) > 25,
  `(${heroBefore?.x},${heroBefore?.y}) → (${heroAfter?.x},${heroAfter?.y})`
);

await page.waitForTimeout(1600);
const alive = await page.evaluate(() => window.__hachicat.hero());
check('敌人已刷新', alive.enemies > 0, `enemies=${alive.enemies}`);

const bl = await layout();
check('HUD 暂停键在屏内', bl.pause.x >= 0 && bl.pause.x + bl.pause.w <= bl.innerW, JSON.stringify(bl.pause));
check('HUD 血条宽度正常', bl.hp.w > 200, `w=${bl.hp.w}`);
check('HUD 武器栏在屏内', bl.weapons.y + bl.weapons.h <= bl.innerH, JSON.stringify(bl.weapons));
check('无横向溢出（战斗中）', bl.scrollW <= bl.innerW + 1, `scrollW=${bl.scrollW}`);

/* ---------------- 3. 升级 ---------------- */
await page.evaluate(() => window.__hachicat.levelUp());
await page.waitForTimeout(400);
await shot('04-upgrade');
const upCards = await page.locator('.upgrade-card').count();
check('升级三选一', upCards === 3, `cards=${upCards}`);
check('升级时暂停战斗', (await page.evaluate(() => window.__hachicat.state().mode)) === 'levelup');
await page.locator('[data-testid="upgrade-0"]').click();
await page.waitForTimeout(350);
check(
  '选择升级后回到战斗',
  (await page.evaluate(() => window.__hachicat.state().mode)) === 'battle'
);
await shot('05-after-upgrade');

/* ---------------- 4. 暂停 ---------------- */
await page.locator('[data-testid="pause"]').click();
await page.waitForTimeout(250);
await shot('06-pause');
check('暂停界面出现', (await page.evaluate(() => window.__hachicat.state().mode)) === 'paused');
await page.locator('[data-testid="resume"]').click();
await page.waitForTimeout(250);
check('恢复战斗', (await page.evaluate(() => window.__hachicat.state().mode)) === 'battle');

/* ---------------- 5. 波次结束 → 商店 ---------------- */
await page.evaluate(() => {
  window.__hachicat.endWave();
});
await page.waitForTimeout(350);
for (let i = 0; i < 3; i++) {
  const mode = await page.evaluate(() => window.__hachicat.state().mode);
  if (mode !== 'levelup') break;
  await page.locator('[data-testid="upgrade-0"]').click();
  await page.waitForTimeout(300);
}
await shot('07-shop');
const shop = await page.evaluate(() => window.__hachicat.state());
check('清场后进入商店', shop.mode === 'shop', `mode=${shop.mode}`);
check('商店 4 个商品', shop.shop?.offers.length === 4, `offers=${shop.shop?.offers.length}`);
const buildTitle = await page.locator('.shop__build h3').innerText();
check('商店展示武器槽位', buildTitle.includes('/6'), buildTitle);

// 合成：补一件同名武器后，商店应出现合成入口
await page.evaluate(() => window.__hachicat.addWeapon('hairball'));
await page.waitForTimeout(250);
const synthBtn = page.locator('[data-testid="synthesize-hairball"]');
check('商店出现武器合成入口', await synthBtn.isVisible());
await synthBtn.click();
await page.waitForTimeout(250);
const afterSynth = await page.evaluate(() => window.__hachicat.state());
check(
  '合成后武器等级 +1',
  afterSynth.weapons.find((w) => w.id === 'hairball')?.level === 2,
  JSON.stringify(afterSynth.weapons)
);
check(
  '合成消耗一件武器',
  afterSynth.weapons.filter((w) => w.id === 'hairball').length === 1,
  JSON.stringify(afterSynth.weapons)
);

await page.evaluate(() => window.__hachicat.money(200));
await page.waitForTimeout(250);
const shotMoney = (await page.evaluate(() => window.__hachicat.state())).money;
const moneyBeforeBuy = shotMoney;
const offer0 = page.locator('[data-testid="buy-0"]');
const price0 = Number((await offer0.locator('.offer__price').innerText()).replace(/\D/g, ''));
await offer0.click();
await page.waitForTimeout(250);
const afterBuy = await page.evaluate(() => window.__hachicat.state());
check(
  '购买后扣款',
  afterBuy.money === moneyBeforeBuy - price0,
  `money=${afterBuy.money}, before=${moneyBeforeBuy}, price=${price0}`
);
check('购买后商品标记已购', afterBuy.shop.offers[0].sold === true);
await shot('08-shop-bought');

const hpBeforeHeal = 20;
await page.evaluate(() => {
  const g = window.__hachicat.controller.game;
  g.world.player.hp = 20;
  window.__hachicat.controller.publish();
});
await page.waitForTimeout(150);
const moneyBeforeHeal = (await page.evaluate(() => window.__hachicat.state())).money;
const healBtn = page.locator('.shop__sub-actions .btn').first();
const healLabel = await healBtn.innerText();
await healBtn.click();
await page.waitForTimeout(250);
const afterHeal = await page.evaluate(() => window.__hachicat.state());
check(
  '治疗生效且不超上限',
  afterHeal.hp > hpBeforeHeal && afterHeal.hp <= afterHeal.maxHp,
  `${hpBeforeHeal} → ${afterHeal.hp}/${afterHeal.maxHp} (${healLabel})`
);
check('治疗扣款', afterHeal.money < moneyBeforeHeal, `${moneyBeforeHeal} → ${afterHeal.money}`);

await page.locator('[data-testid="next-wave"]').click();
await page.waitForTimeout(1500);
const wave2 = await page.evaluate(() => window.__hachicat.state());
check('进入第 2 波', wave2.mode === 'battle' && wave2.wave === 2, `wave=${wave2.wave}`);
await shot('09-wave2');

/* ---------------- 6. 首领 ---------------- */
await page.evaluate(() => window.__hachicat.jumpWave(12));
await page.waitForTimeout(2200);
await shot('10-boss');
const bossState = await page.evaluate(() => window.__hachicat.state());
check('首领波触发', bossState.wave === 12 && bossState.bossWave === true);
check('首领血条出现', !!bossState.boss, `boss=${JSON.stringify(bossState.boss)}`);
check('首领血条 DOM 可见', await page.locator('.hud__boss').isVisible());

/* ------------- 7. 胜利 → 重开 → 失败 ------------- */
await page.evaluate(() => window.__hachicat.killBoss());
await page.waitForTimeout(900);
const victory = await page.evaluate(() => window.__hachicat.state());
check('击杀首领后结算', victory.mode === 'result', `mode=${victory.mode}`);
check('结算为胜利', victory.result?.victory === true);
check('最佳波次已保存', victory.bestWave === 12, `best=${victory.bestWave}`);
check(
  '委托报酬已结算',
  victory.result?.payout?.total > 0,
  JSON.stringify(victory.result?.payout)
);
check('胜利评价为 S', victory.result?.rank === 'S', `rank=${victory.result?.rank}`);
check(
  '结算页显示委托完成与报酬',
  (await page.locator('.result__eyebrow').innerText()).includes('委托完成') &&
    (await page.locator('.result__eyebrow').innerText()).includes('报酬 +')
);
check('结算标题为讨伐成功', (await page.locator('.result__title').innerText()) === '讨伐成功');
await shot('11-victory');

await page.locator('[data-testid="restart"]').click();
await page.waitForTimeout(1200);
const restarted = await page.evaluate(() => window.__hachicat.state());
check('重开回到第 1 波', restarted.mode === 'battle' && restarted.wave === 1);

await page.evaluate(() => window.__hachicat.lose());
await page.waitForTimeout(400);
const defeat = await page.evaluate(() => window.__hachicat.state());
check('失败结算', defeat.mode === 'result' && defeat.result?.victory === false);
check(
  '失败仍结算底薪',
  defeat.result?.payout?.total >= 30,
  JSON.stringify(defeat.result?.payout)
);
check(
  '失败也有评价',
  ['S', 'A', 'B', 'C'].includes(defeat.result?.rank),
  `rank=${defeat.result?.rank}`
);
await shot('12-defeat');

/* ---------------- 8. 主题与存档 ---------------- */
await page.locator('text=主菜单').click();
await page.waitForTimeout(300);
await page.locator('.segmented__btn', { hasText: '纸片白日' }).click();
await page.waitForTimeout(300);
const theme = await page.evaluate(() => ({
  theme: document.documentElement.dataset.theme,
  bg: getComputedStyle(document.body).backgroundColor,
  stored: JSON.parse(localStorage.getItem('hachicat.settings.v1') || '{}'),
}));
check('主题切到纸片白日', theme.theme === 'paper', theme.bg);
check('主题已持久化', theme.stored.theme === 'paper');
await shot('13-paper-menu');

await page.locator('[data-testid="start-game"]').click();
await page.waitForTimeout(200);
check('解锁角色可用', !(await page.locator('[data-testid="char-shadow"]').isDisabled()));
await page.locator('[data-testid="char-shadow"]').click();
await page.locator('[data-testid="start-run"]').click();
await page.waitForTimeout(1400);
await shot('14-paper-battle');
check(
  '纸片主题下的战斗',
  (await page.evaluate(() => window.__hachicat.state().mode)) === 'battle'
);
const paperStats = await canvasStats();
check('纸片主题 Canvas 有内容', !!paperStats && paperStats.max - paperStats.min > 20, JSON.stringify(paperStats));

/* ---------------- 9. 小屏适配 ---------------- */
await page.setViewportSize({ width: 360, height: 640 });
await page.waitForTimeout(500);
const small = await page.evaluate(() => ({
  innerW: innerWidth,
  scrollW: document.documentElement.scrollWidth,
  innerH: innerHeight,
  scrollH: document.documentElement.scrollHeight,
}));
check('360×640 无横向溢出', small.scrollW <= small.innerW + 1, JSON.stringify(small));
await shot('15-small-battle');

/* ---------------- 10. 性能 ---------------- */
const perf = await page.evaluate(
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
          const worst = Math.max(...frames);
          resolve({
            frames: frames.length,
            avgMs: Math.round(avg * 10) / 10,
            fps: Math.round(1000 / avg),
            worstMs: Math.round(worst * 10) / 10,
          });
        }
      }
      requestAnimationFrame(tick);
    })
);
check('帧率 ≥ 50fps', perf.fps >= 50, JSON.stringify(perf));

/* ---------------- 结果 ---------------- */
console.log('\n--- 控制台错误 ---');
console.log(errors.length ? errors.join('\n') : '无');
check('无运行时报错', errors.length === 0, errors.slice(0, 3).join(' | '));

console.log(`\n通过 ${results.length - failures}/${results.length}`);
await browser.close();
process.exit(failures ? 1 : 0);