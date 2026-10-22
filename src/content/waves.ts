import type { WaveDef } from './types.js';

/** 12 波，总时长 269s，加上商店时间约 5~6 分钟一局（spec 4.2） */
const ROWS: Array<[number, number, number, { grunt: number; runner: number; shooter: number }]> = [
  [15, 12, 0.8, { grunt: 1.0, runner: 0, shooter: 0 }],
  [16, 16, 1.0, { grunt: 1.0, runner: 0, shooter: 0 }],
  [17, 20, 1.2, { grunt: 0.8, runner: 0.2, shooter: 0 }],
  [18, 26, 1.4, { grunt: 0.7, runner: 0.3, shooter: 0 }],
  [19, 32, 1.6, { grunt: 0.6, runner: 0.25, shooter: 0.15 }],
  [21, 40, 1.9, { grunt: 0.55, runner: 0.25, shooter: 0.2 }],
  [22, 48, 2.2, { grunt: 0.5, runner: 0.25, shooter: 0.25 }],
  [23, 56, 2.4, { grunt: 0.45, runner: 0.3, shooter: 0.25 }],
  [25, 58, 2.4, { grunt: 0.4, runner: 0.3, shooter: 0.3 }],
  [27, 66, 2.5, { grunt: 0.4, runner: 0.3, shooter: 0.3 }],
  [30, 76, 2.6, { grunt: 0.35, runner: 0.35, shooter: 0.3 }],
  [36, 88, 2.8, { grunt: 0.4, runner: 0.3, shooter: 0.3 }],
];

export const WAVES: WaveDef[] = ROWS.map(([duration, enemyCount, spawnRate, mix], i) => ({
  index: i + 1,
  duration,
  enemyCount,
  spawnRate,
  mix,
  boss: i + 1 === ROWS.length,
}));

export const WAVE_COUNT = WAVES.length;
export const TOTAL_WAVE_SECONDS = WAVES.reduce((a, w) => a + w.duration, 0);

export function waveAt(index: number): WaveDef {
  const i = Math.min(WAVES.length - 1, Math.max(0, index - 1));
  const wave = WAVES[i];
  if (!wave) throw new Error('波次越界: ' + index);
  return wave;
}
