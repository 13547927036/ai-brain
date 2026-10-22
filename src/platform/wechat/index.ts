import { ARENA } from '../../core/world.js';
import type { InputSource, KeyValueStore, Platform, PointerState, Tap, View } from '../types.js';
import { BrowserAudio } from '../browser/audio.js';
import { JOYSTICK_RADIUS, TAP_SLOP } from '../browser/index.js';
import type { WxApi, WxTouch, WxTouchEvent } from './wx-api.js';

/**
 * 微信小游戏平台实现。
 *
 * 与浏览器实现保持同一套交互语义（摇杆半径、点击判定阈值、逻辑坐标缩放），
 * 区别只在 API 来源。wx 以参数注入，因此可以在 Node 里用 mock 做单元测试，
 * 不需要微信开发者工具。
 */

export class WechatInput implements InputSource {
  readonly pointer: PointerState = {
    active: false, originX: 0, originY: 0, x: 0, y: 0, dirX: 0, dirY: 0, radius: JOYSTICK_RADIUS,
  };
  /** 小游戏没有键盘，保留字段以满足接口 */
  readonly keys = { x: 0, y: 0 };

  private taps: Tap[] = [];
  private downX = 0;
  private downY = 0;
  private moved = 0;
  private pressed = new Set<number>();

  constructor(
    wx: WxApi,
    private readonly toLogical: (cx: number, cy: number) => { x: number; y: number },
  ) {
    wx.onTouchStart((e) => {
      const t = firstTouch(e);
      if (!t) return;
      const p = this.toLogical(t.clientX, t.clientY);
      this.pressed.add(t.identifier);
      this.downX = p.x;
      this.downY = p.y;
      this.moved = 0;
      this.pointer.active = true;
      this.pointer.originX = p.x;
      this.pointer.originY = p.y;
      this.pointer.x = p.x;
      this.pointer.y = p.y;
      this.pointer.dirX = 0;
      this.pointer.dirY = 0;
    });

    wx.onTouchMove((e) => {
      const t = this.pickTracked(e);
      if (!t) return;
      const p = this.toLogical(t.clientX, t.clientY);
      this.moved = Math.max(this.moved, Math.hypot(p.x - this.downX, p.y - this.downY));
      this.pointer.x = p.x;
      this.pointer.y = p.y;
      const dx = p.x - this.pointer.originX;
      const dy = p.y - this.pointer.originY;
      const len = Math.hypot(dx, dy);
      if (len > 1) {
        // 推离圆心越远速度越大，推满封顶 —— 与浏览器实现完全一致
        const clamped = Math.min(len, JOYSTICK_RADIUS);
        this.pointer.dirX = (dx / len) * (clamped / JOYSTICK_RADIUS);
        this.pointer.dirY = (dy / len) * (clamped / JOYSTICK_RADIUS);
      }
    });

    const end = (e: WxTouchEvent): void => {
      const t = this.pickTracked(e);
      if (!t) return;
      this.pressed.delete(t.identifier);
      // 位移小于阈值才算点击，且以按下点为准
      if (this.moved < TAP_SLOP) this.taps.push({ x: this.downX, y: this.downY });
      if (this.pressed.size === 0) {
        this.pointer.active = false;
        this.pointer.dirX = 0;
        this.pointer.dirY = 0;
      }
    };
    wx.onTouchEnd(end);
    wx.onTouchCancel(end);
  }

  /** 从 changedTouches 里挑仍在跟踪的那根手指 */
  private pickTracked(e: WxTouchEvent): WxTouch | null {
    for (const t of e.changedTouches) {
      if (this.pressed.has(t.identifier)) return t;
    }
    return e.changedTouches[0] ?? null;
  }

  takeTaps(): Tap[] {
    const out = this.taps;
    this.taps = [];
    return out;
  }

  cancelPointer(): void {
    this.pointer.active = false;
    this.pointer.dirX = 0;
    this.pointer.dirY = 0;
  }
}

function firstTouch(e: WxTouchEvent): WxTouch | null {
  return e.changedTouches[0] ?? e.touches[0] ?? null;
}

class WxStore implements KeyValueStore {
  constructor(private readonly wx: WxApi) {}

  load(key: string): string | null {
    try {
      const v = this.wx.getStorageSync(key);
      // 微信在键不存在时返回空字符串
      return typeof v === 'string' && v !== '' ? v : null;
    } catch {
      return null;
    }
  }

  save(key: string, value: string): void {
    try {
      this.wx.setStorageSync(key, value);
    } catch {
      /* 存储写满时微信会抛错，不影响游戏 */
    }
  }

  remove(key: string): void {
    try {
      this.wx.removeStorageSync(key);
    } catch {
      /* ignore */
    }
  }
}

export interface WechatPlatformOptions {
  /** 切后台：应暂停 + 落盘 */
  onHide?: () => void;
  /** 回前台 */
  onShow?: () => void;
}

export function createWechatPlatform(wx: WxApi, opts: WechatPlatformOptions = {}): Platform {
  const info = wx.getSystemInfoSync();
  const canvas = wx.createCanvas();
  const winW = info.windowWidth || 375;
  const winH = info.windowHeight || 667;
  const dpr = Math.min(3, info.pixelRatio || 1);

  const view: View = { width: ARENA.w, height: ARENA.h, dpr, cssWidth: winW, cssHeight: winH };

  // 主画布铺满屏幕（设备像素）。渲染层用 canvas.width / 750 算缩放。
  canvas.width = Math.floor(winW * dpr);
  canvas.height = Math.floor(winH * dpr);

  const toLogical = (cx: number, cy: number): { x: number; y: number } => ({
    x: (cx / winW) * ARENA.w,
    y: (cy / winH) * ARENA.h,
  });

  const input = new WechatInput(wx, toLogical);
  const storage = new WxStore(wx);
  // 复用浏览器的程序化音效，只把 AudioContext 换成微信的
  const audio = new BrowserAudio(() => {
    const factory = wx.createWebAudioContext;
    if (!factory) return null;
    return factory.call(wx) as unknown as AudioContext;
  });

  wx.onShow?.(() => opts.onShow?.());
  wx.onHide?.(() => opts.onHide?.());

  return {
    // 微信的 canvas 不是 DOM 元素，但渲染层只用到 width/height/getContext
    canvas: canvas as unknown as HTMLCanvasElement,
    view,
    input,
    storage,
    audio,
    beginFrame(): void {
      /* 点击由上层 takeTaps 消费 */
    },
    dispose(): void {
      /* 小游戏无需解绑 */
    },
  };
}
