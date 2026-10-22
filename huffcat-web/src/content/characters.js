/**
 * 角色数据（纯配置，不含任何绘制 / DOM 逻辑）。
 * base 中的字段与 src/game/stats.js 的 STAT_META 一一对应。
 */
export const CHARACTERS = [
  {
    id: 'ginger',
    name: '橘座',
    title: '巷口的老大',
    desc: '皮糙肉厚，一出门就带着毛球弹。适合第一次闯巷子的猫。',
    sprite: 'cat.ginger',
    unlock: null,
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
    id: 'soot',
    name: '煤球',
    title: '屋顶的影子',
    desc: '跑得最快，靠磨爪贴身撕开一条路。血薄，别被围住。',
    sprite: 'cat.soot',
    unlock: null,
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
    id: 'frost',
    name: '雪团',
    title: '冷柜上的白猫',
    desc: '眼神像激光笔。远程点射贯穿一排，但腿脚不太利索。',
    sprite: 'cat.frost',
    unlock: null,
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
  },
  {
    id: 'shadow',
    name: '影丸',
    title: '除尘管里的传说',
    desc: '在尘袋里活下来的猫。攻速极快，靠哈气把整条街的机器吹退。',
    sprite: 'cat.shadow',
    unlock: { type: 'wave', value: 8, label: '通关第 8 波后解锁' },
    base: {
      maxHp: 84,
      speed: 190,
      damageMul: 1.15,
      attackSpeedMul: 1.35,
      rangeMul: 0.92,
      pickup: 68,
      armor: 0,
      crit: 0.12,
      critMul: 1.55,
      luck: 1,
      regen: 0,
    },
    startWeapon: 'hiss',
    trait: '攻速 +35%，暴击 +12%',
  },
];

export const CHARACTER_BY_ID = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));

export function getCharacter(id) {
  return CHARACTER_BY_ID[id] || CHARACTERS[0];
}