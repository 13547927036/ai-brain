import type { Quality, WeaponDef } from '../../content/types.js';
import { WEAPON_BY_ID } from '../../content/weapons.js';
import { attackCooldown } from '../formulas.js';
import type { Enemy, WeaponInstance, World } from '../world.js';
import { buildDamageContext, computeWeaponDamage, damageEnemy, type DamageContext } from './damage.js';
import { arcCosThreshold, inArc, nearestEnemy, updateFacing } from './targeting.js';

/** 射程 >= 此值的远程武器命中时产生范围伤害（投石） */
export const AOE_RADIUS_THRESHOLD = 20;

function weaponMaxRange(weapons: WeaponInstance[]): number {
  let max = 0;
  for (const inst of weapons) {
    const d = WEAPON_BY_ID[inst.defId];
    if (d && d.range > max) max = d.range;
  }
  return max;
}

/**
 * 自动开火：武器各自独立冷却、各自索敌。
 * 没有目标时冷却停在 0（不累积负数），这样敌人一进入射程就能立刻开火。
 */
export function updateWeapons(w: World, dt: number): void {
  const p = w.player;
  if (p.weapons.length === 0) return;

  const ctx = buildDamageContext(w);
  updateFacing(w, weaponMaxRange(p.weapons));

  for (const inst of p.weapons) {
    const def = WEAPON_BY_ID[inst.defId];
    if (!def) continue;

    inst.cooldown -= dt;
    if (inst.cooldown > 0) continue;

    const target = nearestEnemy(w, p.x, p.y, def.range);
    if (!target) {
      inst.cooldown = 0;
      continue;
    }

    inst.cooldown = attackCooldown(def.cooldown, p.stats.attackSpeed);
    if (def.kind === 'melee') fireMelee(w, def, inst.quality, ctx, target);
    else fireRanged(w, def, inst.quality, ctx, target);
  }
}

/** 近战：朝目标方向判定扇形，按距离就近命中，受 maxHits 限制 */
export function fireMelee(
  w: World,
  def: WeaponDef,
  quality: Quality,
  ctx: DamageContext,
  target: Enemy,
): number {
  const p = w.player;
  const dx = target.x - p.x;
  const dy = target.y - p.y;
  const len = Math.hypot(dx, dy) || 1;
  const fx = dx / len;
  const fy = dy / len;
  const cos = arcCosThreshold(def.arcDeg > 0 ? def.arcDeg : 360);

  const hits: Enemy[] = [];
  const dists: number[] = [];
  for (let i = 0; i < w.enemies.length; i++) {
    const e = w.enemies.items[i] as Enemy;
    if (e.hp <= 0) continue;
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d > def.range + e.radius) continue;
    if (!inArc(p.x, p.y, fx, fy, e.x, e.y, cos)) continue;
    hits.push(e);
    dists.push(d);
  }

  const order = hits.map((_, i) => i).sort((a, b) => (dists[a] as number) - (dists[b] as number));
  const limit = def.maxHits > 0 ? Math.min(def.maxHits, order.length) : order.length;

  w.events.push({ type: 'fire', x: p.x, y: p.y, weaponId: def.id });

  let applied = 0;
  for (let k = 0; k < limit; k++) {
    const e = hits[order[k] as number];
    if (!e) continue;
    const { amount, crit } = computeWeaponDamage(def, quality, ctx, w.rng.next());
    damageEnemy(w, e, amount, crit, fx, fy, def.knockback);
    applied++;
  }
  return applied;
}

/** 远程：生成弹丸，散射角均分 */
export function fireRanged(
  w: World,
  def: WeaponDef,
  quality: Quality,
  ctx: DamageContext,
  target: Enemy,
): number {
  const p = w.player;
  const base = Math.atan2(target.y - p.y, target.x - p.x);
  const spread = (def.spreadDeg * Math.PI) / 180;
  const shots = Math.max(1, def.shots);
  const speed = def.projectileSpeed > 0 ? def.projectileSpeed : 400;

  let fired = 0;
  for (let s = 0; s < shots; s++) {
    const off = shots === 1 ? 0 : (s / (shots - 1) - 0.5) * spread;
    const a = base + off;
    const b = w.bullets.spawn();
    if (!b) break;

    const { amount, crit } = computeWeaponDamage(def, quality, ctx, w.rng.next());
    b.x = p.x;
    b.y = p.y;
    b.vx = Math.cos(a) * speed;
    b.vy = Math.sin(a) * speed;
    b.damage = amount;
    b.crit = crit;
    b.radius = def.hitRadius > 0 ? def.hitRadius : 8;
    b.pierce = def.pierce;
    b.fromPlayer = true;
    b.life = def.range / speed;
    b.aoeRadius = def.hitRadius >= AOE_RADIUS_THRESHOLD ? def.hitRadius : 0;
    fired++;
  }

  w.events.push({ type: 'fire', x: p.x, y: p.y, weaponId: def.id });
  return fired;
}
