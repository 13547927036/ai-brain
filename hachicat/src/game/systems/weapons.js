import { getWeapon } from '../../content/weapons.js';
import { WEAPON_PROJECTILE_SPRITE } from '../../content/assets.js';
import { rollDamage } from '../stats.js';
import { damageEnemy } from './damage.js';
import { findNearestEnemy, angleDiff, pointSegmentDistance } from './targeting.js';
import { spawnBeam, spawnPuff, spawnRing, spawnSlash, spawnShock } from './effects.js';
import { spawnBullet } from './projectiles.js';

/**
 * 自动开火：武器自己找最近的敌人，朝它开火。
 * 所有外观只通过 sprite id 传递给渲染层。
 */
export function stepWeapons(world, dt) {
  const p = world.player;
  if (!p.alive) return;

  const aimTarget = findNearestEnemy(world, p.x, p.y, 560);
  if (aimTarget) {
    p.aim = Math.atan2(aimTarget.y - p.y, aimTarget.x - p.x);
    p.facing = Math.cos(p.aim) >= 0 ? 1 : -1;
  } else if (p.moving) {
    p.aim = Math.atan2(p.moveY, p.moveX);
    p.facing = p.moveX >= 0 ? 1 : -1;
  }

  for (const weapon of p.weapons) {
    const def = getWeapon(weapon.id);
    if (!def) continue;
    const stats = def.levels[Math.min(weapon.level, def.levels.length) - 1];

    if (def.kind === 'orbit') {
      stepOrbit(world, weapon, def, stats, dt);
      continue;
    }

    weapon.cd -= dt;
    if (weapon.cd > 0) continue;

    const range = (stats.range || 0) * p.stats.rangeMul;
    const target = findNearestEnemy(world, p.x, p.y, Math.max(range, 220) + 30);
    if (!target) {
      weapon.cd = 0;
      continue;
    }

    const angle = Math.atan2(target.y - p.y, target.x - p.x);
    const fired = fire(world, weapon, def, stats, angle, range);
    if (fired) {
      weapon.cd = Math.max(0.08, stats.cooldown / p.stats.attackSpeedMul);
      p.aim = angle;
    } else {
      weapon.cd = 0;
    }
  }

  stepTraps(world, dt);
}

function fire(world, weapon, def, stats, angle, range) {
  const p = world.player;
  switch (def.kind) {
    case 'projectile': {
      const count = stats.count || 1;
      const spread = stats.spread || 0;
      const speed = stats.speed || 420;
      for (let i = 0; i < count; i++) {
        const offset = (i - (count - 1) / 2) * spread;
        const { damage, crit } = rollDamage(stats.damage, p.stats, world.rng);
        spawnBullet(world, {
          x: p.x + Math.cos(angle + offset) * 18,
          y: p.y + Math.sin(angle + offset) * 18,
          angle: angle + offset,
          speed,
          damage,
          crit,
          pierce: stats.pierce || 0,
          ttl: (range / speed) * 1.35,
          radius: 8,
          knockback: 18,
          sprite: WEAPON_PROJECTILE_SPRITE[def.id] || 'proj.generic',
          sourceKind: 'projectile',
        });
      }
      world.stats.shots += count;
      return true;
    }

    case 'melee': {
      const arc = stats.arc || 2.2;
      hitArcEnemies(world, angle, range, arc, stats, { knockback: stats.knockback || 0, sourceKind: 'melee' });
      spawnSlash(world, p.x, p.y, angle, range, arc, 'accent');
      return true;
    }

    case 'cone': {
      const arc = stats.arc || 1.9;
      const hits = hitArcEnemies(world, angle, range, arc, stats, {
        knockback: stats.knockback || 0,
        slow: stats,
        sourceKind: 'melee',
      });
      spawnPuff(world, p.x, p.y, angle, range, arc, 'accent');
      if (hits > 0) world.shake = Math.min(1, world.shake + 0.08);
      return true;
    }

    case 'beam': {
      const x2 = p.x + Math.cos(angle) * range;
      const y2 = p.y + Math.sin(angle) * range;
      const width = stats.width || 12;
      for (const e of world.enemies) {
        if (e.dead) continue;
        const d = pointSegmentDistance(e.x, e.y, p.x, p.y, x2, y2);
        if (d > width / 2 + e.radius) continue;
        const { damage, crit } = rollDamage(stats.damage, p.stats, world.rng);
        damageEnemy(world, e, damage, {
          crit,
          knockback: 30,
          dirX: Math.cos(angle),
          dirY: Math.sin(angle),
          sourceKind: 'beam',
        });
      }
      spawnBeam(world, p.x, p.y, x2, y2, 'danger', 0.12);
      world.stats.shots += 1;
      return true;
    }

    case 'trap': {
      if (world.traps.length >= (stats.max || 3)) return false;
      const px = p.x + Math.cos(angle + Math.PI) * 16;
      const py = p.y + Math.sin(angle + Math.PI) * 16;
      world.traps.push({
        x: px,
        y: py,
        radius: 14,
        blast: stats.blast || 58,
        damage: stats.damage,
        arm: stats.armTime ?? 0.25,
        ttl: 22,
        pulse: 0,
      });
      spawnRing(world, px, py, 16, 'coin', 0.25, 2);
      return true;
    }

    default:
      return false;
  }
}

function hitArcEnemies(world, angle, range, arc, stats, opts = {}) {
  const p = world.player;
  let hits = 0;
  for (const e of world.enemies) {
    if (e.dead) continue;
    const dx = e.x - p.x;
    const dy = e.y - p.y;
    const dist = Math.hypot(dx, dy);
    if (dist > range + e.radius) continue;
    if (Math.abs(angleDiff(Math.atan2(dy, dx), angle)) > arc / 2) continue;

    const { damage, crit } = rollDamage(stats.damage, p.stats, world.rng);
    damageEnemy(world, e, damage, {
      crit,
      knockback: opts.knockback || 0,
      dirX: dx,
      dirY: dy,
      sourceKind: opts.sourceKind || 'melee',
    });

    if (opts.slow && opts.slow.slow) {
      e.slow = Math.max(e.slow || 0, opts.slow.slow);
      e.slowT = Math.max(e.slowT || 0, opts.slow.slowDur || 1);
    }
    hits += 1;
  }
  return hits;
}

/** 环绕尾巴：不打冷却，按每个敌人独立的内置冷却结算。 */
function stepOrbit(world, weapon, def, stats, dt) {
  const p = world.player;
  const radius = (stats.range || 70) * p.stats.rangeMul;
  const count = stats.count || 1;
  weapon.state = weapon.state || { spin: 0, hits: new Map() };
  weapon.state.spin += (stats.spin || 2.5) * dt;
  weapon.state.hits = weapon.state.hits || new Map();

  for (const [id, t] of weapon.state.hits) {
    const next = t - dt;
    if (next <= 0) weapon.state.hits.delete(id);
    else weapon.state.hits.set(id, next);
  }

  const orbs = [];
  for (let i = 0; i < count; i++) {
    const a = weapon.state.spin + (i * Math.PI * 2) / count;
    const ox = p.x + Math.cos(a) * radius;
    const oy = p.y + Math.sin(a) * radius;
    orbs.push({ x: ox, y: oy, angle: a });

    for (const e of world.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - ox, e.y - oy);
      if (d > e.radius + 12) continue;
      if (weapon.state.hits.has(e.id)) continue;
      const { damage, crit } = rollDamage(stats.damage, p.stats, world.rng);
      damageEnemy(world, e, damage, {
        crit,
        knockback: 26,
        dirX: Math.cos(a),
        dirY: Math.sin(a),
        sourceKind: 'melee',
      });
      weapon.state.hits.set(e.id, stats.tick || 0.3);
    }
  }
  weapon.orbs = orbs;
}

export function stepTraps(world, dt) {
  const traps = world.traps;
  for (let i = traps.length - 1; i >= 0; i--) {
    const t = traps[i];
    t.arm -= dt;
    t.ttl -= dt;
    t.pulse += dt;

    if (t.ttl <= 0) {
      traps.splice(i, 1);
      continue;
    }
    if (t.arm > 0) continue;

    let triggered = false;
    for (const e of world.enemies) {
      if (e.dead) continue;
      if ((e.x - t.x) ** 2 + (e.y - t.y) ** 2 <= (e.radius + 16) ** 2) {
        triggered = true;
        break;
      }
    }
    if (!triggered) continue;

    const p = world.player;
    for (const e of world.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - t.x, e.y - t.y);
      if (d > t.blast + e.radius) continue;
      const { damage, crit } = rollDamage(t.damage, p.stats, world.rng);
      damageEnemy(world, e, damage, {
        crit,
        knockback: 260,
        dirX: e.x - t.x,
        dirY: e.y - t.y,
        sourceKind: 'trap',
      });
    }
    spawnShock(world, t.x, t.y, t.blast, 'coin');
    world.shake = Math.min(1, world.shake + 0.22);
    traps.splice(i, 1);
  }
}