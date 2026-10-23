import test from 'node:test';
import assert from 'node:assert/strict';
import { synthesizeWeapon, listSynthesis } from '../src/game/progression.js';

function playerWith(entries) {
  return {
    weapons: entries.map(([id, level]) => ({
      id,
      level,
      cd: 0,
      state: { spin: 0, hits: new Map() },
    })),
  };
}

test('两件同等级武器合成一件等级 +1', () => {
  const player = playerWith([
    ['hairball', 1],
    ['hairball', 1],
    ['claw', 1],
  ]);
  const res = synthesizeWeapon(player, 'hairball');
  assert.equal(res.ok, true);
  assert.equal(res.level, 2);
  assert.equal(player.weapons.filter((w) => w.id === 'hairball').length, 1);
  assert.equal(player.weapons.find((w) => w.id === 'hairball').level, 2);
  assert.equal(player.weapons.length, 2);
});

test('等级不同不合成', () => {
  const player = playerWith([
    ['hairball', 1],
    ['hairball', 2],
  ]);
  const res = synthesizeWeapon(player, 'hairball');
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'level');
  assert.equal(player.weapons.length, 2);
});

test('满级不可合成', () => {
  const player = playerWith([
    ['hairball', 5],
    ['hairball', 5],
  ]);
  const res = synthesizeWeapon(player, 'hairball');
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'max');
});

test('可合成列表只包含成对武器', () => {
  const player = playerWith([
    ['hairball', 1],
    ['hairball', 1],
    ['claw', 1],
    ['claw', 3],
  ]);
  const list = listSynthesis(player);
  assert.equal(list.length, 1);
  assert.equal(list[0].id, 'hairball');
  assert.equal(list[0].count, 2);
  assert.equal(list[0].nextLevel, 2);
});