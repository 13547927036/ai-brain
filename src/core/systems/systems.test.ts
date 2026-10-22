import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from '../rng.js';
import { createWorld, type World, type Enemy } from '../world.js';
import { movePlayer, moveEnemies, playerSpeed, PLAYER_RADIUS } from './movement.js';
import { nearestEnemy, updateFacing, inArc, arcCosThreshold } from './targeting.js';
import { updateWeapons } from './firing.js';

function makeWorld(): World {
  return createWorld({ rng: mulberry32(1), startingWeaponId: 'club', weaponSlots: 6, maxHp: 60 });
}

function addEnemy(w: World, x: number, y: number, speed = 60, radius = 14): Enemy {
  const e = w.enemies.spawn();
  assert.ok(e, '敌人池不应为空');
  e.defId = 'grunt';
  e.x = x; e.y = y;
  e.hp = 10; e.maxHp = 10;
  e.speed = speed; e.damage = 3; e.radius = radius;
  e.contact = true; e.fireTimer = 0; e.summonTimer = 0;
  e.hitFlash = 0; e.knockX = 0; e.knockY = 0; e.touchTimer = 0;
  return e;
}

test('玩家基础移速为 180 px/s', () => {
  const w = makeWorld();
  assert.equal(playerSpeed(w), 180);
});

test('向右输入 1 秒移动 180 px', () => {
  const w = makeWorld();
  const x0 = w.player.x;
  w.player.inputX = 1;
  w.player.inputY = 0;
  movePlayer(w, 1);
  assert.ok(Math.abs(w.player.x - (x0 + 180)) < 1e-9);
});

test('斜向输入必须归一化：不因斜走而更快', () => {
  const w = makeWorld();
  const x0 = w.player.x;
  const y0 = w.player.y;
  w.player.inputX = 1;
  w.player.inputY = 1;
  movePlayer(w, 1);
  const moved = Math.hypot(w.player.x - x0, w.player.y - y0);
  assert.ok(Math.abs(moved - 180) < 1e-9, `斜向位移应为 180，实际 ${moved}`);
});

test('移速加成生效：+50% 时 1 秒走 270 px', () => {
  const w = makeWorld();
  w.player.stats.moveSpeed = 50;
  const x0 = w.player.x;
  w.player.inputX = 1;
  w.player.inputY = 0;
  movePlayer(w, 1);
  assert.ok(Math.abs(w.player.x - (x0 + 270)) < 1e-9);
});

test('玩家被限制在竞技场内', () => {
  const w = makeWorld();
  w.player.inputX = 1;
  w.player.inputY = 1;
  for (let i = 0; i < 60; i++) movePlayer(w, 1);
  assert.equal(w.player.x, w.arena.w - PLAYER_RADIUS);
  assert.equal(w.player.y, w.arena.h - PLAYER_RADIUS);
});

test('无输入时玩家不动', () => {
  const w = makeWorld();
  const x0 = w.player.x;
  movePlayer(w, 1);
  assert.equal(w.player.x, x0);
});

test('敌人直线追踪玩家', () => {
  const w = makeWorld();
  const e = addEnemy(w, w.player.x + 300, w.player.y, 100);
  const d0 = e.x - w.player.x;
  moveEnemies(w, 0.5, () => 0);
  assert.ok(e.x < w.player.x + 300, '应朝玩家靠近');
  assert.ok(Math.abs((w.player.x + 300 - e.x) - 50) < 1e-6, '100px/s 走 0.5s 应靠近 50px');
  assert.ok(d0 > 0);
});

test('远程怪保持距离：太近会后退', () => {
  const w = makeWorld();
  const e = addEnemy(w, w.player.x + 100, w.player.y, 45);
  moveEnemies(w, 1, () => 220);
  assert.ok(e.x > w.player.x + 100, '应远离玩家');
});

test('远程怪在保持距离带内不移动', () => {
  const w = makeWorld();
  const e = addEnemy(w, w.player.x + 220, w.player.y, 45);
  moveEnemies(w, 1, () => 220);
  assert.ok(Math.abs(e.x - (w.player.x + 220)) < 1e-9);
});

test('敌人被限制在竞技场内', () => {
  const w = makeWorld();
  const e = addEnemy(w, 5, 5, 60);
  moveEnemies(w, 0.01, () => 0);
  assert.ok(e.x >= e.radius);
  assert.ok(e.y >= e.radius);
});

test('索敌返回最近的敌人', () => {
  const w = makeWorld();
  const near = addEnemy(w, w.player.x + 50, w.player.y);
  addEnemy(w, w.player.x + 300, w.player.y);
  const t = nearestEnemy(w, w.player.x, w.player.y, 400);
  assert.equal(t, near);
});

test('索敌尊重射程上限', () => {
  const w = makeWorld();
  addEnemy(w, w.player.x + 300, w.player.y);
  assert.equal(nearestEnemy(w, w.player.x, w.player.y, 200), null);
});

test('场上无敌人时索敌返回 null 且朝向保持不变', () => {
  const w = makeWorld();
  w.player.facingX = 0;
  w.player.facingY = -1;
  const t = updateFacing(w, 300);
  assert.equal(t, null);
  assert.deepEqual([w.player.facingX, w.player.facingY], [0, -1]);
});

test('有目标时朝向指向目标', () => {
  const w = makeWorld();
  addEnemy(w, w.player.x + 100, w.player.y);
  updateFacing(w, 300);
  assert.ok(Math.abs(w.player.facingX - 1) < 1e-9);
  assert.ok(Math.abs(w.player.facingY) < 1e-9);
});

test('扇形判定：90° 扇形正前方命中，正后方不命中', () => {
  const cos = arcCosThreshold(90);
  assert.ok(inArc(0, 0, 1, 0, 50, 0, cos), '正前方应命中');
  assert.ok(inArc(0, 0, 1, 0, 50, 40, cos), '40° 偏角应命中（半角 45°）');
  assert.ok(!inArc(0, 0, 1, 0, -50, 0, cos), '正后方不应命中');
  assert.ok(!inArc(0, 0, 1, 0, 0, 50, cos), '90° 侧向不应命中');
});

test('扇形阈值：90° 半角对应 cos45°', () => {
  assert.ok(Math.abs(arcCosThreshold(90) - Math.SQRT1_2) < 1e-12);
  assert.ok(Math.abs(arcCosThreshold(180) - 0) < 1e-12);
});

test('起始武器在 100px 外即可命中 —— 射程修复行为验证', () => {
  // 曾经 club 射程 70，命中距离 70+14=84，实测手感是"贴脸才打"。
  // 现在 110，命中距离 124，100px 应能打到。
  const w = makeWorld();
  const e = addEnemy(w, w.player.x + 100, w.player.y);
  const before = e.hp;
  updateWeapons(w, 1 / 60);
  assert.ok(e.hp < before, `100px 内的敌人应被命中，实际 hp ${e.hp}（原 ${before}）`);
});

test('超出射程的敌人打不到 —— 避免射程加大后变成全屏攻击', () => {
  const w = makeWorld();
  const e = addEnemy(w, w.player.x + 200, w.player.y);
  const before = e.hp;
  updateWeapons(w, 1 / 60);
  assert.equal(e.hp, before, '200px 在射程 110+14=124 之外，不应命中');
});

test('射程边界：110px 内开火，115px 不开火', () => {
  // 注意：开火条件是「有敌人落在 def.range 内」（firing.ts 的 nearestEnemy），
  // 命中判定的 def.range + e.radius 只在已有目标时扩大扇形扫描范围。
  const near = makeWorld();
  const e1 = addEnemy(near, near.player.x + 105, near.player.y);
  const b1 = e1.hp;
  updateWeapons(near, 1 / 60);
  assert.ok(e1.hp < b1, '105px 在射程 110 内，应命中');

  const out = makeWorld();
  const e2 = addEnemy(out, out.player.x + 115, out.player.y);
  const b2 = e2.hp;
  updateWeapons(out, 1 / 60);
  assert.equal(e2.hp, b2, '115px 超出开火距离 110，不应命中');
});

test('已有目标时，扇形扫描会把稍远的敌人一起扫到（range + 敌人半径）', () => {
  const w = makeWorld();
  const trigger = addEnemy(w, w.player.x + 100, w.player.y); // 落在 110 内，负责触发开火
  const splash = addEnemy(w, w.player.x + 120, w.player.y);  // 120 < 110+14，应被一起打到
  const t0 = trigger.hp;
  const s0 = splash.hp;
  updateWeapons(w, 1 / 60);
  assert.ok(trigger.hp < t0, '触发开火的敌人应被命中');
  assert.ok(splash.hp < s0, `120px 在 110+14 内，应被一起扫到，实际 hp ${splash.hp}`);
});