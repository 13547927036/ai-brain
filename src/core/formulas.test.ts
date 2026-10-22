import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CRIT_MULTIPLIER, REGEN_INTERVAL, armorMultiplier, applyArmor, dodgeRate,
  attackCooldown, attacksPerSecond, moveSpeed, luckDropRate, xpForLevel,
  setBonusMultiplier, HP_PER_LEVEL,
} from './formulas.js';
import { SET_BONUS_PER_WEAPON } from '../content/weapons.js';

test('护甲减伤：0 护甲不减伤，15 护甲减半，30 护甲三分之一', () => {
  assert.equal(armorMultiplier(0), 1);
  assert.equal(armorMultiplier(15), 0.5);
  assert.ok(Math.abs(armorMultiplier(30) - 1 / 3) < 1e-12);
});

test('护甲上限 30：超过部分不生效', () => {
  assert.equal(armorMultiplier(100), armorMultiplier(30));
  assert.equal(armorMultiplier(-5), 1, '负护甲不应放大伤害');
});

test('护甲实际应用', () => {
  assert.equal(applyArmor(30, 0), 30);
  assert.equal(applyArmor(30, 15), 15);
});

test('闪避率 = 闪避/(闪避+40)', () => {
  assert.equal(dodgeRate(0), 0);
  assert.equal(dodgeRate(40), 0.5);
});

test('闪避上限 60%', () => {
  assert.equal(dodgeRate(1000), 0.6);
  assert.equal(dodgeRate(100), 0.6);
});

test('攻速：+100% 使冷却减半', () => {
  assert.equal(attackCooldown(1.0, 0), 1.0);
  assert.equal(attackCooldown(1.0, 100), 0.5);
});

test('攻速上限 12 次/秒', () => {
  const cd = attackCooldown(0.01, 100000);
  assert.ok(Math.abs(cd - 1 / 12) < 1e-12);
  assert.equal(attacksPerSecond(0.01, 100000), 12);
});

test('乌萨奇 +40% 攻速对讨伐棒的实际冷却', () => {
  const cd = attackCooldown(0.8, 40);
  assert.ok(Math.abs(cd - 0.8 / 1.4) < 1e-12);
});

test('移速：基础 180，+50% 得 270', () => {
  assert.equal(moveSpeed(180, 0), 180);
  assert.equal(moveSpeed(180, 50), 270);
});

test('幸运掉落率 = 基础掉率 × (1 + 幸运/100)', () => {
  assert.equal(luckDropRate(0.1, 0), 0.1);
  assert.ok(Math.abs(luckDropRate(0.1, 100) - 0.2) < 1e-12);
});

test('升级经验 = (等级+3)²', () => {
  assert.equal(xpForLevel(1), 16);
  assert.equal(xpForLevel(2), 25);
  assert.equal(xpForLevel(7), 100);
});

test('套装加成：1 把无加成，3 把 +16%，6 把 +40%', () => {
  assert.equal(setBonusMultiplier(1, SET_BONUS_PER_WEAPON), 1);
  assert.equal(setBonusMultiplier(0, SET_BONUS_PER_WEAPON), 1);
  assert.ok(Math.abs(setBonusMultiplier(3, SET_BONUS_PER_WEAPON) - 1.16) < 1e-12);
  assert.ok(Math.abs(setBonusMultiplier(6, SET_BONUS_PER_WEAPON) - 1.40) < 1e-12);
});

test('常量与 spec 一致', () => {
  assert.equal(CRIT_MULTIPLIER, 2);
  assert.equal(REGEN_INTERVAL, 3);
  assert.equal(HP_PER_LEVEL, 1);
});
