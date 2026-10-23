/**
 * 敌人数据（纯数值 / AI 类型）。
 * ai: chase 追击 | weave 蛇形 | shooter 远程 | boss 首领
 */
export const ENEMY_LIST = [
  {
    id: 'sweeper',
    name: '扫地机',
    sprite: 'enemy.sweeper',
    radius: 15,
    hp: 16,
    speed: 52,
    damage: 6,
    xp: 1,
    coin: 1,
    armor: 0,
    knockbackResist: 0.15,
    ai: 'chase',
    desc: '清扫巷子的第一台机器，撞上来会掉血。',
  },
  {
    id: 'drone',
    name: '吸尘无人机',
    sprite: 'enemy.drone',
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
    desc: '左右摇摆地冲过来，速度很快。',
  },
  {
    id: 'spitter',
    name: '喷水壶',
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
    bulletSpeed: 205,
    bulletDamage: 8,
    desc: '远远地朝你喷水，会保持距离。',
  },
  {
    id: 'brute',
    name: '垃圾桶怪',
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
    desc: '又慢又硬的大家伙，撞一下很痛。',
  },
];

export const ENEMY_BY_ID = Object.fromEntries(ENEMY_LIST.map((e) => [e.id, e]));

export const BOSSES = {
  ironLung: {
    id: 'ironLung',
    name: '铁肺',
    title: '第 12 波 · 首领',
    sprite: 'enemy.boss',
    radius: 46,
    hp: 2600,
    speed: 44,
    damage: 22,
    xp: 30,
    coin: 40,
    armor: 4,
    knockbackResist: 1,
    ai: 'boss',
    desc: '巷子尽头的巨型吸尘器，吸口里亮着不祥的红光。',
  },
};

export const ALL_ENEMIES = { ...ENEMY_BY_ID, ...BOSSES };

/** 按波次缩放敌人属性（不改动原始数据）。 */
export function scaleEnemy(def, wave, isBoss = false) {
  if (isBoss) {
    return {
      ...def,
      hp: def.hp,
      maxHp: def.hp,
      damage: def.damage,
      speed: def.speed,
      armor: def.armor,
      spawnWave: wave,
    };
  }
  const hpMul = 1 + 0.17 * (wave - 1);
  const dmgMul = 1 + 0.08 * (wave - 1);
  const spdMul = 1 + 0.009 * (wave - 1);
  return {
    ...def,
    hp: Math.round(def.hp * hpMul),
    maxHp: Math.round(def.hp * hpMul),
    damage: Math.round(def.damage * dmgMul * 10) / 10,
    speed: def.speed * spdMul,
    armor: def.armor + Math.floor((wave - 1) / 5),
    spawnWave: wave,
  };
}