import test from 'node:test';
import assert from 'node:assert/strict';
import { FrameStats } from './stats.js';

test('样本不足时返回空值标记', () => {
  const r = new FrameStats().summary();
  assert.equal(r.frames, 0);
  assert.equal(r.avgFps, 0);
});

test('帧时间换算 FPS 正确', () => {
  const s = new FrameStats();
  for (let i = 0; i < 100; i++) s.push(16.6667);
  const r = s.summary();
  assert.equal(r.frames, 100);
  assert.ok(Math.abs(r.avgFps - 60) < 0.1, `avgFps=${r.avgFps}`);
  assert.ok(Math.abs(r.p95Ms - 16.6667) < 0.001);
});

// 百分位用最近秩法：p95 -> sorted[ceil(0.95*n)-1]，n=100 时下标为 94。
test('p95 落在尾部 5%', () => {
  const s = new FrameStats();
  for (let i = 0; i < 90; i++) s.push(10);
  for (let i = 0; i < 10; i++) s.push(50);
  assert.equal(s.summary().p95Ms, 50);
});

test('reset 清空样本', () => {
  const s = new FrameStats();
  s.push(10);
  s.reset();
  assert.equal(s.summary().frames, 0);
});
