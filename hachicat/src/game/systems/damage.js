import { PLAYER_INVULN } from '../constants.js';
import { spawnSpark, spawnText, spawnShock, spawnRing } from './effects.js';
import { addPickup } from './pickups.js';

/**
 * 对敌人造成伤害：护甲减免 + 减伤 + 暴击飘字 + 击退 + 死亡结算。
 * opts.sourceKind: projectile | beam | melee | trap，用于「铁皮箱」的远程减伤。
 */
export function damageEnemy(world, enemy, amount, opts = {}) {
  if (enemy.dead) return 0;
  const armor = enemy.armor || 0;
  let dmg = Math.max(1, amount - armor);

  // 定向减伤：远距离的弹道 / 射线会被铁皮弹开，贴身与陷阱不受影响
  const ward = enemy.ward;
  if (ward && ward.kind === 'ranged' && isRangedSource(opts.sourceKind)) {
    const p = world.player;
    const dist = Math.hypot(enemy.x - p.x, enemy.y - p.y);
    if (dist > (ward.minDistance || 120)) {
      dmg = Math.max(1, dmg * (1 - (ward.reduction || 0)));
    }
  }

  enemy.hp -= dmg;
  enemy.flash = 0.12;
  world.stats.damageDealt += dmg;

  if (opts.text !== false) {
    const jitter = (Math.random() - 0.5) * 12;
    spawnText(world, enemy.x + jitter, enemy.y - enemy.radius - 4, `${Math.round(dmg)}`, opts.crit ? 'crit' : 'hit', {
      crit: opts.crit,
      size: opts.crit ? 19 : 14,
    });
  }

  if (opts.knockback) {
    const d = Math.hypot(opts.dirX || 0, opts.dirY || 0) || 1;
    const kb = opts.knockback * (1 - (enemy.knockbackResist || 0));
    enemy.kx += ((opts.dirX || 0) / d) * kb;
    enemy.ky += ((opts.dirY || 0) / d) * kb;
  }

  if (enemy.hp <= 0) killEnemy(world, enemy);
  return dmg;
}

function isRangedSource(kind) {
  return kind === 'projectile' || kind === 'beam';
}

/** opts.loot=false 用于自爆怪：仍计击杀，但不掉金币 / 经验。 */
export function killEnemy(world, enemy, opts = {}) {
  if (enemy.dead) return;
  enemy.dead = true;
  world.stats.kills += 1;
  if (world.stats.killedBy) {
    world.stats.killedBy[enemy.defId] = (world.stats.killedBy[enemy.defId] || 0) + 1;
  }

  if (world.rng && opts.loot !== false) {
    if (enemy.xp > 0) addPickup(world, 'xp', enemy.x, enemy.y, enemy.xp, world.rng);
    if (enemy.coin > 0) addPickup(world, 'coin', enemy.x + 6, enemy.y + 4, enemy.coin, world.rng);
  }

  if (enemy.isBoss) {
    spawnShock(world, enemy.x, enemy.y, 140, 'danger');
    spawnSpark(world, enemy.x, enemy.y, 'coin', 26, 320);
    spawnRing(world, enemy.x, enemy.y, 90, 'danger', 0.8, 5);
    world.shake = 1.4;
    world.bossDefeated = true;
  } else {
    spawnSpark(world, enemy.x, enemy.y, enemy.elite ? 'coin' : 'accent', enemy.elite ? 12 : 6, 150);
    world.shake = Math.min(1, world.shake + (enemy.elite ? 0.12 : 0.05));
  }
}

/** 玩家受伤：护甲减免、无敌帧、击退、屏震。sourceType 用于诊断「谁造成的伤害」。 */
export function damagePlayer(world, amount, sourceX = world.player.x, sourceY = world.player.y, sourceType = 'other') {
  const p = world.player;
  if (!p.alive || p.invuln > 0) return 0;

  const dmg = Math.max(1, Math.round(amount) - p.stats.armor);
  p.hp -= dmg;
  p.invuln = PLAYER_INVULN;
  p.flash = 0.18;
  world.shake = Math.min(1.2, world.shake + 0.6);

  if (world.stats) {
    world.stats.damageTaken = (world.stats.damageTaken || 0) + dmg;
    if (!world.stats.damageTakenBy) world.stats.damageTakenBy = {};
    world.stats.damageTakenBy[sourceType] = (world.stats.damageTakenBy[sourceType] || 0) + dmg;
  }

  spawnText(world, p.x, p.y - 28, `-${dmg}`, 'danger', { size: 18 });
  spawnSpark(world, p.x, p.y, 'danger', 8, 170);

  const dx = p.x - sourceX;
  const dy = p.y - sourceY;
  const d = Math.hypot(dx, dy) || 1;
  p.kx += (dx / d) * 190;
  p.ky += (dy / d) * 190;

  if (p.hp <= 0) {
    p.hp = 0;
    p.alive = false;
    world.playerDead = true;
    world.shake = 1.4;
    spawnShock(world, p.x, p.y, 90, 'danger');
  }
  return dmg;
}

export function healPlayer(world, amount) {
  const p = world.player;
  if (!p.alive) return 0;
  const before = p.hp;
  p.hp = Math.min(p.stats.maxHp, p.hp + amount);
  const healed = Math.round(p.hp - before);
  if (healed > 0) {
    spawnText(world, p.x, p.y - 30, `+${healed}`, 'heal', { size: 16 });
    spawnSpark(world, p.x, p.y, 'heal', 6, 120);
  }
  return healed;
}
