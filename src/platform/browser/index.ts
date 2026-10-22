import { ARENA } from '../../core/world.js';
import type { InputSource, KeyValueStore, Platform, PointerState, Tap, View } from '../types.js';
import { BrowserAudio } from './audio.js';

export const JOYSTICK_RADIUS = 90;
/** 指针移动超过这个距离就不再算作点击 */
export const TAP_SLOP = 18;

class BrowserInput implements InputSource {
  readonly pointer: PointerState = {
    active: false, originX: 0, originY: 0, x: 0, y: 0, dirX: 0, dirY: 0, radius: JOYSTICK_RADIUS,
  };
  readonly keys = { x: 0, y: 0 };

  private taps: Tap[] = [];
  private downX = 0;
  private downY = 0;
  private moved = 0;
  private pressed = new Set<number>();
  private keySet = new Set<string>();

  constructor(canvas: HTMLCanvasElement, private readonly toLogical: (cx: number, cy: number) => { x: number; y: number }) {
    const pos = (e: PointerEvent) => this.toLogical(e.clientX, e.clientY);

    canvas.addEventListener('pointerdown', (e) => {
      const p = pos(e);
      this.pressed.add(e.pointerId);
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
      try { canvas.setPointerCapture(e.pointerId); } catch { /* 合成事件下会抛 NotFoundError */ }
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!this.pressed.has(e.pointerId)) return;
      const p = pos(e);
      this.moved = Math.max(this.moved, Math.hypot(p.x - this.downX, p.y - this.downY));
      this.pointer.x = p.x;
      this.pointer.y = p.y;
      const dx = p.x - this.pointer.originX;
      const dy = p.y - this.pointer.originY;
      const len = Math.hypot(dx, dy);
      if (len > 1) {
        // 摇杆推到底时不归一化到 1 以外，保留「推满」手感
        const clamped = Math.min(len, JOYSTICK_RADIUS) / 1;
        this.pointer.dirX = (dx / len) * (clamped / JOYSTICK_RADIUS);
        this.pointer.dirY = (dy / len) * (clamped / JOYSTICK_RADIUS);
      }
    });

    const end = (e: PointerEvent) => {
      if (!this.pressed.has(e.pointerId)) return;
      this.pressed.delete(e.pointerId);
      if (this.moved < TAP_SLOP) this.taps.push({ x: this.downX, y: this.downY });
      if (this.pressed.size === 0) {
        this.pointer.active = false;
        this.pointer.dirX = 0;
        this.pointer.dirY = 0;
      }
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);

    window.addEventListener('keydown', (e) => {
      this.keySet.add(e.key.toLowerCase());
      this.syncKeys();
    });
    window.addEventListener('keyup', (e) => {
      this.keySet.delete(e.key.toLowerCase());
      this.syncKeys();
    });
    window.addEventListener('blur', () => {
      this.keySet.clear();
      this.syncKeys();
    });
  }

  private syncKeys(): void {
    const k = this.keySet;
    this.keys.x = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0);
    this.keys.y = (k.has('s') || k.has('arrowdown') ? 1 : 0) - (k.has('w') || k.has('arrowup') ? 1 : 0);
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

class LocalStore implements KeyValueStore {
  load(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  save(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* 隐私模式下会抛错，静默忽略 */
    }
  }

  remove(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

export interface CreatePlatformOptions {
  /** 逻辑宽度，默认 750 */
  logicalWidth?: number;
  /** 逻辑高度，默认 1334 */
  logicalHeight?: number;
  container?: HTMLElement;
}

export function createBrowserPlatform(opts: CreatePlatformOptions = {}): Platform {
  const logicalW = opts.logicalWidth ?? ARENA.w;
  const logicalH = opts.logicalHeight ?? ARENA.h;

  let canvas = document.getElementById('game') as HTMLCanvasElement | null;
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'game';
    (opts.container ?? document.body).appendChild(canvas);
  }

  const view: View = { width: logicalW, height: logicalH, dpr: 1, cssWidth: logicalW, cssHeight: logicalH };
  let rect = { left: 0, top: 0, width: logicalW, height: logicalH };

  const toLogical = (cx: number, cy: number): { x: number; y: number } => ({
    x: ((cx - rect.left) / rect.width) * logicalW,
    y: ((cy - rect.top) / rect.height) * logicalH,
  });

  const input = new BrowserInput(canvas, toLogical);
  const audio = new BrowserAudio();
  const storage = new LocalStore();

  function resize(): void {
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    // 等比缩放，保证 750×1334 完整可见（竖屏，留黑边而不是裁切）
    const availW = window.innerWidth;
    const availH = window.innerHeight;
    const scale = Math.min(availW / logicalW, availH / logicalH);
    const cssW = Math.floor(logicalW * scale);
    const cssH = Math.floor(logicalH * scale);

    canvas!.style.width = `${cssW}px`;
    canvas!.style.height = `${cssH}px`;
    canvas!.width = Math.floor(logicalW * scale * dpr);
    canvas!.height = Math.floor(logicalH * scale * dpr);

    view.dpr = dpr;
    view.cssWidth = cssW;
    view.cssHeight = cssH;

    const r = canvas!.getBoundingClientRect();
    rect = { left: r.left, top: r.top, width: r.width, height: r.height };
  }

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 60));

  const onFirstGesture = (): void => {
    audio.unlock();
    window.removeEventListener('pointerdown', onFirstGesture);
    window.removeEventListener('keydown', onFirstGesture);
  };
  window.addEventListener('pointerdown', onFirstGesture);
  window.addEventListener('keydown', onFirstGesture);

  return {
    canvas,
    view,
    input,
    storage,
    audio,
    beginFrame(): void {
      // 点击由上层通过 takeTaps 消费，这里不做清空
    },
    dispose(): void {
      window.removeEventListener('resize', resize);
    },
  };
}
