/**
 * 波次表：11 个普通波 + 第 12 波首领。
 * pool 是权重表，spawn 时按权重随机。
 */
export const WAVES = [
  { n: 1, name: '巷口', duration: 24, interval: 0.85, maxAlive: 14, reward: 14, pool: { sweeper: 10 } },
  { n: 2, name: '雨后', duration: 24, interval: 0.78, maxAlive: 16, reward: 16, pool: { sweeper: 8, drone: 3 } },
  { n: 3, name: '路灯', duration: 24, interval: 0.72, maxAlive: 18, reward: 18, pool: { sweeper: 7, drone: 4, spitter: 2 } },
  { n: 4, name: '垃圾站', duration: 26, interval: 0.66, maxAlive: 20, reward: 20, pool: { sweeper: 6, drone: 4, spitter: 3, brute: 1 } },
  { n: 5, name: '后门', duration: 26, interval: 0.6, maxAlive: 22, reward: 22, pool: { sweeper: 6, drone: 5, spitter: 3, brute: 2 } },
  { n: 6, name: '锅炉房', duration: 26, interval: 0.55, maxAlive: 24, reward: 24, pool: { sweeper: 5, drone: 5, spitter: 4, brute: 2 } },
  { n: 7, name: '排风管', duration: 28, interval: 0.5, maxAlive: 27, reward: 26, pool: { sweeper: 5, drone: 6, spitter: 4, brute: 3 } },
  { n: 8, name: '仓库', duration: 28, interval: 0.45, maxAlive: 30, reward: 28, pool: { sweeper: 4, drone: 6, spitter: 5, brute: 3 } },
  { n: 9, name: '冷库', duration: 28, interval: 0.4, maxAlive: 34, reward: 30, pool: { sweeper: 4, drone: 6, spitter: 5, brute: 4 } },
  { n: 10, name: '车间', duration: 30, interval: 0.36, maxAlive: 38, reward: 32, pool: { sweeper: 4, drone: 6, spitter: 6, brute: 4 } },
  { n: 11, name: '吸尘口', duration: 30, interval: 0.32, maxAlive: 42, reward: 40, pool: { sweeper: 4, drone: 7, spitter: 6, brute: 5 } },
  {
    n: 12,
    name: '铁肺',
    boss: 'ironLung',
    duration: 0,
    interval: 4.6,
    maxAlive: 16,
    reward: 0,
    pool: { drone: 6, sweeper: 4, spitter: 3 },
  },
];

export const TOTAL_WAVES = WAVES.length;
export const BOSS_WAVE = WAVES.length;

export function getWave(n) {
  return WAVES[Math.min(WAVES.length, Math.max(1, n)) - 1];
}

/** 从权重表里随机取一个敌人 id。 */
export function pickFromPool(pool, rng) {
  let total = 0;
  for (const k in pool) total += pool[k];
  let r = rng() * total;
  for (const k in pool) {
    r -= pool[k];
    if (r <= 0) return k;
  }
  return Object.keys(pool)[0];
}

/** 波次奖励：通关金 + 该波的固定奖励。 */
export function waveClearReward(n) {
  return (getWave(n).reward || 0) + 6 + n * 2;
}