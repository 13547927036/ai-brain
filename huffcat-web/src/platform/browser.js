/**
 * 浏览器平台实现：DOM 事件、localStorage、WebAudio、震动。
 * 微信版本见 wechat.js，两者实现同一组接口。
 */

const SFX = {
  click: { type: 'sine', from: 620, to: 620, dur: 0.05, gain: 0.03 },
  shoot: { type: 'triangle', from: 540, to: 320, dur: 0.05, gain: 0.012 },
  hit: { type: 'square', from: 240, to: 150, dur: 0.04, gain: 0.012 },
  hurt: { type: 'sawtooth', from: 220, to: 70, dur: 0.22, gain: 0.05 },
  pickup: { type: 'sine', from: 780, to: 1180, dur: 0.08, gain: 0.025 },
  coin: { type: 'sine', from: 920, to: 1380, dur: 0.07, gain: 0.022 },
  wave: { type: 'sine', from: 380, to: 760, dur: 0.18, gain: 0.03 },
  boss: { type: 'sawtooth', from: 120, to: 60, dur: 0.5, gain: 0.05 },
  shop: { type: 'sine', from: 520, to: 780, dur: 0.12, gain: 0.025 },
  levelup: { type: 'triangle', from: 520, to: 1040, dur: 0.16, gain: 0.04 },
  buy: { type: 'sine', from: 660, to: 990, dur: 0.1, gain: 0.035 },
  heal: { type: 'sine', from: 480, to: 880, dur: 0.16, gain: 0.03 },
  victory: { type: 'triangle', from: 440, to: 1320, dur: 0.5, gain: 0.05 },
  defeat: { type: 'sawtooth', from: 300, to: 80, dur: 0.6, gain: 0.05 },
  pause: { type: 'sine', from: 500, to: 300, dur: 0.08, gain: 0.02 },
};

export function createBrowserPlatform() {
  let audioCtx = null;
  let muted = false;

  function ensureAudio() {
    if (typeof window === 'undefined') return null;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    return audioCtx;
  }

  function tone(ctx, cfg, when = 0) {
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = cfg.type || 'sine';
    osc.frequency.setValueAtTime(cfg.from, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, cfg.to), t0 + cfg.dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(cfg.gain, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + cfg.dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + cfg.dur + 0.02);
  }

  return {
    name: 'browser',
    isTouch: typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0),
    now: () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
    requestFrame: (cb) => window.requestAnimationFrame(cb),
    cancelFrame: (id) => window.cancelAnimationFrame(id),

    storage: {
      get(key) {
        try {
          return window.localStorage.getItem(key);
        } catch {
          return null;
        }
      },
      set(key, value) {
        try {
          window.localStorage.setItem(key, value);
        } catch {
          /* 隐私模式忽略 */
        }
      },
    },

    audio: {
      unlock: () => ensureAudio(),
      play(name) {
        if (muted) return;
        const cfg = SFX[name];
        const ctx = ensureAudio();
        if (!cfg || !ctx) return;
        try {
          tone(ctx, cfg);
          if (name === 'levelup') {
            tone(ctx, { ...cfg, from: 780, to: 1560 }, 0.09);
          }
          if (name === 'victory') {
            tone(ctx, { ...cfg, from: 660, to: 1760 }, 0.16);
          }
        } catch {
          /* 音频失败不影响游戏 */
        }
      },
      setMuted(v) {
        muted = !!v;
      },
      isMuted: () => muted,
    },

    vibrate(ms) {
      try {
        if (!muted && navigator.vibrate) navigator.vibrate(ms);
      } catch {
        /* 忽略 */
      }
    },

    getViewport() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const vv = window.visualViewport;
      return {
        width: Math.round(vv ? vv.width : window.innerWidth),
        height: Math.round(vv ? vv.height : window.innerHeight),
        dpr,
      };
    },

    bindPointer(canvas, handlers) {
      const rect = () => canvas.getBoundingClientRect();
      const local = (e) => {
        const r = rect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
      };
      const onDown = (e) => {
        handlers.down(local(e), e);
        if (e.pointerType === 'touch') e.preventDefault();
      };
      const onMove = (e) => {
        handlers.move(local(e), e);
      };
      const onUp = (e) => {
        handlers.up(local(e), e);
      };
      canvas.addEventListener('pointerdown', onDown, { passive: false });
      window.addEventListener('pointermove', onMove, { passive: true });
      window.addEventListener('pointerup', onUp, { passive: true });
      window.addEventListener('pointercancel', onUp, { passive: true });
      return () => {
        canvas.removeEventListener('pointerdown', onDown);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
      };
    },

    bindKeys(handler) {
      const onDown = (e) => handler(e.key, true);
      const onUp = (e) => handler(e.key, false);
      window.addEventListener('keydown', onDown);
      window.addEventListener('keyup', onUp);
      return () => {
        window.removeEventListener('keydown', onDown);
        window.removeEventListener('keyup', onUp);
      };
    },

    bindResize(cb) {
      const handler = () => cb();
      window.addEventListener('resize', handler);
      window.addEventListener('orientationchange', handler);
      if (window.visualViewport) window.visualViewport.addEventListener('resize', handler);
      return () => {
        window.removeEventListener('resize', handler);
        window.removeEventListener('orientationchange', handler);
        if (window.visualViewport) window.visualViewport.removeEventListener('resize', handler);
      };
    },

    bindVisibility(cb) {
      const handler = () => cb(document.hidden);
      document.addEventListener('visibilitychange', handler);
      return () => document.removeEventListener('visibilitychange', handler);
    },

    setThemeColor(color) {
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', color);
    },
  };
}