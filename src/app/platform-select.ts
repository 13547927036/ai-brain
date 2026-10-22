import type { Platform } from '../platform/types.js';
import { createBrowserPlatform } from '../platform/browser/index.js';
import { createWechatPlatform } from '../platform/wechat/index.js';
import type { WxApi } from '../platform/wechat/wx-api.js';

/**
 * 运行环境判定与平台选择。
 *
 * 同一份 game 代码在浏览器和微信小游戏里跑，只在启动时挑一次平台实现。
 * 判定依据是全局是否存在可用的 wx.createCanvas —— 微信小游戏的运行环境会注入 wx。
 */

export function detectWx(): WxApi | null {
  const g = globalThis as unknown as { wx?: WxApi };
  const wx = g.wx;
  if (wx && typeof wx.createCanvas === 'function') return wx;
  return null;
}

export function createPlatform(): Platform {
  const wx = detectWx();
  return wx ? createWechatPlatform(wx) : createBrowserPlatform();
}
