import type { AudioSink, SoundId } from '../types.js';

/**
 * 纯程序化音效：不加载任何音频文件，全部用 WebAudio 现场合成。
 * 好处是零资源体积、零加载等待，原型阶段足够验证「有没有反馈」这件事。
 * 后续换成真实音效时，只需替换 play() 内部实现。
 */

interface Recipe {
  type: OscillatorType;
  /** 起始频率 */
  from: number;
  /** 结束频率（= from 表示不滑音） */
  to: number;
  duration: number;
  gain: number;
  /** 是否叠加噪声（打击感） */
  noise: boolean;
}

const RECIPES: Record<SoundId, Recipe> = {
  fire: { type: 'square', from: 620, to: 320, duration: 0.07, gain: 0.05, noise: false },
  hit: { type: 'triangle', from: 240, to: 140, duration: 0.06, gain: 0.06, noise: true },
  crit: { type: 'square', from: 900, to: 500, duration: 0.09, gain: 0.07, noise: true },
  kill: { type: 'sawtooth', from: 300, to: 90, duration: 0.16, gain: 0.06, noise: true },
  hurt: { type: 'sawtooth', from: 180, to: 70, duration: 0.22, gain: 0.11, noise: false },
  dodge: { type: 'sine', from: 700, to: 1100, duration: 0.08, gain: 0.05, noise: false },
  pickup: { type: 'sine', from: 880, to: 1320, duration: 0.07, gain: 0.045, noise: false },
  levelUp: { type: 'square', from: 440, to: 880, duration: 0.3, gain: 0.075, noise: false },
  waveStart: { type: 'triangle', from: 300, to: 520, duration: 0.34, gain: 0.08, noise: false },
  waveEnd: { type: 'triangle', from: 520, to: 300, duration: 0.34, gain: 0.08, noise: false },
  buy: { type: 'sine', from: 660, to: 990, duration: 0.12, gain: 0.065, noise: false },
  click: { type: 'square', from: 500, to: 500, duration: 0.035, gain: 0.04, noise: false },
  reroll: { type: 'triangle', from: 420, to: 640, duration: 0.11, gain: 0.05, noise: false },
  lose: { type: 'sawtooth', from: 260, to: 60, duration: 0.9, gain: 0.13, noise: false },
  win: { type: 'square', from: 523, to: 1046, duration: 0.65, gain: 0.09, noise: false },
};

/** 浏览器里取 AudioContext；微信侧会换成 wx.createWebAudioContext */
export function acquireBrowserAudioContext(): AudioContext | null {
  const w = window as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  const Ctor = w.AudioContext ?? w.webkitAudioContext;
  return Ctor ? new Ctor() : null;
}

export class BrowserAudio implements AudioSink {
  muted = false;
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  /** 同一帧内同类音效限流，避免 200 个子弹同时开火炸成噪音 */
  private lastPlayed = new Map<SoundId, number>();

  /**
   * @param acquire 取 AudioContext 的方式。默认走浏览器；
   *   微信小游戏传入 wx.createWebAudioContext，从而复用同一套程序化音效。
   */
  constructor(private readonly acquire: () => AudioContext | null = acquireBrowserAudioContext) {}

  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const ctx = this.acquire();
    if (!ctx) return;
    this.ctx = ctx;

    const len = Math.floor(this.ctx.sampleRate * 0.2);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buf;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  play(id: SoundId): void {
    if (this.muted) return;
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;

    const now = ctx.currentTime;
    const last = this.lastPlayed.get(id) ?? -1;
    const recipe = RECIPES[id];
    if (now - last < recipe.duration * 0.6) return;
    this.lastPlayed.set(id, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(recipe.gain, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + recipe.duration);
    gain.connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.type = recipe.type;
    osc.frequency.setValueAtTime(recipe.from, now);
    if (recipe.to !== recipe.from) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, recipe.to), now + recipe.duration);
    }
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + recipe.duration);

    if (recipe.noise && this.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(recipe.gain * 0.7, now);
      ng.gain.exponentialRampToValueAtTime(0.0001, now + recipe.duration * 0.8);
      src.connect(ng);
      ng.connect(ctx.destination);
      src.start(now);
      src.stop(now + recipe.duration);
    }
  }
}
