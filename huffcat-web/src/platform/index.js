import { createBrowserPlatform } from './browser.js';
import { createWeChatPlatform } from './wechat.js';

/** 运行时选择平台实现；游戏逻辑本身完全不需要知道选了哪个。 */
export function createPlatform() {
  const g = typeof globalThis !== 'undefined' ? globalThis : {};
  if (g.wx && typeof g.wx.createCanvas === 'function' && typeof document === 'undefined') {
    return createWeChatPlatform(g.wx);
  }
  return createBrowserPlatform();
}