import { STAT_CAPS } from '../content/stats.js';
import { clamp } from './types.js';

/**
 * spec 4.3「属性效果公式」的唯一实现处。
 * 所有战斗数值都必须走这里，不允许在别处散落魔法数字。
 *
 * 约定：主属性中 attackSpeed / moveSpeed / critChance / luck 以「百分点」存储
 * （例如 attackSpeed = 40 表示 +40%），因此公式里除以 100。
 */

/** 暴击伤害倍率（spec：暴击伤害 = 2×） */
export const CRIT_MULTIPLIER = 2;

/** 生命回复的结算间隔，秒（spec：每 3 秒回复「生命回复」点） */
export const REGEN_INTERVAL = 3;

/** 护甲减伤系数：受到伤害 × 1/(1 + 护甲/15)，护甲上限 30 */
export function armorMultiplier(armor: number): number {
  const a = clamp(armor, 0, STAT_CAPS.armor);
  return 1 / (1 + a / 15);
}

/** 应用护甲后的实际伤害 */
export function applyArmor(damage: number, armor: number): number {
  return damage * armorMultiplier(armor);
}

/** 闪避率 = 闪避/(闪避+40)，上限 60% */
export function dodgeRate(dodge: number): number {
  const d = Math.max(0, dodge);
  return Math.min(STAT_CAPS.dodgeRate, d / (d + 40));
}

/** 实际冷却 = 基础冷却 / (1 + 攻速加成)，且不超过 12 次/秒 */
export function attackCooldown(baseCooldown: number, attackSpeed: number): number {
  const cd = baseCooldown / (1 + Math.max(-0.99, attackSpeed / 100));
  return Math.max(1 / STAT_CAPS.attacksPerSecond, cd);
}

/** 实际攻速（次/秒） */
export function attacksPerSecond(baseCooldown: number, attackSpeed: number): number {
  return 1 / attackCooldown(baseCooldown, attackSpeed);
}

/** 实际移速 = 基础移速 × (1 + 移速加成) */
export function moveSpeed(baseSpeed: number, moveSpeedBonus: number): number {
  return baseSpeed * (1 + moveSpeedBonus / 100);
}

/** 幸运掉落率 = 基础掉率 × (1 + 幸运/100) */
export function luckDropRate(baseRate: number, luck: number): number {
  return baseRate * (1 + luck / 100);
}

/** 升级所需经验 = (等级 + 3)² */
export const XP_CURVE_SCALE = 0.55;
export function xpForLevel(level: number): number {
  // 原式 (level+3)^2 实测把终局等级压在 11 级左右 —— 全程只有 11 次属性成长，
  // 追不上敌人第 12 波 2.98 倍血量。系数 0.55 让终局落在 16~17 级。
  return Math.round((level + 3) ** 2 * XP_CURVE_SCALE);
}

/** 每次升级固定 +1 最大生命（spec 4.3） */
export const HP_PER_LEVEL = 1;

/** 同类武器套装加成：每多一把 +8%（spec 4.3） */
export function setBonusMultiplier(countInCategory: number, bonusPerWeapon: number): number {
  if (countInCategory <= 1) return 1;
  return 1 + bonusPerWeapon * (countInCategory - 1);
}

/** 单次武器命中的最终伤害（未暴击） */
export function weaponHitDamage(
  baseDamage: number,
  attackSpeedDamageBonus: number,
  setMultiplier: number,
): number {
  return (baseDamage + attackSpeedDamageBonus) * setMultiplier;
}
