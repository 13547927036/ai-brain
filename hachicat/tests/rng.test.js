import test from 'node:test';
import assert from 'node:assert/strict';
import { createRng, weightedPick, shuffle } from '../src/game/rng.js';

test('相同种子产生相同序列', () => {
  const a = createRng(20260101);
  const b = createRng(20260101);
  const seqA = Array.from({ length: 12 }, () => a());
  const seqB = Array.from({ length: 12 }, () => b());
  assert.deepEqual(seqA, seqB);
  assert.ok(seqA.every((v) => v >= 0 && v < 1));
});

test('不同种子序列不同', () => {
  const a = Array.from({ length: 6 }, createRng(1));
  const b = Array.from({ length: 6 }, createRng(2));
  assert.notDeepEqual(a, b);
});

test('range / int 边界正确', () => {
  const rng = createRng(7);
  for (let i = 0; i < 300; i++) {
    const v = rng.range(10, 20);
    assert.ok(v >= 10 && v <= 20, `range out: ${v}`);
    const n = rng.int(3, 5);
    assert.ok(Number.isInteger(n) && n >= 3 && n <= 5, `int out: ${n}`);
  }
});

test('chance 两端稳定', () => {
  const rng = createRng(3);
  for (let i = 0; i < 50; i++) {
    assert.equal(rng.chance(0), false);
    assert.equal(rng.chance(1), true);
  }
});

test('pick 只返回数组元素', () => {
  const rng = createRng(11);
  const arr = ['a', 'b', 'c'];
  for (let i = 0; i < 60; i++) assert.ok(arr.includes(rng.pick(arr)));
});

test('weightedPick 只命中有权重的项', () => {
  const rng = createRng(5);
  const entries = [
    { value: 'never', weight: 0 },
    { value: 'always', weight: 10 },
  ];
  for (let i = 0; i < 80; i++) assert.equal(weightedPick(entries, rng), 'always');
});

test('shuffle 是排列且不改原数组', () => {
  const rng = createRng(9);
  const src = [1, 2, 3, 4, 5];
  const out = shuffle(src, rng);
  assert.deepEqual([...src], [1, 2, 3, 4, 5]);
  assert.deepEqual([...out].sort((x, y) => x - y), [1, 2, 3, 4, 5]);
});