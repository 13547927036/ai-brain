import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from './rng.js';
import { createWorld, type World } from './world.js';
import { LOGIC_DT, tick } from './tick.js';
import { startWave, hasNextWave } from './wave.js';

function makeWorld(seed: number, weaponId: string, maxHp: number): World {
  return createWorld({
    rng: mulberry32(seed),
    startingWeaponId: weaponId,
    weaponSlots: 6,
    maxHp,
  });
}

test('第 1 波能完整跑完并自动结算', () => {
  const w = makeWorld(42, 'kunai', 600);
  startWave(w, 1);
  let guard = 0;
  while (!w.over && w.wave.active && guard++ < 20000) tick(w, LOGIC_DT);
  assert.ok(guard < 20000, '不应死循环');
  assert.equal(w.wave.active, false, '第 1 波应在时间耗尽后结束');
  assert.equal(w.enemies.length, 0, '波末场上敌人应被清空');
  assert.equal(w.pickups.length, 0, '波末剩余材料应自动入袋');
  assert.ok(w.player.materials > 0, '应该拿到材料');
});

test('战斗确实造成击杀', () => {
  const w = makeWorld(7, 'kunai', 600);
  startWave(w, 1);
  let killEvents = 0;
  let guard = 0;
  while (!w.over && w.wave.active && guard++ < 20000) {
    tick(w, LOGIC_DT);
    for (const e of w.events) if (e.type === 'kill') killEvents++;
  }
  assert.ok(killEvents > 0, `应至少击杀 1 个敌人，实际 ${killEvents}`);
});

test('同种子同操作产生完全一致的结果（确定性）', () => {
  function run(): { hp: number; materials: number; level: number; kills: number } {
    const w = makeWorld(123, 'slingshot', 600);
    startWave(w, 1);
    let kills = 0;
    let guard = 0;
    while (!w.over && w.wave.active && guard++ < 20000) {
      tick(w, LOGIC_DT);
      for (const e of w.events) if (e.type === 'kill') kills++;
    }
    return { hp: w.player.hp, materials: w.player.materials, level: w.player.level, kills };
  }
  assert.deepEqual(run(), run());
});

test('生命归零即判定失败并结束', () => {
  const w = makeWorld(9, 'club', 1);
  startWave(w, 1);
  let guard = 0;
  while (!w.over && guard++ < 20000) tick(w, LOGIC_DT);
  assert.equal(w.over, true, '生命 1 的玩家应很快死亡');
  assert.equal(w.player.alive, false);
  assert.equal(w.player.hp, 0);
});

test('无输入时玩家不漂移，且敌人会逼近', () => {
  const w = makeWorld(11, 'club', 600);
  startWave(w, 1);
  const x0 = w.player.x;
  const y0 = w.player.y;
  for (let i = 0; i < 600; i++) tick(w, LOGIC_DT);
  assert.equal(w.player.x, x0);
  assert.equal(w.player.y, y0);
  assert.ok(w.enemies.length > 0, '10 秒后应已有敌人在场');
});

test('长时间运行不产生 NaN', () => {
  const w = makeWorld(5, 'dualCannon', 600);
  startWave(w, 1);
  for (let i = 0; i < 900; i++) tick(w, LOGIC_DT);
  assert.ok(Number.isFinite(w.player.x) && Number.isFinite(w.player.y));
  for (let i = 0; i < w.enemies.length; i++) {
    const e = w.enemies.items[i];
    assert.ok(e && Number.isFinite(e.x) && Number.isFinite(e.y), '敌人坐标不应为 NaN');
  }
  for (let i = 0; i < w.bullets.length; i++) {
    const b = w.bullets.items[i];
    assert.ok(b && Number.isFinite(b.x) && Number.isFinite(b.y), '子弹坐标不应为 NaN');
  }
});

test('第 1 波结束后还有下一波', () => {
  const w = makeWorld(3, 'kunai', 600);
  startWave(w, 1);
  let guard = 0;
  while (!w.over && w.wave.active && guard++ < 20000) tick(w, LOGIC_DT);
  assert.equal(hasNextWave(w), true);
});

test('12 波总敌人的经验足以升到 5 级以上', () => {
  // 累计敌人 603 个，每个 1 经验 = 603 经验；升到 5 级需 16+25+36+49 = 126
  const w = makeWorld(77, 'kunai', 100000);
  for (let wave = 1; wave <= 12 && !w.over; wave++) {
    startWave(w, wave);
    let guard = 0;
    while (!w.over && w.wave.active && guard++ < 40000) tick(w, LOGIC_DT);
  }
  assert.ok(w.player.level >= 5, `应升到 5 级以上，实际 ${w.player.level}`);
});
