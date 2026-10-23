/**
 * 波次表：11 个普通波 + 第 12 波首领。
 * pool 是权重表，spawn 时按权重随机。
 * eliteEvery：从该波开始，每刷新 N 只怪就有 1 只是精英（0 / 缺省表示不出精英）。
 *
 * 阶段划分：
 *   1–3   熟悉操作、建立基础构筑：只有追击 / 蛇形 / 远程
 *   4–6   走位压力：突进、减伤、自爆依次登场
 *   7–9   精英与协同：召唤、支援加入，精英开始成组出现
 *   10–12 高压与首领：全类型混合，精英密度最高，最后挑战铁肺
 */
export const WAVES = [
  {
    n: 1, name: '巷口', duration: 24, interval: 0.85, maxAlive: 14, reward: 14,
    pool: { sweeper: 10 },
  },
  {
    n: 2, name: '雨后', duration: 24, interval: 0.8, maxAlive: 16, reward: 16,
    pool: { sweeper: 8, drone: 3 },
  },
  {
    n: 3, name: '路灯', duration: 24, interval: 0.74, maxAlive: 18, reward: 18,
    pool: { sweeper: 7, drone: 4, spitter: 2 },
  },
  {
    n: 4, name: '垃圾站', duration: 26, interval: 0.7, maxAlive: 20, reward: 20,
    pool: { sweeper: 5, drone: 4, spitter: 3, dart: 3 },
  },
  {
    n: 5, name: '后门', duration: 26, interval: 0.66, maxAlive: 22, reward: 22,
    pool: { sweeper: 4, drone: 4, spitter: 3, dart: 3, guard: 2 },
  },
  {
    n: 6, name: '锅炉房', duration: 26, interval: 0.62, maxAlive: 24, reward: 24,
    pool: { sweeper: 3, drone: 4, spitter: 4, dart: 3, guard: 2, bomber: 2 },
  },
  {
    n: 7, name: '排风管', duration: 28, interval: 0.55, maxAlive: 28, reward: 26,
    pool: { sweeper: 3, drone: 4, spitter: 4, dart: 3, guard: 2, bomber: 2, brood: 1 },
    eliteEvery: 14,
  },
  {
    n: 8, name: '仓库', duration: 28, interval: 0.5, maxAlive: 30, reward: 28,
    pool: { sweeper: 3, drone: 4, spitter: 4, dart: 3, guard: 2, bomber: 2, brood: 1, mender: 1 },
    eliteEvery: 12,
  },
  {
    n: 9, name: '冷库', duration: 28, interval: 0.44, maxAlive: 33, reward: 28,
    pool: { sweeper: 2, drone: 4, spitter: 4, dart: 3, guard: 3, bomber: 2, brood: 2, mender: 1 },
    eliteEvery: 10,
  },
  {
    n: 10, name: '车间', duration: 30, interval: 0.38, maxAlive: 36, reward: 30,
    pool: { sweeper: 2, drone: 4, spitter: 5, dart: 3, guard: 3, bomber: 3, brood: 2, mender: 2 },
    eliteEvery: 8,
  },
  {
    n: 11, name: '吸尘口', duration: 30, interval: 0.32, maxAlive: 40, reward: 34,
    pool: { sweeper: 2, drone: 5, spitter: 5, dart: 4, guard: 3, bomber: 3, brood: 2, mender: 2 },
    eliteEvery: 7,
  },
  {
    n: 12,
    name: '铁肺',
    boss: 'ironLung',
    duration: 0,
    interval: 5.2,
    maxAlive: 16,
    reward: 0,
    pool: { drone: 5, sweeper: 3, dart: 2, spitter: 2 },
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

/** 某只怪在本波是否精英：优先按固定间隔保证出现，避免纯随机导致整波没有精英。 */
export function shouldSpawnElite(wave, spawnIndex) {
  if (!wave || !wave.eliteEvery) return false;
  return spawnIndex > 0 && spawnIndex % wave.eliteEvery === 0;
}

/** 波次奖励：通关金 + 该波的固定奖励。 */
export function waveClearReward(n) {
  return (getWave(n).reward || 0) + 6 + n * 2;
}
