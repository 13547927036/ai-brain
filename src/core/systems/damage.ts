import { ENEMY_BY_ID } from '../../content/enemies.js';
import type { Quality, WeaponDef } from '../../content/types.js';
import { SET_BONUS_PER_WEAPON, WEAPON_BY_ID, weaponDamage } from '../../content/weapons.js';
import { CRIT_MULTIPLIER, luckDropRate, setBonusMultiplier } from '../formulas.js';
import type { Enemy, WeaponInstance, World } from '../world.js';

/** 基础掉落率：每只敌人掉 1 个材料的概率 */
export const BASE_MATERIAL_DROP = 1.0;
/** 每只敌人掉落的材料数量。Brotato 的量级是每波能买 2~3 件，据此校准。 */
export const MATERIALS_PER_KILL = 2;
/** 治疗掉落的基础概率 */
export const BASE_HEAL_DROP = 0.02;
/** 飘字存活时间，秒 */
export const FLOATER_LIFE = 0.6;
/** 击杀粒子数 */
export const KILL_PARTICLES = 6;

export interface DamageContext {
  meleeCount: number;
  rangedCount: number;
  meleeDamage: number;
  rangedDamage: number;
  critChance: number;
  luck: number;
  knockback: number;
}

export function countWeaponCategories(weapons: WeaponInstance[]): { melee: number; ranged: number } {
  let melee = 0;
  let ranged = 0;
  for (const inst of weapons) {
    if (inst.quality < 1) continue;
    const kind = categoryOf(inst.defId);
    if (kind === 'melee') melee++;
    else if (kind === 'ranged') ranged++;
  }
  return { melee, ranged };
}

let categoryCache: Map<string, 'melee' | 'ranged' | 'elemental'> | null = null;

function categoryOf(defId: string): 'melee' | 'ranged' | 'elemental' {
  if (!categoryCache) categoryCache = new Map();
  const hit = categoryCache.get(defId);
  if (hit) return hit;
  // 延迟到调用时才解析，避免模块循环依赖
  const kind = WEAPON_BY_ID[defId]?.kind ?? 'melee';
  categoryCache.set(defId, kind);
  return kind;
}

let resolveKind: (defId: string) => 'melee' | 'ranged' | 'elemental' = () => 'melee';

/** 由外部注入武器查表，打破 damage <-> weapons 的循环依赖 */
export function setWeaponKindResolver(fn: (defId: string) => 'melee' | 'ranged' | 'elemental'): void {
  resolveKind = fn;
  categoryCache = null;
}

export function buildDamageContext(w: World): DamageContext {
  const p = w.player;
  const counts = countWeaponCategories(p.weapons);
  return {
    meleeCount: counts.melee,
    rangedCount: counts.ranged,
    meleeDamage: p.stats.meleeDamage,
    rangedDamage: p.stats.rangedDamage,
    critChance: p.stats.critChance,
    luck: p.stats.luck,
    knockback: p.stats.knockback,
  };
}

/** 单次命中的伤害与是否暴击。暴击逐次判定（不是逐武器）。 */
export function computeWeaponDamage(
  def: WeaponDef,
  quality: Quality,
  ctx: DamageContext,
  roll: number,
): { amount: number; crit: boolean } {
  let base = weaponDamage(def, quality);
  if (def.kind === 'melee') base += ctx.meleeDamage;
  else if (def.kind === 'ranged') base += ctx.rangedDamage;

  const count = def.kind === 'melee' ? ctx.meleeCount : ctx.rangedCount;
  base *= setBonusMultiplier(count, SET_BONUS_PER_WEAPON);

  const crit = roll * 100 < ctx.critChance;
  return { amount: crit ? base * CRIT_MULTIPLIER : base, crit };
}

export function spawnFloater(w: World, x: number, y: number, value: number, crit: boolean): void {
  const f = w.floaters.spawn();
  if (!f) return;
  f.x = x;
  f.y = y;
  f.vy = -40;
  f.value = Math.round(value);
  f.crit = crit;
  f.life = FLOATER_LIFE;
  f.maxLife = FLOATER_LIFE;
}

export function spawnParticles(w: World, x: number, y: number, count: number, colorIndex: number): void {
  for (let i = 0; i < count; i++) {
    const p = w.particles.spawn();
    if (!p) return;
    const a = w.rng.range(0, Math.PI * 2);
    const sp = w.rng.range(40, 160);
    p.x = x;
    p.y = y;
    p.vx = Math.cos(a) * sp;
    p.vy = Math.sin(a) * sp;
    p.life = 0.35;
    p.maxLife = 0.35;
    p.size = 3;
    p.colorIndex = colorIndex;
  }
}

/** 敌人在本帧受到的伤害。返回是否被击杀。 */
export function damageEnemy(
  w: World,
  e: Enemy,
  amount: number,
  crit: boolean,
  dirX: number,
  dirY: number,
  knockback: number,
): boolean {
  e.hp -= amount;
  e.hitFlash = 0.08;

  if (knockback > 0) {
    const total = knockback * (1 + w.player.stats.knockback / 10);
    e.knockX += dirX * total * 120;
    e.knockY += dirY * total * 120;
  }

  w.events.push({ type: 'hit', x: e.x, y: e.y, crit });
  spawnFloater(w, e.x, e.y - e.radius, amount, crit);

  if (e.hp > 0) return false;
  killEnemy(w, e);
  return true;
}

export function killEnemy(w: World, e: Enemy): void {
  const def = ENEMY_BY_ID[e.defId];
  w.events.push({ type: 'kill', x: e.x, y: e.y, enemyId: e.defId });
  spawnParticles(w, e.x, e.y, KILL_PARTICLES, def?.kind === 'boss' ? 3 : 0);
  dropLoot(w, e, def?.kind === 'boss');
}

export function dropLoot(w: World, e: Enemy, isBoss: boolean): void {
  const luck = w.player.stats.luck;
  const count = isBoss ? MATERIALS_PER_KILL * 12 : MATERIALS_PER_KILL;
  for (let i = 0; i < count; i++) {
    if (!isBoss && w.rng.next() > luckDropRate(BASE_MATERIAL_DROP, luck)) continue;
    const p = w.pickups.spawn();
    if (!p) return;
    const a = w.rng.range(0, Math.PI * 2);
    const r = isBoss ? w.rng.range(0, 60) : w.rng.range(0, 12);
    p.kind = 'material';
    p.x = e.x + Math.cos(a) * r;
    p.y = e.y + Math.sin(a) * r;
    p.value = 1;
    p.life = 30;
    p.magnet = false;
  }

  const healChance = luckDropRate(BASE_HEAL_DROP, luck);
  if (w.rng.next() < healChance) {
    const h = w.pickups.spawn();
    if (h) {
      h.kind = 'heal';
      h.x = e.x;
      h.y = e.y;
      h.value = 10;
      h.life = 30;
      h.magnet = false;
    }
  }
}
