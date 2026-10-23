import { ENEMY_BY_ID, scaleEnemy } from '../../content/enemies.js';
import { damagePlayer, killEnemy } from './damage.js';
import { spawnEnemyBullet } from './projectiles.js';
import { spawnRing, spawnShock } from './effects.js';

/** 生成一只敌人（def 需要已经过 scaleEnemy 处理）。 */
export function spawnEnemy(world, def, x, y, rng, opts = {}) {
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
    elite: !!def.elite,
    ward: def.ward || null,
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
    // 预警 / 突进
    warnT: 0,
    warnMax: def.warnTime || 0,
    warnAngle: 0,
    warnKind: '',
    dashT: 0,
    dashTime: def.dashTime || 0.28,
    dashSpeed: def.dashSpeed || 510,
    dashAngle: 0,
    dashRange: def.dashRange || 290,
    dashCd: def.dashCd || 2.9,
    dashCdMax: def.dashCd || 2.9,
    // 自爆
    fuseT: 0,
    fuseMax: def.fuseTime || 1,
    fuseRange: def.fuseRange || 82,
    blastRadius: def.blastRadius || 82,
    blastDamage: def.blastDamage || 18,
    fuseCd: def.fuseCd || 2.2,
    fuseCdMax: def.fuseCd || 2.2,
    // 召唤
    summonCd: def.summonCd ? (rng ? rng.range(1.2, def.summonCd) : def.summonCd) : 0,
    summonCdMax: def.summonCd || 5.8,
    summonCount: def.summonCount || 2,
    summonMax: def.summonMax || 4,
    summonId: def.summonId || 'mite',
    summonedBy: opts.summonedBy || 0,
    // 支援
    healCd: def.healCd ? (rng ? rng.range(0.4, def.healCd) : def.healCd) : 0,
    healCdMax: def.healCd || 1.8,
    healRadius: def.healRadius || 150,
    healAmount: def.healAmount || 6,
    healMax: def.healMax || 3,
    healPulse: 0,
    // 首领
    timers: { radial: 2.4, special: 6.2, spiral: 0, spiralAngle: 0 },
    radialWarn: 0,
    radialWarnMax: 0,
    radialAngle: 0,
    radialCount: 0,
    radialSpeed: 0,
    nextSpecial: 'dash',
    phase: 1,
    telegraph: 0,
    telegraphMax: 0,
    telegraphAngle: 0,
    dashVx: 0,
    dashVy: 0,
  };
  world.enemies.push(enemy);
  if (enemy.isBoss) world.boss = enemy;
  if (world.stats) {
    if (!world.stats.spawnedBy) world.stats.spawnedBy = {};
    world.stats.spawnedBy[def.id] = (world.stats.spawnedBy[def.id] || 0) + 1;
  }
  return enemy;
}

export function stepEnemies(world, dt) {
  const p = world.player;
  const arena = world.arena;

  for (const e of world.enemies) {
    if (e.dead) continue;
    e.flash = Math.max(0, e.flash - dt);
    e.healPulse = Math.max(0, e.healPulse - dt);
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
      const v = keepDistanceVelocity(dx, dy, dist, speed, e.keepDistance);
      vx = v.vx;
      vy = v.vy;
      e.fireCd -= dt;
      if (e.fireCd <= 0 && dist < 460) {
        // 预判玩家的移动方向：波次越高，越会往身前打
        const travel = dist / (e.defSpeed || 205);
        const lead = Math.min(0.8, 0.25 + (e.spawnWave || 1) * 0.05);
        const tx = p.x + (p.vx || 0) * travel * lead;
        const ty = p.y + (p.vy || 0) * travel * lead;
        const angle = Math.atan2(ty - e.y, tx - e.x);
        const waveNo = e.spawnWave || 1;
        const shots = waveNo >= 10 ? 3 : waveNo >= 8 ? 2 : 1;
        for (let i = 0; i < shots; i++) {
          const spread = (i - (shots - 1) / 2) * 0.09;
          spawnEnemyBullet(world, {
            x: e.x + Math.cos(angle + spread) * (e.radius + 6),
            y: e.y + Math.sin(angle + spread) * (e.radius + 6),
            angle: angle + spread,
            speed: e.defSpeed || 205,
            damage: (e.defBulletDamage || e.damage) * 1.15,
            sprite: 'proj.water',
            source: e.defId,
          });
        }
        e.fireCd = e.fireCdMax * (shots > 1 ? 1.15 : 1);
      }
    } else if (e.ai === 'dash') {
      const v = dashVelocity(world, e, dt, dx, dy, dist, speed);
      vx = v.vx;
      vy = v.vy;
    } else if (e.ai === 'bomber') {
      const v = bomberVelocity(world, e, dt, dx, dy, dist, speed);
      vx = v.vx;
      vy = v.vy;
    } else if (e.ai === 'summoner') {
      const v = keepDistanceVelocity(dx, dy, dist, speed, e.keepDistance);
      vx = v.vx;
      vy = v.vy;
      stepSummoner(world, e, dt);
    } else if (e.ai === 'support') {
      const v = keepDistanceVelocity(dx, dy, dist, speed, e.keepDistance);
      vx = v.vx;
      vy = v.vy;
      stepSupport(world, e, dt);
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
      const hit = damagePlayer(world, e.damage, e.x, e.y, e.defId);
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

/** 远程 / 召唤 / 支援共用的保持距离走位：太远追、太近退、距离合适绕圈。 */
function keepDistanceVelocity(dx, dy, dist, speed, keep) {
  if (dist > keep + 30) return { vx: (dx / dist) * speed, vy: (dy / dist) * speed };
  if (dist < keep - 50) return { vx: -(dx / dist) * speed, vy: -(dy / dist) * speed };
  return { vx: (-dy / dist) * speed * 0.8, vy: (dx / dist) * speed * 0.8 };
}

/** 突进型：靠近 → 预警（锁定方向）→ 直线冲刺 → 冷却。 */
function dashVelocity(world, e, dt, dx, dy, dist, speed) {
  e.dashCd = Math.max(0, e.dashCd - dt);

  if (e.dashT > 0) {
    e.dashT -= dt;
    if (e.dashT <= 0) e.dashCd = e.dashCdMax;
    return { vx: Math.cos(e.dashAngle) * e.dashSpeed, vy: Math.sin(e.dashAngle) * e.dashSpeed };
  }

  if (e.warnT > 0) {
    e.warnT -= dt;
    if (e.warnT <= 0) {
      e.dashT = e.dashTime;
      spawnShock(world, e.x, e.y, e.radius + 18, 'danger');
      world.shake = Math.min(1, world.shake + 0.08);
    }
    return { vx: 0, vy: 0 };
  }

  if (e.dashCd <= 0 && dist < e.dashRange) {
    if (!e.warnMax) e.warnMax = 0.55;
    e.warnT = e.warnMax;
    e.warnAngle = Math.atan2(dy, dx);
    e.dashAngle = e.warnAngle;
    e.warnKind = 'dash';
    world.stats.dashWarns = (world.stats.dashWarns || 0) + 1;
    return { vx: 0, vy: 0 };
  }

  return { vx: (dx / dist) * speed * 0.85, vy: (dy / dist) * speed * 0.85 };
}

/** 自爆型：贴近后进入引信，引信结束爆炸；提前击杀则不爆炸。 */
function bomberVelocity(world, e, dt, dx, dy, dist, speed) {
  e.fuseCd = Math.max(0, e.fuseCd - dt);

  if (e.fuseT > 0) {
    e.fuseT -= dt;
    if (e.fuseT <= 0) {
      explode(world, e);
      return { vx: 0, vy: 0 };
    }
    // 引信期间缓慢贴近，给玩家反应时间
    return { vx: (dx / dist) * speed * 0.15, vy: (dy / dist) * speed * 0.15 };
  }

  if (e.fuseCd <= 0 && dist < e.fuseRange) {
    e.fuseT = e.fuseMax;
    e.warnKind = 'fuse';
    world.stats.bombFuses = (world.stats.bombFuses || 0) + 1;
    return { vx: 0, vy: 0 };
  }

  return { vx: (dx / dist) * speed, vy: (dy / dist) * speed };
}

function explode(world, e) {
  const p = world.player;
  const d = Math.hypot(p.x - e.x, p.y - e.y);
  spawnShock(world, e.x, e.y, e.blastRadius, 'danger');
  spawnRing(world, e.x, e.y, e.blastRadius, 'danger', 0.45, 4);
  world.shake = Math.max(world.shake, 0.55);
  if (p.alive && d < e.blastRadius + p.radius) {
    damagePlayer(world, e.blastDamage, e.x, e.y, e.defId);
  }
  // 自爆不给金币 / 经验，避免刷钱
  killEnemy(world, e, { loot: false });
}

/** 召唤型：同屏召唤物有数量上限，且不会突破本波同屏上限。 */
function stepSummoner(world, e, dt) {
  e.summonCd -= dt;
  if (e.summonCd > 0) return;

  const def = ENEMY_BY_ID[e.summonId];
  if (!def) {
    e.summonCd = 2;
    return;
  }
  let alive = 0;
  for (const other of world.enemies) {
    if (!other.dead && other.summonedBy === e.id) alive += 1;
  }
  const ownRoom = Math.max(0, e.summonMax - alive);
  const globalRoom = Math.max(0, (world.waveMaxAlive || 99) - world.enemies.length);
  const n = Math.min(e.summonCount, ownRoom, globalRoom);
  if (n <= 0) {
    e.summonCd = 1.2;
    return;
  }

  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (world.rng ? world.rng.range(0, Math.PI * 2) : 0);
    const x = Math.max(30, Math.min(world.arena.w - 30, e.x + Math.cos(a) * (e.radius + 26)));
    const y = Math.max(30, Math.min(world.arena.h - 30, e.y + Math.sin(a) * (e.radius + 26)));
    const summoned = scaleEnemy(def, world.waveIndex || 1, false, false);
    spawnEnemy(world, summoned, x, y, world.rng, { summonedBy: e.id });
  }
  world.stats.summons = (world.stats.summons || 0) + n;
  spawnRing(world, e.x, e.y, e.radius + 30, 'danger', 0.4, 3);
  e.summonCd = e.summonCdMax;
}

/** 支援型：周期性治疗附近伤势最重的敌人（含自己），有目标数上限。 */
function stepSupport(world, e, dt) {
  e.healCd -= dt;
  if (e.healCd > 0) return;

  const targets = [];
  for (const other of world.enemies) {
    if (other.dead || other.hp >= other.maxHp) continue;
    const d = Math.hypot(other.x - e.x, other.y - e.y);
    if (d > e.healRadius) continue;
    targets.push({ other, missing: other.maxHp - other.hp });
  }
  targets.sort((a, b) => b.missing - a.missing);
  const picked = targets.slice(0, e.healMax);
  const scale = 1 + 0.05 * Math.max(0, (e.spawnWave || 1) - 1);
  const amount = Math.max(1, Math.round(e.healAmount * scale));
  for (const { other } of picked) {
    other.hp = Math.min(other.maxHp, other.hp + amount);
  }
  if (picked.length) {
    e.healPulse = 0.45;
    world.stats.heals = (world.stats.heals || 0) + picked.length;
    spawnRing(world, e.x, e.y, e.healRadius, 'heal', 0.4, 2);
  }
  e.healCd = e.healCdMax;
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

  // 环形弹幕：先亮起预警环，再发射
  if (e.radialWarn > 0) {
    e.radialWarn -= dt;
    if (e.radialWarn <= 0) fireRadial(world, e);
  } else {
    e.timers.radial -= dt;
    if (e.timers.radial <= 0) {
      e.radialWarn = 0.5;
      e.radialWarnMax = 0.5;
      e.radialAngle = world.rng ? world.rng.angle() : Math.random() * Math.PI * 2;
      e.radialCount = 8 + phase * 4;
      e.radialSpeed = 130 + phase * 22;
      world.shake = Math.max(world.shake, 0.25);
    }
  }

  // 二阶段：冲刺 / 召唤
  if (phase >= 2) {
    e.timers.special -= dt;
    if (e.timers.special <= 0) {
      if (e.nextSpecial === 'dash') {
        e.telegraph = 0.72;
        e.telegraphMax = 0.72;
        e.telegraphAngle = Math.atan2(p.y - e.y, p.x - e.x);
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
          angle: e.timers.spiralAngle + i * Math.PI,
          speed: 190,
          damage: e.damage * 0.32,
          sprite: 'proj.ink',
          radius: 7,
          source: e.defId,
        });
      }
    }
  }

  if (e.telegraph > 0) {
    e.telegraph -= dt;
    if (e.telegraph <= 0) {
      e.dashT = 0.42;
      e.dashVx = Math.cos(e.telegraphAngle) * 560;
      e.dashVy = Math.sin(e.telegraphAngle) * 560;
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

function fireRadial(world, e) {
  const count = e.radialCount || 8;
  const speed = e.radialSpeed || 140;
  for (let i = 0; i < count; i++) {
    spawnEnemyBullet(world, {
      x: e.x,
      y: e.y,
      angle: e.radialAngle + (i * Math.PI * 2) / count,
      speed,
      damage: e.damage * 0.42,
      sprite: 'proj.ink',
      radius: 8,
      source: e.defId,
    });
  }
  spawnRing(world, e.x, e.y, e.radius + 10, 'danger', 0.3, 3);
  world.shake = Math.max(world.shake, 0.35);
  world.stats.bossBarrages = (world.stats.bossBarrages || 0) + 1;
  e.timers.radial = e.phase === 1 ? 3.2 : e.phase === 2 ? 2.8 : 2.2;
  e.radialWarn = 0;
}

function summonAdds(world, e) {
  const wave = world.waveIndex || 6;
  const room = Math.max(0, (world.waveMaxAlive || 16) - world.enemies.length);
  const n = Math.min(3, room);
  for (let i = 0; i < n; i++) {
    const a = (i / Math.max(1, n)) * Math.PI * 2 + 0.4;
    const x = Math.max(30, Math.min(world.arena.w - 30, e.x + Math.cos(a) * 80));
    const y = Math.max(30, Math.min(world.arena.h - 30, e.y + Math.sin(a) * 80));
    const def = scaleEnemy(ENEMY_BY_ID.drone, wave, false, false);
    spawnEnemy(world, def, x, y, world.rng);
  }
  world.stats.summons = (world.stats.summons || 0) + n;
  spawnRing(world, e.x, e.y, 100, 'danger', 0.45, 3);
}
