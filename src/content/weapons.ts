import type { Quality, WeaponDef } from './types.js';

export const QUALITY_DAMAGE_MUL: Record<Quality, number> = { 1: 1.0, 2: 1.35, 3: 1.8, 4: 2.4 };
export const QUALITY_BASE_PRICE: Record<Quality, number> = { 1: 8, 2: 16, 3: 28, 4: 45 };
export const QUALITY_MIN_WAVE: Record<Quality, number> = { 1: 1, 2: 2, 3: 4, 4: 7 };
export const SET_BONUS_PER_WEAPON = 0.08;

type WeaponSeed = Pick<WeaponDef, 'id' | 'name' | 'kind' | 'damage' | 'cooldown' | 'range' | 'basePrice'> & Partial<WeaponDef>;

function w(seed: WeaponSeed): WeaponDef {
  return {
    shots: 1,
    spreadDeg: 0,
    pierce: 0,
    hitRadius: 0,
    arcDeg: 0,
    maxHits: 0,
    projectileSpeed: 0,
    knockback: 0,
    ...seed,
  };
}

export const WEAPONS: WeaponDef[] = [
  w({ id: 'club', name: '讨伐棒', kind: 'melee', damage: 6, cooldown: 0.8, range: 70, arcDeg: 90, hitRadius: 70, maxHits: 3, basePrice: 8 }),
  w({ id: 'spear', name: '刺叉', kind: 'melee', damage: 5, cooldown: 0.7, range: 90, pierce: 2, hitRadius: 16, knockback: 0.5, basePrice: 8 }),
  w({ id: 'greatsword', name: '海獭大剑', kind: 'melee', damage: 14, cooldown: 1.6, range: 80, arcDeg: 140, hitRadius: 80, knockback: 2.5, basePrice: 8 }),
  w({ id: 'broom', name: '扫帚', kind: 'melee', damage: 3, cooldown: 0.35, range: 55, arcDeg: 70, hitRadius: 55, basePrice: 8 }),
  w({ id: 'dualCannon', name: '双端火炮棍', kind: 'ranged', damage: 4, cooldown: 1.1, range: 300, shots: 2, spreadDeg: 24, projectileSpeed: 420, hitRadius: 10, basePrice: 8 }),
  w({ id: 'slingStone', name: '投石', kind: 'ranged', damage: 9, cooldown: 1.5, range: 260, projectileSpeed: 300, hitRadius: 40, basePrice: 8 }),
  w({ id: 'slingshot', name: '弹弓', kind: 'ranged', damage: 3, cooldown: 0.4, range: 280, projectileSpeed: 520, hitRadius: 8, basePrice: 8 }),
  w({ id: 'kunai', name: '苦无', kind: 'ranged', damage: 5, cooldown: 0.9, range: 320, pierce: 99, projectileSpeed: 480, hitRadius: 9, basePrice: 8 }),
];

export const WEAPON_BY_ID: Record<string, WeaponDef> = Object.fromEntries(WEAPONS.map((x) => [x.id, x]));

export function weaponDamage(def: WeaponDef, quality: Quality): number {
  return def.damage * QUALITY_DAMAGE_MUL[quality];
}

/** 商店最终价 = ceil(基础价 × (1 + 0.35 × (波数 − 1)))（spec 4.3） */
export function shopPrice(basePrice: number, wave: number): number {
  return Math.ceil(basePrice * (1 + 0.35 * (wave - 1)));
}

/** 重掷费用 = 1 + 波数，同一商店内每次重掷再 +1（spec 4.3） */
export function rerollPrice(wave: number, rerollCount: number): number {
  return 1 + wave + rerollCount;
}
