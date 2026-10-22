import type { CharacterDef } from './types.js';

/**
 * 3 个角色，规则严格取自 spec 4.4。
 * 保留《土豆兄弟》最聪明的一条设计：角色是改规则，不是加数值。
 */
export const CHARACTERS: CharacterDef[] = [
  {
    id: 'chiikawa', name: '吉伊卡哇', appearanceId: 'playerChiikawa',
    hpMul: 0.75, luckMul: 1.5, attackSpeedMul: 1, armorLocked: false,
    materialXpMul: 1, weaponSlots: 6, slotUnlockWaves: [],
  },
  {
    id: 'hachiware', name: '小八', appearanceId: 'playerHachiware',
    hpMul: 1, luckMul: 1, attackSpeedMul: 1, armorLocked: false,
    materialXpMul: 1.25, weaponSlots: 4, slotUnlockWaves: [5, 9],
  },
  {
    id: 'usagi', name: '乌萨奇', appearanceId: 'playerUsagi',
    hpMul: 1, luckMul: 1, attackSpeedMul: 1.4, armorLocked: true,
    materialXpMul: 1, weaponSlots: 6, slotUnlockWaves: [],
  },
];

export const CHARACTER_BY_ID: Record<string, CharacterDef> = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));

export const MAX_WEAPON_SLOTS = 6;

/** 第 wave 波结束后该角色拥有的武器槽数量 */
export function slotsAfterWave(def: CharacterDef, wave: number): number {
  const unlocked = def.slotUnlockWaves.filter((w) => wave >= w).length;
  return Math.min(MAX_WEAPON_SLOTS, def.weaponSlots + unlocked);
}
