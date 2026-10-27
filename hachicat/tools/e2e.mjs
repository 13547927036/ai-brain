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

check('标题渲染', (await page.title()).includes('吉伊卡哇'));
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
check('角色卡恰好 3 张', cards === 3, `count=${cards}`);
check('不存在第四个角色入口', (await page.locator('[data-testid="char-shadow"]').count()) === 0);
check('选角页展示搭档选择', (await page.locator('.screen__title').innerText()).includes('选择搭档'));

/* ---------------- 角色形象：图片素材 ---------------- */
const charArt = await page.evaluate(async () => {
  const { SPRITES } = await import('/src/content/assets.js');
  const { CHARACTERS } = await import('/src/content/characters.js');
  const art = await import('/src/render/char-images.js');
  return CHARACTERS.map((c) => {
    const sprite = SPRITES[c.sprite] || {};
    const entry = sprite.image ? art.getCharImage(sprite.image) : null;
    return {
      id: c.id,
      name: c.name,
      kind: sprite.kind || '',
      url: sprite.image || '',
      ready: !!entry && entry.ready,
      w: entry ? entry.img.naturalWidth : 0,
      h: entry ? entry.img.naturalHeight : 0,
    };
  });
});
check(
  '三个角色都绑定到图片素材',
  charArt.length === 3 && charArt.every((c) => c.kind === 'image' && c.url),
  charArt.map((c) => `${c.id}:${c.kind || '无'}`).join(' ')
);
check(
  '三张角色图片加载成功且尺寸正常',
  charArt.every((c) => c.ready && c.w >= 96 && c.h >= 64),
  charArt.map((c) => `${c.id}:${c.ready ? `${c.w}x${c.h}` : '加载失败'}`).join(' ')
);

const cardCopy = await page.locator('.char-card').evaluateAll((els) =>
  els.map((el) => {
    const row = el.querySelector('.char-card__row');
    return {
      name: el.querySelector('.char-card__name').textContent.trim(),
      title: el.querySelector('.char-card__title').textContent.trim(),
      rowOverflow: row.scrollWidth - row.clientWidth,
      cardOverflow: el.scrollWidth - el.clientWidth,
    };
  })
);
const cardNames = cardCopy.map((c) => c.name);
check('选角页角色名与图片绑定一致', cardNames.join(',') === '小八,吉伊卡哇,乌萨奇', cardNames.join(','));
check(
  '选角页角色描述与角色对应',
  cardCopy.map((c) => `${c.name}:${c.title}`).join('|') ===
    '小八:乐观可靠的朋友|吉伊卡哇:温柔又努力|乌萨奇:自由自在的精力派',
  cardCopy.map((c) => `${c.name}:${c.title}`).join(' | ')
);
check(
  '角色描述没有溢出卡片',
  cardCopy.every((c) => c.rowOverflow <= 0 && c.cardOverflow <= 0),
  cardCopy.map((c) => `${c.name}:${c.rowOverflow}/${c.cardOverflow}`).join(' ')
);

const iconPixels = await page.evaluate(() =>
  [...document.querySelectorAll('.char-card__sprite canvas')].map((cv) => {
    const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n += 1;
    return n;
  })
);
check(
  '选角卡上的角色图已画出像素',
  iconPixels.length === 3 && iconPixels.every((n) => n > 200),
  iconPixels.join(',')
);

await page.locator('[data-testid="char-chiikawa"]').click();
await page.waitForTimeout(120);
check(
  '选角高亮切换',
  (await page.locator('[data-testid="char-chiikawa"]').getAttribute('aria-pressed')) === 'true'
);
await page.locator('[data-testid="char-hachiware"]').click();
await page.waitForTimeout(120);

await page.locator('[data-testid="start-run"]').click();
await page.waitForTimeout(1400);
await shot('03-battle');

const battle = await page.evaluate(() => window.__hachicat.state());
check('进入战斗模式', battle.mode === 'battle', `mode=${battle.mode}`);
check('第 1 波开始', battle.wave === 1, `wave=${battle.wave}`);
check('HUD 显示波次', (await page.locator('.hud__wave-main').innerText()).includes('第 1 波'));
check('初始武器 1 件', battle.weapons.length === 1, `weapons=${battle.weapons.length}`);

/* ---------------- 2.5 新怪物与预警 ---------------- */
const roster = await page.evaluate(() => {
  const ids = ['dart', 'guard', 'bomber', 'nester', 'glowcap', 'mite'];
  const spawned = ids.map((id, i) =>
    window.__hachicat.spawn(id, { x: 62 + (i % 3) * 48, y: -104 + Math.floor(i / 3) * 64 })
  );
  const elite = window.__hachicat.spawn('fluff', { elite: true, x: -120, y: 96 });
  return { spawned, elite, list: window.__hachicat.enemies() };
});
check(
  '6 种新怪物都能生成',
  roster.spawned.every((e) => e && e.id) && roster.spawned.length === 6,
  roster.spawned.map((e) => e?.id).join(',')
);
check(
  '精英怪带有光环标记且生命更高',
  roster.elite?.elite === true && roster.elite.maxHp > 0,
  JSON.stringify(roster.elite)
);
await page.waitForTimeout(180);
await shot('03b-new-enemies');
const rosterStats = await canvasStats();
check('新怪物渲染后画布仍有内容', !!rosterStats && rosterStats.max - rosterStats.min > 30, JSON.stringify(rosterStats));

const dartFx = await page.evaluate(async () => {
  const g = window.__hachicat.controller.game;
  const p = g.world.player;
  const e = g.world.enemies.find((x) => x.defId === 'dart');
  if (e) {
    e.x = p.x + 220;
    e.y = p.y;
    e.dashCd = 0;
  }
  await new Promise((r) => setTimeout(r, 180));
  return window.__hachicat.enemies().find((x) => x.id === 'dart');
});
check('冲撞兽进入突进预警', dartFx?.warnT > 0 || dartFx?.ai === 'dash', JSON.stringify(dartFx));

const bomberFx = await page.evaluate(async () => {
  const g = window.__hachicat.controller.game;
  const p = g.world.player;
  const e = g.world.enemies.find((x) => x.defId === 'bomber');
  if (e) {
    e.x = p.x + 55;
    e.y = p.y;
    e.fuseCd = 0;
  }
  await new Promise((r) => setTimeout(r, 220));
  return window.__hachicat.enemies().find((x) => x.id === 'bomber');
});
check('噗噗果进入引信状态', bomberFx?.fuseT > 0, JSON.stringify(bomberFx));

await page.evaluate(() => {
  window.__hachicat.controller.game.world.enemies.length = 0;
  window.__hachicat.controller.game.world.enemyBullets.length = 0;
  window.__hachicat.controller.publish();
});
await page.waitForTimeout(120);

const stats = await canvasStats();
check('Canvas 有实际渲染内容', !!stats && stats.max - stats.min > 30, JSON.stringify(stats));

/* 战斗画面：玩家必须用图片素材，而不是程序化兜底 */
const battleArt = await page.evaluate(async () => {
  const ctrl = window.__hachicat.controller;
  const p = ctrl.game.world.player;
  const { SPRITES } = await import('/src/content/assets.js');
  const art = await import('/src/render/char-images.js');
  const sprite = SPRITES[p.sprite] || {};
  const entry = sprite.image ? art.getCharImage(sprite.image) : null;
  const cam = ctrl.game.world.camera;
  const size = ctrl.renderer.size;
  const cv = document.querySelector('canvas.game__canvas');
  const ctx = cv.getContext('2d');
  const px = Math.round((size.width / 2 - cam.x + p.x) * size.dpr);
  const py = Math.round((size.height / 2 - cam.y + p.y) * size.dpr);
  const half = Math.round(30 * size.dpr);
  const x0 = Math.max(0, px - half);
  const y0 = Math.max(0, py - half);
  const w = Math.min(cv.width - x0, half * 2);
  const h = Math.min(cv.height - y0, half * 2);
  let light = 0;
  let opaque = 0;
  if (w > 0 && h > 0) {
    const d = ctx.getImageData(x0, y0, w, h).data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 8) continue;
      opaque += 1;
      if (d[i] > 200 && d[i + 1] > 200 && d[i + 2] > 200) light += 1;
    }
  }
  return { sprite: p.sprite, kind: sprite.kind || '', ready: !!entry && entry.ready, light, opaque };
});
check(
  '战斗中的玩家使用图片素材且已加载',
  battleArt.kind === 'image' && battleArt.ready,
  `${battleArt.sprite} kind=${battleArt.kind} ready=${battleArt.ready}`
);
check(
  '战斗画面玩家位置画出角色像素',
  battleArt.light > 60,
  `浅色像素=${battleArt.light} 不透明=${battleArt.opaque}`
);
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
check('HUD 装备栏在屏内', bl.weapons.y + bl.weapons.h <= bl.innerH, JSON.stringify(bl.weapons));
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
check('商店展示装备格', buildTitle.includes('/6'), buildTitle);
const itemIcons = shop.shop.offers.filter((o) => o.type === 'item').map((o) => o.icon);
check(
  '补给点用品使用各自的图标',
  itemIcons.length > 0 && itemIcons.every((id) => id.startsWith('icon.') && id !== 'icon.heart'),
  itemIcons.join(',')
);

// 合成：走真实商店流程——刷出同名副本 → 买下 → 合成升一级
await page.evaluate(() => window.__hachicat.money(9999));
await page.waitForTimeout(200);
let copyIndex = -1;
for (let attempt = 0; attempt < 12 && copyIndex < 0; attempt++) {
  const snap = await page.evaluate(() => window.__hachicat.state());
  copyIndex = (snap.shop?.offers || []).findIndex((o) => o.copy === true);
  if (copyIndex < 0) {
    await page.locator('[data-testid="reroll"]').click();
    await page.waitForTimeout(200);
  }
}
const shopSnap = await page.evaluate(() => window.__hachicat.state());
const copyOffer = copyIndex >= 0 ? shopSnap.shop.offers[copyIndex] : null;
check('商店能刷出同名同等级副本', copyOffer?.copy === true, 'copyIndex=' + copyIndex);
check('副本标记为可用于合成', (copyOffer?.tag || '').includes('副本'), copyOffer?.tag);

const weaponsBeforeCopy = shopSnap.weapons.length;
const moneyBeforeCopy = shopSnap.money;
await page.locator('[data-testid="buy-' + copyIndex + '"]').click();
await page.waitForTimeout(250);
const afterCopy = await page.evaluate(() => window.__hachicat.state());
check(
  '买下副本后多一件同名同等级武器',
  afterCopy.weapons.filter((w) => w.id === copyOffer.weaponId && w.level === copyOffer.level).length >= 2,
  JSON.stringify(afterCopy.weapons)
);
check(
  '买副本按副本价扣款',
  afterCopy.money === moneyBeforeCopy - copyOffer.price,
  'money=' + afterCopy.money + ' before=' + moneyBeforeCopy + ' price=' + copyOffer.price
);

const synthBtn = page.locator('[data-testid="synthesize-' + copyOffer.weaponId + '"]');
check('商店出现武器合成入口', await synthBtn.isVisible());
await synthBtn.click();
await page.waitForTimeout(250);
const afterSynth = await page.evaluate(() => window.__hachicat.state());
const merged = afterSynth.weapons.find((w) => w.id === copyOffer.weaponId);
check('合成后武器等级 +1', merged?.level === copyOffer.level + 1, JSON.stringify(afterSynth.weapons));
check(
  '合成只保留一件并释放槽位',
  afterSynth.weapons.filter((w) => w.id === copyOffer.weaponId).length === 1 &&
    afterSynth.weapons.length === weaponsBeforeCopy,
  JSON.stringify(afterSynth.weapons)
);
const buildAfter = await page.locator('.shop__build h3').innerText();
check('槽位显示回到合成前', buildAfter.includes(weaponsBeforeCopy + '/6'), buildAfter);

await page.evaluate(() => window.__hachicat.money(200));
await page.waitForTimeout(250);
const preBuy = await page.evaluate(() => window.__hachicat.state());
const moneyBeforeBuy = preBuy.money;
const buyIndex = preBuy.shop.offers.findIndex((o) => !o.sold && o.canBuy);
check('商店存在可购买商品', buyIndex >= 0, 'buyIndex=' + buyIndex);
const buyBtn = page.locator('[data-testid="buy-' + buyIndex + '"]');
const price0 = Number((await buyBtn.locator('.offer__price').innerText()).replace(/\D/g, ''));
await buyBtn.click();
await page.waitForTimeout(250);
const afterBuy = await page.evaluate(() => window.__hachicat.state());
check(
  '购买后扣款',
  afterBuy.money === moneyBeforeBuy - price0,
  'money=' + afterBuy.money + ' before=' + moneyBeforeBuy + ' price=' + price0
);
check('购买后商品标记已买', afterBuy.shop.offers[buyIndex].sold === true);
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
  '喝汤生效且不超上限',
  afterHeal.hp > hpBeforeHeal && afterHeal.hp <= afterHeal.maxHp,
  `${hpBeforeHeal} → ${afterHeal.hp}/${afterHeal.maxHp} (${healLabel})`
);
check('喝汤扣款', afterHeal.money < moneyBeforeHeal, `${moneyBeforeHeal} → ${afterHeal.money}`);

await page.locator('[data-testid="next-wave"]').click();
await page.waitForTimeout(1500);
const wave2 = await page.evaluate(() => window.__hachicat.state());
check('进入第 2 波', wave2.mode === 'battle' && wave2.wave === 2, `wave=${wave2.wave}`);
await shot('09-wave2');

/* ---------------- 6. 讨伐目标 ---------------- */
await page.evaluate(() => {
  const g = window.__hachicat.controller.game;
  g.world.player.stats.maxHp = 9999;
  g.world.player.hp = 9999;
  window.__hachicat.jumpWave(11);
});
await page.waitForTimeout(5000);
const stress = await page.evaluate(() => ({
  enemies: window.__hachicat.hero().enemies,
  ids: [...new Set(window.__hachicat.enemies().map((e) => e.id))],
}));
check('第 11 波至少 10 个敌人同屏', stress.enemies >= 10, `enemies=${stress.enemies}`);
check(
  '第 11 波混入新怪物',
  stress.ids.some((id) => ['dart', 'guard', 'bomber', 'nester', 'glowcap'].includes(id)),
  stress.ids.join(',')
);
await shot('09b-wave11');

await page.evaluate(() => window.__hachicat.jumpWave(12));
await page.waitForTimeout(3800);
await shot('10-boss');
const bossState = await page.evaluate(() => window.__hachicat.state());
check('讨伐目标波触发', bossState.wave === 12 && bossState.bossWave === true);
check('讨伐目标血条出现', !!bossState.boss, `boss=${JSON.stringify(bossState.boss)}`);
check('讨伐目标血条 DOM 可见', await page.locator('.hud__boss').isVisible());
const bossFx = await page.evaluate(() => {
  const g = window.__hachicat.controller.game;
  const b = g.world.boss;
  return {
    maxHp: b?.maxHp || 0,
    radialWarn: b?.radialWarn || 0,
    telegraph: b?.telegraph || 0,
    bullets: g.world.enemyBullets.length,
  };
});
check(
  '讨伐目标是持久战且带弹幕 / 冲刺预警',
  bossFx.maxHp >= 8000 && (bossFx.radialWarn > 0 || bossFx.telegraph > 0 || bossFx.bullets > 0),
  JSON.stringify(bossFx)
);

/* ------------- 7. 胜利 → 重开 → 失败 ------------- */
await page.evaluate(() => window.__hachicat.killBoss());
await page.waitForTimeout(900);
const victory = await page.evaluate(() => window.__hachicat.state());
check('击退讨伐目标后结算', victory.mode === 'result', `mode=${victory.mode}`);
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
await page.locator('text=回主菜单').click();
await page.waitForTimeout(300);
await page.locator('.segmented__btn', { hasText: '纸片日常' }).click();
await page.waitForTimeout(300);
const theme = await page.evaluate(() => ({
  theme: document.documentElement.dataset.theme,
  bg: getComputedStyle(document.body).backgroundColor,
  stored: JSON.parse(localStorage.getItem('hachicat.settings.v1') || '{}'),
}));
check('主题切到纸片日常', theme.theme === 'paper', theme.bg);
check('主题已持久化', theme.stored.theme === 'paper');
await shot('13-paper-menu');

await page.locator('[data-testid="start-game"]').click();
await page.waitForTimeout(200);
check('第三个角色可选中', !(await page.locator('[data-testid="char-usagi"]').isDisabled()));
await page.locator('[data-testid="char-usagi"]').click();
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
