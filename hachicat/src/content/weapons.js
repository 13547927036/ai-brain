/**
 * 武器数据（纯数值 / 行为描述）。
 * kind 决定交给哪个行为实现：
 *   projectile 直线弹   melee 扇形近战   cone 扇形吹飞
 *   beam 贯穿射线       orbit 环绕尾锤    trap 陷阱
 * levels 数组第 i 项 = 武器等级 i+1。数值全部在这里，方便调平衡。
 */
export const MAX_WEAPONS = 6;
export const MAX_WEAPON_LEVEL = 5;

export const WEAPONS = {
  hairball: {
    id: 'hairball',
    name: '毛球弹',
    kind: 'projectile',
    rarity: 1,
    desc: '吐出一团毛球，直线飞向最近的敌人。',
    levels: [
      { damage: 12, cooldown: 0.66, range: 260, speed: 440, count: 1, pierce: 0, spread: 0.1 },
      { damage: 16, cooldown: 0.62, range: 272, speed: 460, count: 1, pierce: 0, spread: 0.1 },
      { damage: 16, cooldown: 0.6, range: 284, speed: 480, count: 2, pierce: 0, spread: 0.16 },
      { damage: 20, cooldown: 0.56, range: 296, speed: 500, count: 2, pierce: 1, spread: 0.16 },
      { damage: 26, cooldown: 0.5, range: 310, speed: 530, count: 3, pierce: 1, spread: 0.2 },
    ],
  },

  claw: {
    id: 'claw',
    name: '磨爪',
    kind: 'melee',
    rarity: 1,
    desc: '贴身横挥一爪，扇形范围内的敌人全部挂彩。',
    levels: [
      { damage: 22, cooldown: 0.62, range: 90, arc: 2.2, knockback: 70 },
      { damage: 28, cooldown: 0.58, range: 96, arc: 2.3, knockback: 80 },
      { damage: 34, cooldown: 0.54, range: 102, arc: 2.5, knockback: 90 },
      { damage: 42, cooldown: 0.48, range: 110, arc: 2.6, knockback: 100 },
      { damage: 52, cooldown: 0.42, range: 120, arc: 2.8, knockback: 120 },
    ],
  },

  hiss: {
    id: 'hiss',
    name: '哈气',
    kind: 'cone',
    rarity: 2,
    desc: '炸毛哈气，把面前的机器喷退并拖慢它们。',
    levels: [
      { damage: 14, cooldown: 1.15, range: 134, arc: 1.9, knockback: 190, slow: 0.35, slowDur: 1.4 },
      { damage: 18, cooldown: 1.08, range: 144, arc: 2.0, knockback: 210, slow: 0.38, slowDur: 1.5 },
      { damage: 22, cooldown: 1.0, range: 154, arc: 2.1, knockback: 230, slow: 0.42, slowDur: 1.7 },
      { damage: 28, cooldown: 0.92, range: 166, arc: 2.2, knockback: 255, slow: 0.46, slowDur: 1.9 },
      { damage: 35, cooldown: 0.84, range: 180, arc: 2.4, knockback: 285, slow: 0.5, slowDur: 2.1 },
    ],
  },

  laser: {
    id: 'laser',
    name: '激光笔',
    kind: 'beam',
    rarity: 2,
    desc: '红点扫过的地方就是一条直线伤害，穿透所有敌人。',
    levels: [
      { damage: 10, cooldown: 0.58, range: 360, width: 12, pierce: 99 },
      { damage: 13, cooldown: 0.54, range: 380, width: 14, pierce: 99 },
      { damage: 16, cooldown: 0.5, range: 400, width: 17, pierce: 99 },
      { damage: 20, cooldown: 0.46, range: 420, width: 20, pierce: 99 },
      { damage: 25, cooldown: 0.4, range: 450, width: 24, pierce: 99 },
    ],
  },

  tail: {
    id: 'tail',
    name: '尾巴旋风',
    kind: 'orbit',
    rarity: 2,
    desc: '尾巴甩成风车，绕着身子持续蹭伤靠近的敌人。',
    levels: [
      { damage: 10, cooldown: 0.3, range: 70, count: 1, spin: 2.5, tick: 0.32 },
      { damage: 13, cooldown: 0.3, range: 76, count: 1, spin: 2.8, tick: 0.3 },
      { damage: 13, cooldown: 0.3, range: 80, count: 2, spin: 3.1, tick: 0.28 },
      { damage: 18, cooldown: 0.3, range: 86, count: 2, spin: 3.4, tick: 0.26 },
      { damage: 22, cooldown: 0.3, range: 94, count: 3, spin: 3.8, tick: 0.24 },
    ],
  },

  trap: {
    id: 'trap',
    name: '捕鼠夹',
    kind: 'trap',
    rarity: 3,
    desc: '在脚下丢一只夹子，敌人踩上去会被弹飞。',
    levels: [
      { damage: 40, cooldown: 2.6, range: 0, blast: 58, max: 3, armTime: 0.25 },
      { damage: 52, cooldown: 2.4, range: 0, blast: 62, max: 3, armTime: 0.25 },
      { damage: 66, cooldown: 2.2, range: 0, blast: 68, max: 4, armTime: 0.22 },
      { damage: 84, cooldown: 2.0, range: 0, blast: 74, max: 4, armTime: 0.2 },
      { damage: 106, cooldown: 1.8, range: 0, blast: 82, max: 5, armTime: 0.18 },
    ],
  },
};

export const WEAPON_LIST = Object.values(WEAPONS);

export function getWeapon(id) {
  return WEAPONS[id];
}

export function weaponLevelStats(weaponId, level) {
  const def = WEAPONS[weaponId];
  if (!def) return null;
  return def.levels[Math.min(def.levels.length - 1, Math.max(0, level - 1))];
}

export function weaponPrice(def) {
  return { 1: 20, 2: 34, 3: 52 }[def.rarity] || 22;
}

/**
 * 高等级升级的溢价曲线：等级越高越贵，避免后期金币无处可花。
 * 下标 = 目标等级 - 1。
 */
export const WEAPON_LEVEL_PRICE_MUL = [1, 1.5, 2.25, 3.4, 4.8];

/**
 * 同等级副本：商店按概率出售已有武器的同级副本，两件同级靠合成升一级。
 * 副本单价按对应直购升级价打折，比例须小于 0.5，否则直购路线失去意义。
 */
export const WEAPON_COPY_CHANCE = 0.3;
export const WEAPON_COPY_PRICE_RATIO = 0.42;