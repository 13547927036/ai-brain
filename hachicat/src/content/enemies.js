/**
 * 敌人数据（纯数值 / AI 类型）。
 *
 * ai:
 *   chase     直线追击
 *   weave     蛇形追击
 *   shooter   保持距离并发射投射物
 *   boss      讨伐目标（多阶段）
 *   dash      预警后高速突进
 *   bomber    贴近后预警自爆
 *   summoner  保持距离，周期性召唤弱小敌人
 *   support   为周围敌人回血
 *
 * 行为差异必须体现在 AI + 预警 + 处理优先级上，不能只改颜色和血量。
 */
export const ENEMY_LIST = [
  {
    id: 'fluff',
    name: '蓬蓬兽',
    sprite: 'enemy.fluff',
    radius: 15,
    hp: 16,
    speed: 52,
    damage: 6,
    xp: 1,
    coin: 1,
    armor: 0,
    knockbackResist: 0.15,
    ai: 'chase',
    desc: '圆滚滚的蓬蓬兽，被惊动后会一头撞过来。',
  },
  {
    id: 'flutter',
    name: '飘飘鸟',
    sprite: 'enemy.flutter',
    radius: 12,
    hp: 10,
    speed: 92,
    damage: 5,
    xp: 1,
    coin: 1,
    armor: 0,
    knockbackResist: 0.05,
    ai: 'weave',
    weaveAmp: 46,
    weaveFreq: 2.4,
    desc: '飘在半空的小鸟，左右摇晃着靠近。',
  },
  {
    id: 'spitter',
    name: '喷籽花',
    sprite: 'enemy.spitter',
    radius: 16,
    hp: 24,
    speed: 40,
    damage: 6,
    xp: 2,
    coin: 2,
    armor: 1,
    knockbackResist: 0.3,
    ai: 'shooter',
    keepDistance: 220,
    fireCd: 2.4,
    bulletSpeed: 230,
    bulletDamage: 8,
    desc: '鼓着腮帮的喷籽花，会远远吐出种子；看到种子就侧移。',
  },
  {
    id: 'brute',
    name: '壳壳兽',
    sprite: 'enemy.brute',
    radius: 23,
    hp: 54,
    speed: 33,
    damage: 13,
    xp: 3,
    coin: 3,
    armor: 2,
    knockbackResist: 0.72,
    ai: 'chase',
    desc: '背着厚壳慢慢走，撞一下很痛。',
  },

  // ---------- 第 4 波起：突进 ----------
  {
    id: 'dart',
    name: '冲撞兽',
    sprite: 'enemy.dart',
    radius: 13,
    hp: 20,
    speed: 66,
    damage: 8,
    xp: 2,
    coin: 2,
    armor: 0,
    knockbackResist: 0.05,
    ai: 'dash',
    dashRange: 290,
    warnTime: 0.55,
    dashSpeed: 510,
    dashTime: 0.28,
    dashCd: 2.9,
    desc: '先低头刨地，再沿直线猛冲；看到预警就侧移。',
  },

  // ---------- 第 5 波起：减伤 ----------
  {
    id: 'guard',
    name: '铁甲虫',
    sprite: 'enemy.guard',
    radius: 19,
    hp: 52,
    speed: 37,
    damage: 11,
    xp: 3,
    coin: 3,
    armor: 3,
    knockbackResist: 0.55,
    ai: 'chase',
    ward: { kind: 'ranged', reduction: 0.55, minDistance: 120 },
    desc: '正面壳很硬，远处打上去会被弹开；贴身或陷阱更有效。',
  },

  // ---------- 第 6 波起：自爆 ----------
  {
    id: 'bomber',
    name: '噗噗果',
    sprite: 'enemy.bomber',
    radius: 14,
    hp: 28,
    speed: 58,
    damage: 4,
    xp: 2,
    coin: 2,
    armor: 0,
    knockbackResist: 0.1,
    ai: 'bomber',
    fuseRange: 100,
    fuseTime: 1.1,
    blastRadius: 88,
    blastDamage: 20,
    fuseCd: 2.4,
    desc: '生气时会鼓起来，约 1.1 秒后炸开；可以提前打掉，也可以拉开。',
  },

  // ---------- 第 7 波起：召唤 ----------
  {
    id: 'nester',
    name: '巢巢兽',
    sprite: 'enemy.nester',
    radius: 20,
    hp: 50,
    speed: 34,
    damage: 6,
    xp: 4,
    coin: 3,
    armor: 1,
    knockbackResist: 0.4,
    ai: 'summoner',
    keepDistance: 250,
    summonCd: 5.8,
    summonCount: 2,
    summonMax: 4,
    summonId: 'mite',
    desc: '躲在后方孵小绒球；同屏召唤有上限，优先拆掉它。',
  },

  // ---------- 第 8 波起：支援 ----------
  {
    id: 'glowcap',
    name: '荧光菇',
    sprite: 'enemy.glowcap',
    radius: 15,
    hp: 36,
    speed: 44,
    damage: 4,
    xp: 3,
    coin: 3,
    armor: 1,
    knockbackResist: 0.2,
    ai: 'support',
    keepDistance: 210,
    healRadius: 150,
    healAmount: 6,
    healCd: 1.8,
    healMax: 3,
    desc: '散发着柔光的蘑菇，会给周围怪物回血；不处理会让整群更耐打。',
  },

  // ---------- 召唤物（不掉落） ----------
  {
    id: 'mite',
    name: '小绒球',
    sprite: 'enemy.mite',
    radius: 8,
    hp: 7,
    speed: 108,
    damage: 3,
    xp: 0,
    coin: 0,
    armor: 0,
    knockbackResist: 0,
    ai: 'chase',
    summonOnly: true,
    desc: '巢巢兽孵出的小绒球，数量有上限，不掉金币和经验。',
  },
];

export const ENEMY_BY_ID = Object.fromEntries(ENEMY_LIST.map((e) => [e.id, e]));

export const BOSSES = {
  rumble: {
    id: 'rumble',
    name: '隆隆',
    title: '第 12 波 · 讨伐目标',
    sprite: 'enemy.boss',
    radius: 46,
    hp: 9000,
    speed: 46,
    damage: 26,
    xp: 60,
    coin: 90,
    armor: 5,
    knockbackResist: 1,
    ai: 'boss',
    desc: '平时在山谷里打盹的巨大生物，被吵醒后会横冲直撞。它没有恶意，只是现在很危险。',
  },
};

export const ALL_ENEMIES = { ...ENEMY_BY_ID, ...BOSSES };

/** 精英倍率：更强、更大、奖励更高，行为与本体一致。 */
export const ELITE_SCALING = {
  hp: 1.8,
  damage: 1.25,
  speed: 1.08,
  radius: 1.12,
  armor: 2,
  reward: 3,
};

/**
 * 按波次缩放敌人属性（不改动原始数据）。
 * 普通怪：生命 +22%/波、伤害 +10%/波、护甲每 4 波 +1。
 * 精英：在普通缩放基础上再乘 ELITE_SCALING。
 */
export function scaleEnemy(def, wave, isBoss = false, elite = false) {
  if (isBoss) {
    return {
      ...def,
      hp: def.hp,
      maxHp: def.hp,
      damage: def.damage,
      speed: def.speed,
      armor: def.armor,
      spawnWave: wave,
      elite: false,
    };
  }
  const hpMul = 1 + 0.22 * (wave - 1);
  const dmgMul = 1 + 0.1 * (wave - 1);
  const spdMul = 1 + 0.01 * (wave - 1);
  const eliteHp = elite ? ELITE_SCALING.hp : 1;
  const eliteDmg = elite ? ELITE_SCALING.damage : 1;
  const eliteSpd = elite ? ELITE_SCALING.speed : 1;
  const eliteRadius = elite ? ELITE_SCALING.radius : 1;
  const eliteArmor = elite ? ELITE_SCALING.armor : 0;
  const rewardMul = elite ? ELITE_SCALING.reward : 1;
  return {
    ...def,
    hp: Math.round(def.hp * hpMul * eliteHp),
    maxHp: Math.round(def.hp * hpMul * eliteHp),
    damage: Math.round(def.damage * dmgMul * eliteDmg * 10) / 10,
    speed: def.speed * spdMul * eliteSpd,
    radius: def.radius * eliteRadius,
    armor: def.armor + Math.floor((wave - 1) / 4) + eliteArmor,
    xp: Math.round(def.xp * rewardMul),
    coin: Math.round(def.coin * rewardMul),
    spawnWave: wave,
    elite: !!elite,
  };
}
