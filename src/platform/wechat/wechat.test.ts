import test from 'node:test';
import assert from 'node:assert/strict';
import { ARENA } from '../../core/world.js';
import { JOYSTICK_RADIUS, TAP_SLOP } from '../browser/index.js';
import { createWechatPlatform } from './index.js';
import type { WxApi, WxTouchEvent } from './wx-api.js';

/**
 * 微信适配层的单元测试。
 *
 * 没有开发者工具就把 wx 换成 mock —— 适配层的全部逻辑（坐标换算、摇杆、
 * 点击判定、存储回退、音效降级）都能在 Node 里验证。
 */

interface MockWx extends WxApi {
  touchStart: (e: WxTouchEvent) => void;
  touchMove: (e: WxTouchEvent) => void;
  touchEnd: (e: WxTouchEvent) => void;
  touchCancel: (e: WxTouchEvent) => void;
  store: Map<string, string>;
  canvasObj: { width: number; height: number };
  throwOnStorage: boolean;
  audioFactoryCalls: number;
}

function makeWx(overrides: { winW?: number; winH?: number; dpr?: number; noAudio?: boolean } = {}): MockWx {
  const store = new Map<string, string>();
  const canvasObj = { width: 0, height: 0 };
  let touchStart = (_e: WxTouchEvent) => {};
  let touchMove = (_e: WxTouchEvent) => {};
  let touchEnd = (_e: WxTouchEvent) => {};
  let touchCancel = (_e: WxTouchEvent) => {};

  const api: MockWx = {
    touchStart: (e) => touchStart(e),
    touchMove: (e) => touchMove(e),
    touchEnd: (e) => touchEnd(e),
    touchCancel: (e) => touchCancel(e),
    store,
    canvasObj,
    throwOnStorage: false,
    audioFactoryCalls: 0,

    createCanvas: () => ({
      get width() { return canvasObj.width; },
      set width(v: number) { canvasObj.width = v; },
      get height() { return canvasObj.height; },
      set height(v: number) { canvasObj.height = v; },
      getContext: () => null,
    }),
    getSystemInfoSync: () => ({
      windowWidth: overrides.winW ?? 390,
      windowHeight: overrides.winH ?? 844,
      pixelRatio: overrides.dpr ?? 3,
    }),
    onTouchStart: (cb) => { touchStart = cb; },
    onTouchMove: (cb) => { touchMove = cb; },
    onTouchEnd: (cb) => { touchEnd = cb; },
    onTouchCancel: (cb) => { touchCancel = cb; },
    getStorageSync: (k) => {
      if (api.throwOnStorage) throw new Error('denied');
      return store.get(k) ?? '';
    },
    setStorageSync: (k, v) => {
      if (api.throwOnStorage) throw new Error('denied');
      store.set(k, String(v));
    },
    removeStorageSync: (k) => {
      if (api.throwOnStorage) throw new Error('denied');
      store.delete(k);
    },
  };
  if (!overrides.noAudio) {
    api.createWebAudioContext = () => {
      api.audioFactoryCalls++;
      return null;
    };
  }
  return api;
}

function touch(id: number, clientX: number, clientY: number): WxTouchEvent {
  return { touches: [{ identifier: id, clientX, clientY }], changedTouches: [{ identifier: id, clientX, clientY }] };
}

test('view 取设备信息，画布按 dpr 铺满', () => {
  const wx = makeWx({ winW: 390, winH: 844, dpr: 3 });
  const p = createWechatPlatform(wx);
  assert.equal(p.view.width, ARENA.w);
  assert.equal(p.view.height, ARENA.h);
  assert.equal(p.view.dpr, 3);
  assert.equal(p.view.cssWidth, 390);
  assert.equal(p.view.cssHeight, 844);
  assert.equal(wx.canvasObj.width, 390 * 3);
  assert.equal(wx.canvasObj.height, 844 * 3);
});

test('dpr 上限 3，避免超高分屏爆显存', () => {
  const wx = makeWx({ dpr: 4 });
  const p = createWechatPlatform(wx);
  assert.equal(p.view.dpr, 3);
});

test('触摸按下建立摇杆圆心', () => {
  const wx = makeWx({ winW: 390, winH: 844 });
  const p = createWechatPlatform(wx);
  wx.touchStart(touch(1, 0, 0));
  assert.equal(p.input.pointer.active, true);
  assert.equal(p.input.pointer.originX, 0);
  assert.equal(p.input.pointer.originY, 0);
});

test('拖动方向按半径归一，推满封顶为 1', () => {
  const wx = makeWx({ winW: 750, winH: 1334 });
  const p = createWechatPlatform(wx);
  wx.touchStart(touch(1, 375, 667));

  // 半程：位移等于半径的一半
  wx.touchMove(touch(1, 375 + JOYSTICK_RADIUS / 2, 667));
  const half = Math.hypot(p.input.pointer.dirX, p.input.pointer.dirY);
  assert.ok(Math.abs(half - 0.5) < 1e-6, `半程应为 0.5，实际 ${half}`);

  // 超程：仍封顶为 1
  wx.touchMove(touch(1, 375 + JOYSTICK_RADIUS * 4, 667));
  const full = Math.hypot(p.input.pointer.dirX, p.input.pointer.dirY);
  assert.ok(Math.abs(full - 1) < 1e-6, `推满应为 1，实际 ${full}`);
  assert.ok(p.input.pointer.dirX > 0.99);
});

test('抬起时位移小于阈值 → 产生点击（以按下点为准）', () => {
  const wx = makeWx({ winW: 750, winH: 1334 });
  const p = createWechatPlatform(wx);
  wx.touchStart(touch(1, 300, 400));
  wx.touchMove(touch(1, 300 + TAP_SLOP - 1, 400));
  wx.touchEnd(touch(1, 300 + TAP_SLOP - 1, 400));
  const taps = p.input.takeTaps();
  assert.equal(taps.length, 1);
  assert.equal(taps[0]?.x, 300);
  assert.equal(taps[0]?.y, 400);
  assert.equal(p.input.pointer.active, false);
});

test('拖拽超过阈值 → 不算点击', () => {
  const wx = makeWx({ winW: 750, winH: 1334 });
  const p = createWechatPlatform(wx);
  wx.touchStart(touch(1, 300, 400));
  wx.touchMove(touch(1, 300 + TAP_SLOP + 5, 400));
  wx.touchEnd(touch(1, 300 + TAP_SLOP + 5, 400));
  assert.equal(p.input.takeTaps().length, 0);
});

test('takeTaps 取走后清空', () => {
  const wx = makeWx({ winW: 750, winH: 1334 });
  const p = createWechatPlatform(wx);
  wx.touchStart(touch(1, 10, 10));
  wx.touchEnd(touch(1, 10, 10));
  assert.equal(p.input.takeTaps().length, 1);
  assert.equal(p.input.takeTaps().length, 0);
});

test('cancelPointer 撤销摇杆（UI 吃掉按下时）', () => {
  const wx = makeWx({ winW: 750, winH: 1334 });
  const p = createWechatPlatform(wx);
  wx.touchStart(touch(1, 100, 100));
  wx.touchMove(touch(1, 200, 100));
  p.input.cancelPointer();
  assert.equal(p.input.pointer.active, false);
  assert.equal(p.input.pointer.dirX, 0);
});

test('坐标从屏幕换算到 750 逻辑宽', () => {
  const wx = makeWx({ winW: 390, winH: 844 });
  const p = createWechatPlatform(wx);
  // 点屏幕正中 → 逻辑坐标应为 750/2, 1334/2
  wx.touchStart(touch(1, 195, 422));
  assert.ok(Math.abs(p.input.pointer.originX - ARENA.w / 2) < 1e-6);
  assert.ok(Math.abs(p.input.pointer.originY - ARENA.h / 2) < 1e-6);
});

test('存储往返；缺失键返回 null（微信返回空串）', () => {
  const wx = makeWx();
  const p = createWechatPlatform(wx);
  assert.equal(p.storage.load('missing'), null);
  p.storage.save('k', 'v');
  assert.equal(p.storage.load('k'), 'v');
  p.storage.remove('k');
  assert.equal(p.storage.load('k'), null);
});

test('存储抛错时静默（配额满 / 隐私模式）', () => {
  const wx = makeWx();
  const p = createWechatPlatform(wx);
  wx.throwOnStorage = true;
  assert.doesNotThrow(() => p.storage.save('k', 'v'));
  assert.equal(p.storage.load('k'), null);
  assert.doesNotThrow(() => p.storage.remove('k'));
});

test('无 WebAudio 时音效降级为静默，不抛错', () => {
  const wx = makeWx({ noAudio: true });
  const p = createWechatPlatform(wx);
  assert.doesNotThrow(() => p.audio.unlock());
  assert.doesNotThrow(() => p.audio.play('fire'));
});

test('有 WebAudio 时 unlock 会尝试创建上下文', () => {
  const wx = makeWx();
  const p = createWechatPlatform(wx);
  p.audio.unlock();
  assert.ok(wx.audioFactoryCalls >= 1, '应调用 createWebAudioContext');
});

test('前后台回调接到 options', () => {
  const wx = makeWx();
  let hidden = 0;
  let shown = 0;
  // 手动触发注册的回调
  let hideCb: (() => void) | null = null;
  let showCb: (() => void) | null = null;
  wx.onHide = (cb) => { hideCb = cb; };
  wx.onShow = (cb) => { showCb = cb; };
  createWechatPlatform(wx, { onHide: () => hidden++, onShow: () => shown++ });
  // 通过显式类型断言调用：赋值发生在闭包里，TS 会把变量收窄成 null
  (hideCb as (() => void) | null)?.();
  (showCb as (() => void) | null)?.();
  assert.equal(hidden, 1);
  assert.equal(shown, 1);
});

test('多点触摸：抬起一根手指不会误判点击', () => {
  const wx = makeWx({ winW: 750, winH: 1334 });
  const p = createWechatPlatform(wx);
  wx.touchStart(touch(1, 100, 100));
  // 第一根手指大幅移动，仍然只有它被跟踪
  wx.touchMove(touch(1, 400, 400));
  wx.touchEnd(touch(1, 400, 400));
  assert.equal(p.input.takeTaps().length, 0);
  assert.equal(p.input.pointer.active, false);
});
