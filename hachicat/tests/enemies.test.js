import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld } from '../src/game/world.js';
import { createRng } from '../src/game/rng.js';
import { spawnEnemy, stepEnemies } from '../src/game/systems/enemies.js';
import { damageEnemy } from '../src/game/systems/damage.js';
import { ENEMY_BY_ID, BOSSES, scaleEnemy } from '../src/content/enemies.js';

function makeWorld(seed = 1) {
  const w = createWorld({ characterId: 'hachiware', seed });
  w.rng = createRng(seed);
  w.waveIndex = 7;
  w.waveMaxAlive = 99;
  w.player.invuln = 0;
  w.player.stats.armor = 0;
  w.enemies.length = 0;
  return w;
}

function step(w, seconds, dt = 1 / 60) {
  const n = Math.max(1, Math.round(seconds / dt));
  for (let i = 0; i < n; i++) stepEnemies(w, dt);
}

test('冲撞兽：先预警锁定方向，再高速突进', () => {
  const w = makeWorld(2);
  const p = w.player;
  const e = spawnEnemy(w, scaleEnemy(ENEMY_BY_ID.dart, 4), p.x + 250, p.y, w.rng);
  e.dashCd = 0;
  const x0 = e.x;

  step(w, 0.2);
  assert.ok(e.warnT > 0, '应先进入预警');
  assert.equal(e.warnKind, 'dash');
  assert.ok(w.stats.dashWarns > 0, '应记录突进预警次数');
  assert.ok(Math.abs(e.x - x0) < 10, '预警期间不应高速移动');

  step(w, 0.45);
  assert.ok(e.dashT > 0, '预警结束后应开始突进');
  const x1 = e.x;
  step(w, 0.2);
  assert.ok(Math.abs(e.x - x1) > 60, `突进位移过小：${Math.abs(e.x - x1).toFixed(1)}`);
});

test('铁甲虫：远距离弹道 / 射线减伤，贴身与陷阱不打折', () => {
  const w = makeWorld(3);
  const p = w.player;

  const ranged = spawnEnemy(w, scaleEnemy(ENEMY_BY_ID.guard, 5), p.x + 220, p.y, w.rng);
  const beforeRanged = ranged.hp;
  damageEnemy(w, ranged, 100, { sourceKind: 'projectile' });
  const rangedLoss = beforeRanged - ranged.hp;

  const melee = spawnEnemy(w, scaleEnemy(ENEMY_BY_ID.guard, 5), p.x + 220, p.y + 30, w.rng);
  const beforeMelee = melee.hp;
  damageEnemy(w, melee, 100, { sourceKind: 'melee' });
  const meleeLoss = beforeMelee - melee.hp;

  const trap = spawnEnemy(w, scaleEnemy(ENEMY_BY_ID.guard, 5), p.x + 220, p.y - 30, w.rng);
  const beforeTrap = trap.hp;
  damageEnemy(w, trap, 100, { sourceKind: 'trap' });
  const trapLoss = beforeTrap - trap.hp;

  assert.ok(rangedLoss > 0, '远程伤害不应被完全免疫');
  assert.ok(rangedLoss < meleeLoss * 0.6, `远程减伤无效：${rangedLoss} vs ${meleeLoss}`);
  assert.equal(trapLoss, meleeLoss, '陷阱应与近战同样结算');
});

test('噗噗果：引信结束后爆炸伤害玩家，自爆不掉金币', () => {
  const w = makeWorld(4);
  const p = w.player;
  p.x = 400;
  p.y = 700;
  const e = spawnEnemy(w, scaleEnemy(ENEMY_BY_ID.bomber, 6), p.x + 50, p.y, w.rng);
  e.fuseCd = 0;
  const hp0 = p.hp;

  step(w, 0.1);
  assert.ok(e.fuseT > 0, '贴近后应进入引信');
  step(w, 1.2);

  assert.ok(e.dead, '引信结束应自爆死亡');
  assert.ok(p.hp < hp0, `玩家应受到爆炸伤害：${p.hp}/${hp0}`);
  assert.equal(w.stats.bombFuses, 1, '应记录引信次数');
  assert.equal(w.stats.kills, 1, '自爆仍计入击杀');
  assert.equal(w.pickups.filter((it) => it.kind === 'coin').length, 0, '自爆不应掉金币');
  assert.equal(w.pickups.filter((it) => it.kind === 'xp').length, 0, '自爆不应掉经验');
});

test('巢巢兽：召唤有单体上限，且不突破本波同屏上限', () => {
  const w = makeWorld(5);
  const p = w.player;
  const e = spawnEnemy(w, scaleEnemy(ENEMY_BY_ID.nester, 7), p.x + 200, p.y, w.rng);
  e.summonCd = 0;

  stepEnemies(w, 1 / 60);
  const mites = () => w.enemies.filter((x) => x.summonedBy === e.id);
  assert.equal(mites().length, 2, '第一次应召唤 2 只小绒球');
  assert.ok(w.stats.summons >= 2, '应记录召唤次数');

  for (let i = 0; i < 12; i++) {
    e.summonCd = 0;
    stepEnemies(w, 1 / 60);
  }
  assert.ok(mites().length <= e.summonMax, `召唤物超过上限：${mites().length}/${e.summonMax}`);
  assert.ok(w.enemies.length <= w.waveMaxAlive, '总敌人数不应突破本波上限');

  const mite = mites()[0];
  assert.equal(mite.xp, 0);
  assert.equal(mite.coin, 0);
});

test('荧光菇：回复附近伤势最重的敌人，不超过生命上限', () => {
  const w = makeWorld(6);
  const p = w.player;
  const mender = spawnEnemy(w, scaleEnemy(ENEMY_BY_ID.glowcap, 8), p.x + 160, p.y, w.rng);
  const ally = spawnEnemy(w, scaleEnemy(ENEMY_BY_ID.fluff, 8), p.x + 200, p.y + 20, w.rng);
  ally.hp = 1;
  ally.speed = 0; // 固定位置，排除走位影响
  mender.healCd = 0;
  mender.speed = 0;

  stepEnemies(w, 1 / 60);
  assert.ok(ally.hp > 1, '残血敌人应被治疗');
  assert.ok(ally.hp <= ally.maxHp);
  assert.ok(w.stats.heals > 0, '应记录维修次数');

  for (let i = 0; i < 20; i++) {
    mender.healCd = 0;
    stepEnemies(w, 1 / 60);
  }
  assert.ok(ally.hp <= ally.maxHp, '治疗不应超过生命上限');
});

test('讨伐目标：环形弹幕先预警再发射', () => {
  const w = makeWorld(7);
  w.waveIndex = 12;
  const p = w.player;
  const boss = spawnEnemy(w, scaleEnemy(BOSSES.rumble, 12, true), p.x + 300, p.y, w.rng);
  boss.timers.radial = 0;
  boss.timers.special = 999;

  stepEnemies(w, 1 / 60);
  assert.ok(boss.radialWarn > 0, '应先出现环形预警');
  assert.equal(w.enemyBullets.length, 0, '预警期间不应发射');

  step(w, 0.6);
  assert.ok(w.enemyBullets.length > 0, '预警结束后应发射弹幕');
  assert.ok(w.stats.bossBarrages > 0, '应记录首领弹幕次数');
});

test('讨伐目标召唤不会突破同屏上限', () => {
  const w = makeWorld(8);
  w.waveIndex = 12;
  w.waveMaxAlive = 6;
  const p = w.player;
  for (let i = 0; i < 5; i++) {
    spawnEnemy(w, scaleEnemy(ENEMY_BY_ID.fluff, 12), 40 + i * 20, 40, w.rng);
  }
  const boss = spawnEnemy(w, scaleEnemy(BOSSES.rumble, 12, true), p.x + 300, p.y, w.rng);
  assert.equal(w.enemies.length, 6);
  boss.hp = boss.maxHp * 0.5;
  boss.phase = 2;
  boss.timers.special = 0;
  boss.nextSpecial = 'summon';
  boss.timers.radial = 999;

  stepEnemies(w, 1 / 60);
  assert.ok(w.enemies.length <= 6, `召唤突破上限：${w.enemies.length}`);
});

test('精英缩放：更高生命 / 伤害 / 奖励，并保留本体 AI', () => {
  const normal = scaleEnemy(ENEMY_BY_ID.fluff, 7, false, false);
  const elite = scaleEnemy(ENEMY_BY_ID.fluff, 7, false, true);
  assert.equal(elite.elite, true);
  assert.equal(normal.elite, false);
  assert.ok(elite.hp > normal.hp);
  assert.ok(elite.damage > normal.damage);
  assert.ok(elite.radius > normal.radius);
  assert.ok(elite.coin >= normal.coin * 3);
  assert.ok(elite.xp >= normal.xp * 3);
  assert.equal(elite.ai, normal.ai);
});
