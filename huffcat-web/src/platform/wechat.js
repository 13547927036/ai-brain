/**
 * 微信小游戏平台实现（与 browser.js 同接口）。
 *
 * 重要：微信小游戏里没有 DOM / window / React-DOM，
 * 所以 web 版那套 React 界面不能直接搬过去 —— 这正是"平台层"存在的原因。
 * 逻辑层（game/、content/）与渲染层（render/）可以原样复用，
 * 但界面需要换成 canvas 版（见 src/wechat/）。
 *
 * 该文件尚未在真机/开发者工具中验证，详见 README 的"未完成事项"。
 */
export function createWeChatPlatform(wx) {
  const info = wx.getSystemInfoSync();
  const dpr = Math.min(2, info.pixelRatio || 1);
  let canvas = null;
  let muted = false;

  function getCanvas() {
    if (!canvas) {
      // 小游戏中第一次 createCanvas 得到的才是上屏画布
      canvas = wx.createCanvas();
      canvas.width = info.screenWidth * dpr;
      canvas.height = info.screenHeight * dpr;
    }
    return canvas;
  }

  const raf =
    (typeof wx.requestAnimationFrame === 'function' && wx.requestAnimationFrame.bind(wx)) ||
    (getCanvas().requestAnimationFrame
      ? getCanvas().requestAnimationFrame.bind(getCanvas())
      : (cb) => setTimeout(() => cb(Date.now()), 16));

  const caf =
    (typeof wx.cancelAnimationFrame === 'function' && wx.cancelAnimationFrame.bind(wx)) ||
    (getCanvas().cancelAnimationFrame ? getCanvas().cancelAnimationFrame.bind(getCanvas()) : clearTimeout);

  return {
    name: 'wechat',
    isTouch: true,
    now: () => Date.now(),
    requestFrame: (cb) => raf(cb),
    cancelFrame: (id) => caf(id),
    getCanvas,

    storage: {
      get(key) {
        try {
          const v = wx.getStorageSync(key);
          return v === '' || v === undefined ? null : v;
        } catch {
          return null;
        }
      },
      set(key, value) {
        try {
          wx.setStorageSync(key, value);
        } catch {
          /* 忽略 */
        }
      },
    },

    audio: {
      // 小游戏音频需要真实音频文件，当前只用震动反馈
      unlock() {},
      play() {},
      setMuted(v) {
        muted = !!v;
      },
      isMuted: () => muted,
    },

    vibrate(ms) {
      if (muted) return;
      try {
        wx.vibrateShort({ type: ms > 30 ? 'heavy' : 'light' });
      } catch {
        /* 忽略 */
      }
    },

    getViewport() {
      return { width: info.screenWidth, height: info.screenHeight, dpr };
    },

    bindPointer(target, handlers) {
      const pick = (e) => (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
      const onStart = (e) => {
        const t = pick(e);
        if (t) handlers.down({ x: t.clientX, y: t.clientY }, e);
      };
      const onMove = (e) => {
        const t = pick(e);
        if (t) handlers.move({ x: t.clientX, y: t.clientY }, e);
      };
      const onEnd = (e) => {
        const t = pick(e);
        handlers.up(t ? { x: t.clientX, y: t.clientY } : { x: 0, y: 0 }, e);
      };
      wx.onTouchStart(onStart);
      wx.onTouchMove(onMove);
      wx.onTouchEnd(onEnd);
      wx.onTouchCancel(onEnd);
      return () => {
        if (wx.offTouchStart) wx.offTouchStart(onStart);
        if (wx.offTouchMove) wx.offTouchMove(onMove);
        if (wx.offTouchEnd) wx.offTouchEnd(onEnd);
        if (wx.offTouchCancel) wx.offTouchCancel(onEnd);
      };
    },

    bindKeys() {
      return () => {};
    },

    bindResize(cb) {
      const handler = () => cb();
      wx.onWindowResize(handler);
      return () => {
        if (wx.offWindowResize) wx.offWindowResize(handler);
      };
    },

    bindVisibility(cb) {
      const show = () => cb(false);
      const hide = () => cb(true);
      wx.onShow(show);
      wx.onHide(hide);
      return () => {
        if (wx.offShow) wx.offShow(show);
        if (wx.offHide) wx.offHide(hide);
      };
    },

    setThemeColor() {},
  };
}