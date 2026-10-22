import { damageEnemy, damagePlayer } from './damage.js';
import { spawnSpark } from './effects.js';

export function spawnBullet(world, opts) {
  const b = {
    x: opts.x,
    y: opts.y,
    vx: Math.cos(opts.angle) * opts.speed,
    vy: Math.sin(opts.angle) * opts.speed,
    radius: opts.radius ?? 7,
    damage: opts.damage,
    crit: !!opts.crit,
    pierce: opts.pierce ?? 0,
    hits: [],
    ttl: opts.ttl ?? 1.2,
    sprite: opts.sprite || 'proj.generic',
    knockback: opts.knockback ?? 16,
  };
  world.bullets.push(b);
  return b;
}

/** 玩家子弹：飞行 + 穿透 + 命中。 */
export function stepBullets(world, dt) {
  const list = world.bullets;
  const arena = world.arena;
  for (let i = list.length - 1; i >= 0; i--) {
    const b = list[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.ttl -= dt;

    let dead = b.ttl <= 0 || b.x < -20 || b.y < -20 || b.x > arena.w + 20 || b.y > arena.h + 20;

    if (!dead) {
      for (const e of world.enemies) {
        if (e.dead || b.hits.includes(e.id)) continue;
        const dx = e.x - b.x;
        const dy = e.y - b.y;
        const rr = e.radius + b.radius;
        if (dx * dx + dy * dy > rr * rr) continue;

        damageEnemy(world, e, b.damage, {
          crit: b.crit,
          knockback: b.knockback,
          dirX: b.vx,
          dirY: b.vy,
        });
        b.hits.push(e.id);
        spawnSpark(world, b.x, b.y, 'hit', 2, 70);
        if (b.hits.length > b.pierce) {
          dead = true;
          break;
        }
      }
    }

    if (dead) list.splice(i, 1);
  }
}

export function spawnEnemyBullet(world, opts) {
  world.enemyBullets.push({
    x: opts.x,
    y: opts.y,
    vx: Math.cos(opts.angle) * opts.speed,
    vy: Math.sin(opts.angle) * opts.speed,
    radius: opts.radius ?? 7,
    damage: opts.damage,
    ttl: opts.ttl ?? 5,
    sprite: opts.sprite || 'proj.water',
    spin: 0,
  });
}

/** 敌方子弹：飞行 + 命中玩家。 */
export function stepEnemyBullets(world, dt) {
  const list = world.enemyBullets;
  const p = world.player;
  const arena = world.arena;
  for (let i = list.length - 1; i >= 0; i--) {
    const b = list[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.ttl -= dt;
    b.spin += dt * 6;

    let dead = b.ttl <= 0 || b.x < -30 || b.y < -30 || b.x > arena.w + 30 || b.y > arena.h + 30;

    if (!dead && p.alive) {
      const rr = b.radius + p.radius;
      if ((p.x - b.x) ** 2 + (p.y - b.y) ** 2 <= rr * rr) {
        damagePlayer(world, b.damage, b.x, b.y);
        spawnSpark(world, b.x, b.y, 'enemyBullet', 4, 90);
        dead = true;
      }
    }

    if (dead) list.splice(i, 1);
  }
}