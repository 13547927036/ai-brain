import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTER_BY_ID } from '../content/characters.js';
import { ITEMS, itemsByTier } from '../content/items.js';
import { buySlot, priceOf, rerollCost, generateShop, toggleLock, addWeapon } from './shop.js';
import { rollUpgradeChoices, rollTier, applyUpgrade, MAIN_STAT_AMOUNT } from './upgrade.js';
import { advance, beginWave, chooseUpgrade, createRun, runWaveToCompletion, startNextWave, type Run, type RunPhase } from './run.js';
import { mulberry32 } from './rng.js';
/** 读 phase 时绕过 TS 控制流收窄：run 的 phase 会被 advance/chooseUpgrade 改写 */
function phaseOf(run: Run): RunPhase {
  return run.phase;
}

// ---------- 商店 ----------

test('价格公式 = ceil(基础价 × (1 + 0.35 × (波数−1)))', () => {
  assert.equal(priceOf(8, 1), 8);
  assert.equal(priceOf(8, 2), Math.ceil(8 * 1.35));
  assert.equal(priceOf(10, 5), Math.ceil(10 * (1 + 0.35 * 4)));
});

test('重掷费用 = 1 + 波数，每次再 +1', () => {
  assert.equal(rerollCost({ wave: 3, slots: [], rerolls: 0 }), 4);
  assert.equal(rerollCost({ wave: 3, slots: [], rerolls: 2 }), 6);
});

test('商店 4 个货位且至少 1 个武器', () => {
  const w = createRun({ characterId: 'hachiware', seed: 5 }).world;
  for (let seed = 1; seed <= 20; seed++) {
    const ww = createRun({ characterId: 'hachiware', seed }).world;
    const shop = generateShop(ww, 1);
    assert.equal(shop.slots.length, 4);
    assert.ok(shop.slots.filter((s) => s.kind === 'weapon').length >= 1, '保底至少 1 个武器');
  }
  void w;
});

test('锁定货位在重掷后保留', async () => {
  const { rerollShop } = await import('./shop.js');
  const run = createRun({ characterId: 'hachiware', seed: 11 });
  const shop = generateShop(run.world, 1);
  toggleLock(shop, 0);
  const before = shop.slots[0]?.contentId;
  rerollShop(run.world, shop);
  assert.equal(shop.slots[0]?.locked, true);
  assert.equal(shop.slots[0]?.contentId, before);
});

test('材料不足时购买失败且不扣钱', () => {
  const run = createRun({ characterId: 'hachiware', seed: 3 });
  const shop = generateShop(run.world, 1);
  run.world.player.materials = 0;
  assert.equal(buySlot(run.world, shop, 0), false);
  assert.equal(run.world.player.materials, 0);
  assert.equal(shop.slots[0]?.sold, false);
});

test('武器槽满时同名同品质武器走合成升阶', () => {
  const run = createRun({ characterId: 'usagi', seed: 2 });
  const w = run.world;
  const q = w.player.weapons[0]?.quality ?? 1;
  const before = w.player.weapons.length;
  const ok = addWeapon(w, 'club', q);
  assert.equal(ok, true);
  assert.equal(w.player.weapons.length, before, '不应新增槽位');
  assert.equal(w.player.weapons[0]?.quality, q + 1);
});

// ---------- 道具 ----------

test('24 件道具，四档各 6 件', () => {
  assert.equal(ITEMS.length, 24);
  for (const tier of [1, 2, 3, 4] as const) {
    assert.equal(itemsByTier(tier).length, 6, `第 ${tier} 档应有 6 件`);
  }
});

test('道具 id 唯一', () => {
  const ids = new Set(ITEMS.map((i) => i.id));
  assert.equal(ids.size, ITEMS.length);
});

// ---------- 升级 ----------

test('升级档位权重边界正确', () => {
  assert.equal(rollTier(0), 'common');
  assert.equal(rollTier(0.59), 'common');
  assert.equal(rollTier(0.61), 'uncommon');
  assert.equal(rollTier(0.89), 'uncommon');
  assert.equal(rollTier(0.91), 'rare');
  assert.equal(rollTier(0.999), 'rare');
});

test('主属性增益量 +3 / +6 / +10', () => {
  assert.equal(MAIN_STAT_AMOUNT.common, 3);
  assert.equal(MAIN_STAT_AMOUNT.uncommon, 6);
  assert.equal(MAIN_STAT_AMOUNT.rare, 10);
});

test('三选一互不重复', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const w = createRun({ characterId: 'hachiware', seed }).world;
    const choices = rollUpgradeChoices(w);
    assert.equal(choices.length, 3);
    assert.equal(new Set(choices.map((c) => c.stat)).size, 3, '三条属性不应重复');
  }
});

test('应用升级后属性真的增加', () => {
  const w = createRun({ characterId: 'hachiware', seed: 1 }).world;
  const c = rollUpgradeChoices(w)[0];
  assert.ok(c);
  const before = w.player.stats[c.stat];
  applyUpgrade(w, c);
  assert.equal(w.player.stats[c.stat], before + c.amount);
});

// ---------- 角色规则 ----------

test('吉伊卡哇：生命 −25%，幸运获取 ×1.5', () => {
  const run = createRun({ characterId: 'chiikawa', seed: 1 });
  assert.equal(run.world.player.maxHp, Math.round(60 * 0.75));
  assert.equal(run.world.player.statMul.luck, 1.5);
  applyUpgrade(run.world, { stat: 'luck', amount: 10, tier: 'rare', isSub: false, label: '幸运' });
  assert.equal(run.world.player.stats.luck, 15, '幸运 +10 应因 ×1.5 变成 +15');
});

test('小八：材料与经验 +25%，初始 4 槽', () => {
  const run = createRun({ characterId: 'hachiware', seed: 1 });
  assert.equal(run.world.player.materialXpMul, 1.25);
  assert.equal(run.world.player.weaponSlots, 4);
});

test('乌萨奇：攻速获取 ×1.4，护甲锁定', () => {
  const run = createRun({ characterId: 'usagi', seed: 1 });
  assert.equal(run.world.player.statMul.attackSpeed, 1.4);
  assert.equal(CHARACTER_BY_ID.usagi?.armorLocked, true);
});

// ---------- 完整一局 ----------

/**
 * 测试用「机器人玩家」：会朝最近的敌人走，进入武器射程后停下。
 * 不做这件事的话，近战武器永远等不到敌人（竞技场 1334 高，敌人 60px/s 要走 11 秒），
 * 测出来的不是游戏难度而是机器人的智商。
 */
function botSteer(run: Run): void {
  const w = run.world;
  const p = w.player;
  let best: { x: number; y: number } | null = null;
  let bestSq = Infinity;
  for (let i = 0; i < w.enemies.length; i++) {
    const e = w.enemies.items[i];
    if (!e || e.hp <= 0) continue;
    const dx = e.x - p.x;
    const dy = e.y - p.y;
    const sq = dx * dx + dy * dy;
    if (sq < bestSq) { bestSq = sq; best = e; }
  }
  if (!best) { p.inputX = 0; p.inputY = 0; return; }
  const dx = best.x - p.x;
  const dy = best.y - p.y;
  const d = Math.hypot(dx, dy) || 1;
  const want = 55;
  const dir = d > want ? 1 : -1;
  p.inputX = (dx / d) * dir;
  p.inputY = (dy / d) * dir;
}

function botWave(run: Run): void {
  let guard = 0;
  while (run.phase === 'battle' && guard++ < 60000) {
    botSteer(run);
    advance(run, 1 / 60);
  }
}
function autoPlay(characterId: string, seed: number): { waves: number; victory: boolean; level: number } {
  const run: Run = createRun({ characterId, seed });
  beginWave(run, 1);
  let wave = 1;

  for (let guard = 0; guard < 200; guard++) {
    botWave(run);
    if (run.phase === 'defeat') return { waves: wave, victory: false, level: run.world.player.level };

    while (run.phase === 'levelUp') chooseUpgrade(run, 0);

    if (run.phase === 'victory') return { waves: wave, victory: true, level: run.world.player.level };
    if (run.phase !== 'shop' || !run.shop) break;

    for (let i = 0; i < run.shop.slots.length; i++) buySlot(run.world, run.shop, i);

    if (!startNextWave(run)) {
      return { waves: wave, victory: phaseOf(run) === 'victory', level: run.world.player.level };
    }
    wave++;
  }
  return { waves: wave, victory: false, level: run.world.player.level };
}

test('带商店与升级的完整一局能打到第 7 波以后', () => {
  const r = autoPlay('hachiware', 2026);
  assert.ok(r.waves >= 7, `应比裸打（第 5~6 波阵亡）走得更远，实际第 ${r.waves} 波`);
});

test('不同种子都能稳定推进到中后期', () => {
  const results = [7, 99, 123].map((s) => autoPlay('hachiware', s));
  for (const r of results) {
    assert.ok(r.waves >= 6, `第 ${r.waves} 波太早结束（${JSON.stringify(r)}）`);
  }
});

test('整局流程状态机：battle → levelUp → shop 的顺序正确', () => {
  const run = createRun({ characterId: 'chiikawa', seed: 4 });
  beginWave(run, 1);
  assert.equal(phaseOf(run), 'battle');
  runWaveToCompletion(run);
  const afterWave = phaseOf(run);
  assert.ok(afterWave === 'levelUp' || afterWave === 'shop', `波末应进入结算，实际 ${afterWave}`);
  while (phaseOf(run) === 'levelUp') chooseUpgrade(run, 0);
  assert.equal(run.phase, 'shop');
  assert.ok(run.shop);
  assert.equal(run.shop?.slots.length, 4);
});

test('advance 在非战斗阶段不推进逻辑', () => {
  const run = createRun({ characterId: 'hachiware', seed: 1 });
  beginWave(run, 1);
  runWaveToCompletion(run);
  const frame = run.world.frame;
  advance(run, 1 / 60);
  assert.equal(run.world.frame, frame, '非 battle 阶段不应推进逻辑帧');
});
