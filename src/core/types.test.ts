import test from 'node:test';
import assert from 'node:assert/strict';
import { vec, length, distSq, clamp } from './types.js';
import { mulberry32 } from './rng.js';

test('vec 默认归零，length 与 distSq 正确', () => {
  assert.deepEqual(vec(), { x: 0, y: 0 });
  assert.equal(length(vec(3, 4)), 5);
  assert.equal(distSq(vec(0, 0), vec(3, 4)), 25);
});

test('clamp 夹紧到区间', () => {
  assert.equal(clamp(-5, 0, 10), 0);
  assert.equal(clamp(15, 0, 10), 10);
  assert.equal(clamp(5, 0, 10), 5);
});

test('mulberry32 同种子产出完全相同的序列', () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  assert.deepEqual([a.next(), a.next(), a.next(), a.next()], [b.next(), b.next(), b.next(), b.next()]);
});

test('mulberry32 不同种子产出不同序列', () => {
  assert.notEqual(mulberry32(1).next(), mulberry32(2).next());
});

test('mulberry32 输出落在 [0,1)', () => {
  const r = mulberry32(7);
  for (let i = 0; i < 2000; i++) {
    const v = r.next();
    assert.ok(v >= 0 && v < 1, `越界: ${v}`);
  }
});

test('range 与 int 落在区间内', () => {
  const r = mulberry32(99);
  for (let i = 0; i < 500; i++) {
    const f = r.range(2, 5);
    assert.ok(f >= 2 && f < 5, `range 越界: ${f}`);
    const n = r.int(1, 3);
    assert.ok(Number.isInteger(n) && n >= 1 && n <= 3, `int 越界: ${n}`);
  }
});
