/**
 * 角色数据（纯配置，不含任何绘制 / DOM 逻辑）。
 * base 中的字段与 src/game/stats.js 的 STAT_META 一一对应。
 */
export const CHARACTERS = [
  {
    id: 'hachiware',
    name: '小八',
    title: '温柔可靠的日常搭档',
    desc: '皮糙肉厚，一出门就带着毛球弹。适合第一次闯巷子的猫。',
    sprite: 'cat.hachiware',
    base: {
      maxHp: 120,
      speed: 170,
      damageMul: 1,
      attackSpeedMul: 1,
      rangeMul: 1,
      pickup: 74,
      armor: 1,
      crit: 0.05,
      critMul: 1.6,
      luck: 0,
      regen: 0,
    },
    startWeapon: 'hairball',
    trait: '最大生命 +20%，护甲 +1',
  },
  {
    id: 'chiikawa',
    name: '吉伊',
    title: '有点胆小却努力的冒险家',
    desc: '跑得最快，靠磨爪贴身撕开一条路。血薄，别被围住。',
    sprite: 'cat.chiikawa',
    base: {
      maxHp: 90,
      speed: 208,
      damageMul: 1.05,
      attackSpeedMul: 1.18,
      rangeMul: 1,
      pickup: 62,
      armor: 0,
      crit: 0.1,
      critMul: 1.7,
      luck: 0,
      regen: 0,
    },
    startWeapon: 'claw',
    trait: '移速 +22%，攻速 +18%',
  },
  {
    id: 'usagi',
    name: '乌萨奇',
    title: '精力充沛的自由行动派',
    desc: '眼神像激光笔。远程点射贯穿一排，但腿脚不太利索。',
    sprite: 'cat.usagi',
    base: {
      maxHp: 96,
      speed: 158,
      damageMul: 1.22,
      attackSpeedMul: 0.92,
      rangeMul: 1.12,
      pickup: 80,
      armor: 0,
      crit: 0.03,
      critMul: 1.8,
      luck: 2,
      regen: 0,
    },
    startWeapon: 'laser',
    trait: '伤害 +22%，射程 +12%',
  }
];

export const CHARACTER_BY_ID = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));

export function getCharacter(id) {
  return CHARACTER_BY_ID[id] || CHARACTERS[0];
}