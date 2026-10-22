import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from './pool.js';

interface Item { id: number }

function makePool(size: number): Pool<Item> {
  let n = 0;
  return new Pool<Item>(size, () => ({ id: n++ }));
}

test('新建池长度为 0，容量正确', () => {
  const p = makePool(4);
  assert.equal(p.length, 0);
  assert.equal(p.capacity, 4);
  assert.equal(p.full, false);
});

test('spawn 依次返回对象并增长长度', () => {
  const p = makePool(3);
  const a = p.spawn();
  const b = p.spawn();
  assert.equal(p.length, 2);
  assert.notEqual(a, b);
});

test('池满返回 null 而不是扩容', () => {
  const p = makePool(2);
  p.spawn(); p.spawn();
  assert.equal(p.full, true);
  assert.equal(p.spawn(), null);
  assert.equal(p.length, 2);
  assert.equal(p.capacity, 2);
});

test('remove 用末尾填补，长度减一', () => {
  const p = makePool(4);
  p.spawn(); p.spawn(); p.spawn();
  const last = p.items[2];
  p.remove(0);
  assert.equal(p.length, 2);
  assert.equal(p.items[0], last, '末尾对象应被搬到被删位置');
});

test('remove 末尾元素不会打乱其他对象', () => {
  const p = makePool(4);
  p.spawn(); p.spawn();
  const first = p.items[0];
  p.remove(1);
  assert.equal(p.length, 1);
  assert.equal(p.items[0], first);
});

test('remove 越界是空操作', () => {
  const p = makePool(2);
  p.spawn();
  p.remove(5);
  p.remove(-1);
  assert.equal(p.length, 1);
});

test('clear 清空但不释放容量', () => {
  const p = makePool(3);
  p.spawn(); p.spawn();
  p.clear();
  assert.equal(p.length, 0);
  assert.equal(p.capacity, 3);
});

test('稠密性：遍历 [0,length) 不会拿到死对象', () => {
  const p = makePool(5);
  for (let i = 0; i < 5; i++) p.spawn();
  p.remove(0);
  p.remove(0);
  const seen = new Set<Item>();
  for (let i = 0; i < p.length; i++) {
    const it = p.items[i] as Item;
    assert.ok(it, '存活区间内不应有空洞');
    assert.ok(!seen.has(it), '不应重复遍历同一对象');
    seen.add(it);
  }
  assert.equal(seen.size, 3);
});

test('回收后可重新 spawn 填满', () => {
  const p = makePool(2);
  p.spawn(); p.spawn();
  p.remove(0);
  assert.equal(p.full, false);
  assert.ok(p.spawn());
  assert.equal(p.length, 2);
});
