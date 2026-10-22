/**
 * 微信小游戏 API 的最小类型面。
 *
 * 只声明本项目实际用到的部分，并把 wx 作为**参数注入**，
 * 这样适配层可以在 Node 里用 mock 跑测试，不需要微信开发者工具。
 */

export interface WxTouch {
  identifier: number;
  clientX: number;
  clientY: number;
}

export interface WxTouchEvent {
  touches: WxTouch[];
  changedTouches: WxTouch[];
}

export interface WxCanvas {
  width: number;
  height: number;
  getContext(contextId: '2d'): unknown;
}

export interface WxSystemInfo {
  windowWidth: number;
  windowHeight: number;
  pixelRatio: number;
}

/** wx.createImage() 返回的图片对象 */
export interface WxImage {
  src: string;
  width: number;
  height: number;
  onload: (() => void) | null;
  onerror: (() => void) | null;
}

export interface WxApi {
  createCanvas(): WxCanvas;
  createImage?(): WxImage;
  getSystemInfoSync(): WxSystemInfo;
  onTouchStart(cb: (e: WxTouchEvent) => void): void;
  onTouchMove(cb: (e: WxTouchEvent) => void): void;
  onTouchEnd(cb: (e: WxTouchEvent) => void): void;
  onTouchCancel(cb: (e: WxTouchEvent) => void): void;
  getStorageSync(key: string): unknown;
  setStorageSync(key: string, value: unknown): void;
  removeStorageSync(key: string): void;
  createWebAudioContext?(): unknown;
  /** 前后台切换，用于暂停 + 落盘 */
  onShow?(cb: () => void): void;
  onHide?(cb: () => void): void;
}
