/**
 * 角色数据（纯配置，不含任何绘制 / DOM 逻辑）。
 * base 中的字段与 src/game/stats.js 的 STAT_META 一一对应。
 */
export const CHARACTERS = [
  {
    id: 'hachiware',
    name: '小八',
    title: '乐观可靠的朋友',
    desc: '总是笑眯眯地鼓励大家，遇到麻烦会先站出来。身体结实，背着一袋毛线团，适合第一次接委托的人。',
    sprite: 'char.hachiware',
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
    name: '吉伊卡哇',
    title: '温柔又努力',
    desc: '容易紧张，也会被吓哭，但答应下来的工作一定会认真做完。跑得快、出手也快，握紧小木槌就往前冲。',
    sprite: 'char.chiikawa',
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
    title: '自由自在的精力派',
    desc: '胆子大、精力旺，常常先冲出去再说。看着不太靠谱，关键时刻却总能照出一条路。',
    sprite: 'char.usagi',
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