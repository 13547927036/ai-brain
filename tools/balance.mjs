/**
 * 平衡测量。
 *
 * spec 里 M2 的验收标准是「能完整通关一局」。之前测试里的 bot 只活到第 6~10 波，
 * 说明这个标准没有真正达标。这个脚本用一个「会玩」的 bot 跑多个种子，
 * 输出存活波次分布和通关率，用来判断该不该调数值。
 */
import { advance, beginWave, chooseUpgrade, createRun, startNextWave } from '../dist/core/run.js';
import { buySlot } from '../dist/core/shop.js';
import { WAVE_COUNT } from '../dist/content/waves.js';

const DT = 1 / 60;
const MAX_FRAMES = 60 * 60 * 14;

/** 属性优先级：活着靠伤害，伤害靠攻速 */
const PRIORITY = {
  attackSpeed: 1.3,
  meleeDamage: 1.15,
  rangedDamage: 1.15,
  maxHp: 0.9,
  armor: 0.8,
  dodge: 0.7,
  regen: 0.6,
  critChance: 0.6,
  moveSpeed: 0.35,
  knockback: 0.2,
  pickupRange: 0.2,
  luck: 0.15,
  luckDrop: 0.1,
};

function nearestEnemy(world) {
  const p = world.player;
  let best = null;
  let bestD = Infinity;
  const pool = world.enemies;
  for (let i = 0; i < pool.length; i++) {
    const e = pool.items[i];
    if (!e || e.hp <= 0) continue;
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best ? { e: best, d: bestD } : null;
}

/** 远则靠近，近则拉开，避免贴脸硬吃伤害 */
function steer(world) {
  const p = world.player;
  const n = nearestEnemy(world);
  if (!n) {
    p.inputX = 0;
    p.inputY = 0;
    return;
  }
  const dx = n.e.x - p.x;
  const dy = n.e.y - p.y;
  const len = Math.hypot(dx, dy) || 1;
  const sign = n.d > 52 ? 1 : -1;
  p.inputX = (dx / len) * sign;
  p.inputY = (dy / len) * sign;
}

function bestUpgrade(run) {
  let best = 0;
  let bestScore = -1;
  run.choices.forEach((c, i) => {
    const w = PRIORITY[c.stat] ?? 0.1;
    const score = w * (1 + c.amount / 10);
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return best;
}

function shopPolicy(run) {
  const world = run.world;
  for (let guard = 0; guard < 24; guard++) {
    if (!run.shop) return;
    const slots = run.shop.slots;
    const free = world.player.weaponSlots - world.player.weapons.length;
    let idx = -1;
    if (free > 0) {
      idx = slots.findIndex((s) => !s.sold && s.kind === 'weapon' && s.price <= world.player.materials);
    }
    if (idx < 0) {
      idx = slots.findIndex((s) => !s.sold && s.kind === 'item' && s.price <= world.player.materials);
    }
    if (idx < 0) return;
    if (!buySlot(world, run.shop, idx)) return;
  }
}

function playRun(seed, characterId) {
  const run = createRun({ characterId, seed });
  beginWave(run, 1);
  let frames = 0;
  while (frames < MAX_FRAMES) {
    if (run.phase === 'battle') {
      steer(run.world);
      advance(run, DT);
      frames++;
      continue;
    }
    if (run.phase === 'levelUp') {
      chooseUpgrade(run, bestUpgrade(run));
      continue;
    }
    if (run.phase === 'shop') {
      shopPolicy(run);
      startNextWave(run);
      continue;
    }
    break;
  }
  return {
    wave: run.world.wave.index,
    phase: run.phase,
    victory: run.phase === 'victory',
    defeat: run.phase === 'defeat',
    hp: run.world.player.hp,
    maxHp: run.world.player.maxHp,
    weapons: run.world.player.weapons.length,
    slots: run.world.player.weaponSlots,
    level: run.world.player.level,
    enemiesLeft: run.world.enemies.length,
  };
}

const characters = process.argv[2] ? [process.argv[2]] : ['chiikawa', 'hachiware', 'usagi'];
const seeds = Number(process.argv[3] ?? 24);

for (const c of characters) {
  const waves = [];
  const results = [];
  let wins = 0;
  let wsum = 0;
  for (let i = 0; i < seeds; i++) {
    const seed = 1000 + i * 37;
    const r = playRun(seed, c);
    results.push(r);
    waves.push(r.wave);
    wsum += r.wave;
    if (r.victory) wins++;
  }
  waves.sort((a, b) => a - b);
  const phases = {};
  for (const r of results) phases[r.phase] = (phases[r.phase] ?? 0) + 1;
  const w12 = results.filter((r) => r.wave === WAVE_COUNT);
  const w12dead = w12.filter((r) => r.phase === 'defeat').length;
  console.log('  结局分布:', JSON.stringify(phases));
  console.log('  到达第 12 波:', w12.length, '其中死在 12 波:', w12dead);
  const avgOf = (list, f) => (list.length ? (list.reduce((a, r) => a + f(r), 0) / list.length).toFixed(1) : '-');
  const ref = w12.length ? w12 : results;
  console.log(
    '  终局配置: 武器', avgOf(ref, (r) => r.weapons), '/', avgOf(ref, (r) => r.slots),
    ' 等级', avgOf(ref, (r) => r.level),
    ' 上限血', avgOf(ref, (r) => r.maxHp),
    ' 剩余敌人', avgOf(ref, (r) => r.enemiesLeft),
  );
  const median = waves[Math.floor(waves.length / 2)];
  console.log(
    `${c.padEnd(10)} 通关 ${wins}/${seeds}  平均波次 ${(wsum / seeds).toFixed(1)}  中位 ${median}  分布 ${waves.join(',')}`,
  );
}
