/**
 * 波次表：11 个普通波 + 第 12 波讨伐目标。
 * pool 是权重表，spawn 时按权重随机。
 * eliteEvery：从该波开始，每刷新 N 只怪就有 1 只是精英（0 / 缺省表示不出精英）。
 *
 * 阶段划分：
 *   1–3   熟悉操作、建立基础构筑：只有追击 / 蛇形 / 远程
 *   4–6   走位压力：突进、减伤、自爆依次登场
 *   7–9   精英与协同：召唤、支援加入，精英开始成组出现
 *   10–12 高压与讨伐目标：全类型混合，精英密度最高，最后挑战巨兽「隆隆」
 */
export const WAVES = [
  {
    n: 1, name: '草原入口', duration: 24, interval: 0.85, maxAlive: 14, reward: 14,
    pool: { fluff: 10 },
  },
  {
    n: 2, name: '雨后坡道', duration: 24, interval: 0.8, maxAlive: 16, reward: 16,
    pool: { fluff: 8, flutter: 3 },
  },
  {
    n: 3, name: '路灯小径', duration: 24, interval: 0.74, maxAlive: 18, reward: 18,
    pool: { fluff: 7, flutter: 4, spitter: 2 },
  },
  {
    n: 4, name: '旧物堆场', duration: 26, interval: 0.7, maxAlive: 20, reward: 20,
    pool: { fluff: 5, flutter: 4, spitter: 3, dart: 3 },
  },
  {
    n: 5, name: '篱笆后门', duration: 26, interval: 0.66, maxAlive: 22, reward: 22,
    pool: { fluff: 4, flutter: 4, spitter: 3, dart: 3, guard: 2 },
  },
  {
    n: 6, name: '暖炉小屋', duration: 26, interval: 0.62, maxAlive: 24, reward: 24,
    pool: { fluff: 3, flutter: 4, spitter: 4, dart: 3, guard: 2, bomber: 2 },
  },
  {
    n: 7, name: '风车坡', duration: 28, interval: 0.55, maxAlive: 28, reward: 26,
    pool: { fluff: 3, flutter: 4, spitter: 4, dart: 3, guard: 2, bomber: 2, nester: 1 },
    eliteEvery: 14,
  },
  {
    n: 8, name: '仓库街', duration: 28, interval: 0.5, maxAlive: 30, reward: 28,
    pool: { fluff: 3, flutter: 4, spitter: 4, dart: 3, guard: 2, bomber: 2, nester: 1, glowcap: 1 },
    eliteEvery: 12,
  },
  {
    n: 9, name: '霜花谷', duration: 28, interval: 0.44, maxAlive: 33, reward: 28,
    pool: { fluff: 2, flutter: 4, spitter: 4, dart: 3, guard: 3, bomber: 2, nester: 2, glowcap: 1 },
    eliteEvery: 10,
  },
  {
    n: 10, name: '工坊街', duration: 30, interval: 0.38, maxAlive: 36, reward: 30,
    pool: { fluff: 2, flutter: 4, spitter: 5, dart: 3, guard: 3, bomber: 3, nester: 2, glowcap: 2 },
    eliteEvery: 8,
  },
  {
    n: 11, name: '巨兽巢穴', duration: 30, interval: 0.32, maxAlive: 40, reward: 34,
    pool: { fluff: 2, flutter: 5, spitter: 5, dart: 4, guard: 3, bomber: 3, nester: 2, glowcap: 2 },
    eliteEvery: 7,
  },
  {
    n: 12,
    name: '隆隆',
    boss: 'rumble',
    duration: 0,
    interval: 5.2,
    maxAlive: 16,
    reward: 0,
    pool: { flutter: 5, fluff: 3, dart: 2, spitter: 2 },
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
