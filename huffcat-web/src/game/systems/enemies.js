import { ENEMY_BY_ID, scaleEnemy } from '../../content/enemies.js';
import { damagePlayer } from './damage.js';
import { spawnEnemyBullet } from './projectiles.js';
import { spawnRing, spawnShock } from './effects.js';

/** 生成一只敌人（def 需要已经过 scaleEnemy 处理）。 */
export function spawnEnemy(world, def, x, y, rng) {
  const enemy = {
    id: (world.nextId += 1),
    defId: def.id,
    name: def.name,
    x,
    y,
    vx: 0,
    vy: 0,
    kx: 0,
    ky: 0,
    radius: def.radius,
    hp: def.hp,
    maxHp: def.maxHp ?? def.hp,
    damage: def.damage,
    speed: def.speed,
    armor: def.armor || 0,
    knockbackResist: def.knockbackResist || 0,
    xp: def.xp,
    coin: def.coin,
    ai: def.ai,
    sprite: def.sprite,
    isBoss: def.ai === 'boss',
    flash: 0,
    slow: 0,
    slowT: 0,
    dead: false,
    t: 0,
    seedPhase: rng ? rng.range(0, 100) : Math.random() * 100,
    fireCd: def.fireCd ? (rng ? rng.range(0.8, def.fireCd) : def.fireCd) : 0,
    fireCdMax: def.fireCd || 2.4,
    keepDistance: def.keepDistance || 200,
    weaveAmp: def.weaveAmp || 40,
    weaveFreq: def.weaveFreq || 2.4,
    defSpeed: def.bulletSpeed || 205,
    defBulletDamage: def.bulletDamage || def.damage,
    timers: { radial: 2.4, special: 6.2, spiral: 0, spiralAngle: 0 },
    nextSpecial: 'dash',
    phase: 1,
    telegraph: 0,
    dashT: 0,
    dashVx: 0,
    dashVy: 0,
  };
  world.enemies.push(enemy);
  if (enemy.isBoss) world.boss = enemy;
  return enemy;
}

export function stepEnemies(world, dt) {
  const p = world.player;
  const arena = world.arena;

  for (const e of world.enemies) {
    if (e.dead) continue;
    e.flash = Math.max(0, e.flash - dt);
    if (e.slowT > 0) {
      e.slowT -= dt;
      if (e.slowT <= 0) e.slow = 0;
    }
    e.t += dt;

    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const dist = Math.hypot(dx, dy) || 0.001;
    const speed = e.speed * (1 - (e.slow || 0));
    let vx = 0;
    let vy = 0;

    if (e.ai === 'boss') {
      const v = bossVelocity(world, e, dt, dx, dy, dist);
      vx = v.vx;
      vy = v.vy;
    } else if (e.ai === 'weave') {
      const nx = dx / dist;
      const ny = dy / dist;
      const wobble = Math.sin(e.t * e.weaveFreq + e.seedPhase) * 0.65;
      vx = (nx - ny * wobble) * speed;
      vy = (ny + nx * wobble) * speed;
      const len = Math.hypot(vx, vy) || 1;
      vx = (vx / len) * speed;
      vy = (vy / len) * speed;
    } else if (e.ai === 'shooter') {
      const keep = e.keepDistance;
      if (dist > keep + 30) {
        vx = (dx / dist) * speed;
        vy = (dy / dist) * speed;
      } else if (dist < keep - 50) {
        vx = -(dx / dist) * speed;
        vy = -(dy / dist) * speed;
      } else {
        // 侧向绕圈
        vx = (-dy / dist) * speed * 0.8;
        vy = (dx / dist) * speed * 0.8;
      }
      e.fireCd -= dt;
      if (e.fireCd <= 0 && dist < 460) {
        e.fireCd = e.fireCdMax;
        const angle = Math.atan2(dy, dx);
        spawnEnemyBullet(world, {
          x: e.x + Math.cos(angle) * (e.radius + 6),
          y: e.y + Math.sin(angle) * (e.radius + 6),
          angle,
          speed: e.defSpeed || 205,
          damage: (e.defBulletDamage || e.damage) * 1.15,
          sprite: 'proj.water',
        });
      }
    } else {
      vx = (dx / dist) * speed;
      vy = (dy / dist) * speed;
    }

    e.x += (vx + e.kx) * dt;
    e.y += (vy + e.ky) * dt;
    e.kx *= Math.exp(-7 * dt);
    e.ky *= Math.exp(-7 * dt);

    e.x = Math.max(e.radius + 6, Math.min(arena.w - e.radius - 6, e.x));
    e.y = Math.max(e.radius + 6, Math.min(arena.h - e.radius - 6, e.y));

    // 接触伤害：命中后把敌人弹开一点，避免贴身粘死
    if (p.alive && dist < e.radius + p.radius) {
      const hit = damagePlayer(world, e.damage, e.x, e.y);
      if (hit > 0) {
        const push = e.isBoss ? 40 : 150;
        e.kx -= (dx / dist) * push;
        e.ky -= (dy / dist) * push;
      }
    }
  }

  separate(world);
  compact(world);
}

function compact(world) {
  const list = world.enemies;
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].dead) list.splice(i, 1);
  }
}

/** 轻量分离，避免敌人完全重叠成一团。 */
function separate(world) {
  const list = world.enemies;
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (a.dead) continue;
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j];
      if (b.dead) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const min = a.radius + b.radius;
      const d2 = dx * dx + dy * dy;
      if (d2 >= min * min || d2 < 0.0001) continue;
      const d = Math.sqrt(d2);
      const push = (min - d) * 0.42;
      const nx = dx / d;
      const ny = dy / d;
      if (!a.isBoss) {
        a.x -= nx * push;
        a.y -= ny * push;
      }
      if (!b.isBoss) {
        b.x += nx * push;
        b.y += ny * push;
      }
    }
  }
}

function bossVelocity(world, e, dt, dx, dy, dist) {
  const p = world.player;
  const ratio = e.hp / e.maxHp;
  const phase = ratio > 0.66 ? 1 : ratio > 0.34 ? 2 : 3;

  if (phase !== e.phase) {
    e.phase = phase;
    world.shake = Math.max(world.shake, 0.9);
    spawnRing(world, e.x, e.y, e.radius + 30, 'danger', 0.6, 5);
    spawnShock(world, e.x, e.y, e.radius + 60, 'danger');
  }

  // 环形弹幕
  e.timers.radial -= dt;
  if (e.timers.radial <= 0) {
    const count = 8 + phase * 4;
    const speed = 130 + phase * 22;
    const offset = world.rng ? world.rng.angle() : Math.random() * Math.PI * 2;
    for (let i = 0; i < count; i++) {
      spawnEnemyBullet(world, {
        x: e.x,
        y: e.y,
        angle: offset + (i * Math.PI * 2) / count,
        speed,
        damage: e.damage * 0.42,
        sprite: 'proj.ink',
        radius: 8,
      });
    }
    spawnRing(world, e.x, e.y, e.radius + 10, 'danger', 0.3, 3);
    world.shake = Math.max(world.shake, 0.35);
    e.timers.radial = phase === 1 ? 3.2 : phase === 2 ? 2.8 : 2.2;
  }

  // 二阶段：冲刺 / 召唤
  if (phase >= 2) {
    e.timers.special -= dt;
    if (e.timers.special <= 0) {
      if (e.nextSpecial === 'dash') {
        e.telegraph = 0.72;
        e.nextSpecial = 'summon';
      } else {
        summonAdds(world, e);
        e.nextSpecial = 'dash';
      }
      e.timers.special = phase === 2 ? 6.4 : 5.4;
    }
  }

  // 三阶段：螺旋弹
  if (phase === 3) {
    e.timers.spiral -= dt;
    if (e.timers.spiral <= 0) {
      e.timers.spiral = 0.17;
      e.timers.spiralAngle += 0.42;
      for (let i = 0; i < 2; i++) {
        spawnEnemyBullet(world, {
          x: e.x,
          y: e.y,
          angle: e.timers.spiralAngle + (i * Math.PI),
          speed: 190,
          damage: e.damage * 0.32,
          sprite: 'proj.ink',
          radius: 7,
        });
      }
    }
  }

  if (e.telegraph > 0) {
    e.telegraph -= dt;
    if (e.telegraph <= 0) {
      const angle = Math.atan2(p.y - e.y, p.x - e.x);
      e.dashT = 0.42;
      e.dashVx = Math.cos(angle) * 560;
      e.dashVy = Math.sin(angle) * 560;
      spawnShock(world, e.x, e.y, 50, 'danger');
    }
    return { vx: 0, vy: 0 };
  }

  if (e.dashT > 0) {
    e.dashT -= dt;
    return { vx: e.dashVx, vy: e.dashVy };
  }

  const speed = e.speed * (phase === 3 ? 1.4 : 1);
  if (dist > 90) return { vx: (dx / dist) * speed, vy: (dy / dist) * speed };
  return { vx: 0, vy: 0 };
}

function summonAdds(world, e) {
  const wave = world.waveIndex || 6;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.4;
    const x = Math.max(30, Math.min(world.arena.w - 30, e.x + Math.cos(a) * 80));
    const y = Math.max(30, Math.min(world.arena.h - 30, e.y + Math.sin(a) * 80));
    const def = scaleEnemy(ENEMY_BY_ID.drone, wave, false);
    spawnEnemy(world, def, x, y, world.rng);
  }
  spawnRing(world, e.x, e.y, 100, 'danger', 0.45, 3);
}