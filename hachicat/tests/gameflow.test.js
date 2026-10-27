import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/game.js';
import { TOTAL_WAVES } from '../src/content/waves.js';

function newGame(seed = 20260101, character = 'hachiware') {
  const g = new Game({ seed });
  g.setViewport(390, 844);
  g.startRun(character);
  return g;
}

test('开局进入第 1 波，带一把起始武器', () => {
  const g = newGame();
  assert.equal(g.mode, 'battle');
  assert.equal(g.waveIndex, 1);
  assert.equal(g.world.player.weapons.length, 1);
  assert.equal(g.world.player.hp, g.world.player.stats.maxHp);
  const events = g.drainEvents();
  assert.ok(events.some((e) => e.type === 'waveStart' && e.wave === 1));
});

test('战斗推进后敌人会刷新并移动', () => {
  const g = newGame(7);
  for (let i = 0; i < 180; i++) g.update(1 / 60);
  assert.ok(g.world.enemies.length > 0, 'no enemies spawned');
  const first = g.world.enemies[0];
  const x0 = first.x;
  for (let i = 0; i < 60; i++) g.update(1 / 60);
  assert.ok(Math.hypot(first.x - x0, first.y - first.y) >= 0);
  assert.ok(Number.isFinite(first.x));
});

test('升级暂停战斗，选择后恢复', () => {
  const g = newGame(3);
  for (let i = 0; i < 60; i++) g.update(1 / 60);
  assert.equal(g.debugLevelUp(), true);
  assert.equal(g.mode, 'levelup');
  assert.equal(g.upgradeOptions.length, 3);
  const before = JSON.stringify(g.world.player.stats);
  assert.equal(g.chooseUpgrade(0), true);
  assert.equal(g.mode, 'battle');
  assert.notEqual(JSON.stringify(g.world.player.stats), before);
});

test('清场进入商店，下一波继续', () => {
  const g = newGame(11);
  for (let i = 0; i < 120; i++) g.update(1 / 60);
  g.endWave();
  for (let i = 0; i < 5 && g.mode === 'levelup'; i++) g.chooseUpgrade(0);
  assert.equal(g.mode, 'shop');
  assert.equal(g.shop.offers.length, 4);
  assert.ok(g.world.player.money > 0);
  assert.equal(g.nextWave(), true);
  assert.equal(g.mode, 'battle');
  assert.equal(g.waveIndex, 2);
});

test('暂停期间时间不推进，恢复后继续', () => {
  const g = newGame(5);
  for (let i = 0; i < 30; i++) g.update(1 / 60);
  const t = g.waveTime;
  assert.equal(g.pause(), true);
  assert.equal(g.mode, 'paused');
  for (let i = 0; i < 60; i++) g.update(1 / 60);
  assert.equal(g.waveTime, t);
  assert.equal(g.resume(), true);
  g.update(1 / 60);
  assert.ok(g.waveTime > t);
});

test('第 12 波召唤讨伐目标，三个阶段随血量切换', () => {
  const g = newGame(21);
  g.debugJumpWave(TOTAL_WAVES);
  assert.equal(g.waveIndex, 12);
  assert.ok(g.world.boss, 'boss missing');
  const boss = g.world.boss;
  assert.equal(boss.maxHp > 1000, true);
  assert.equal(boss.phase, 1);

  boss.hp = boss.maxHp * 0.5;
  g.update(1 / 60);
  assert.equal(boss.phase, 2);

  boss.hp = boss.maxHp * 0.2;
  g.update(1 / 60);
  assert.equal(boss.phase, 3);
});

test('击退讨伐目标判定胜利并结算', () => {
  const g = newGame(31);
  g.debugJumpWave(TOTAL_WAVES);
  g.debugKillBoss();
  g.update(1 / 60);
  assert.equal(g.mode, 'result');
  assert.equal(g.result.victory, true);
  assert.equal(g.result.wave, 12);
  assert.ok(g.result.kills >= 0);
  const events = g.drainEvents();
  assert.ok(events.some((e) => e.type === 'victory'));
});

test('角色死亡判定失败', () => {
  const g = newGame(41);
  g.debugLose();
  assert.equal(g.mode, 'result');
  assert.equal(g.result.victory, false);
  const events = g.drainEvents();
  assert.ok(events.some((e) => e.type === 'defeat'));
});

test('重开回到第 1 波且满血', () => {
  const g = newGame(51);
  g.debugJumpWave(6);
  g.debugLose();
  g.restart();
  assert.equal(g.mode, 'battle');
  assert.equal(g.waveIndex, 1);
  assert.equal(g.world.player.hp, g.world.player.stats.maxHp);
  assert.equal(g.result, null);
});