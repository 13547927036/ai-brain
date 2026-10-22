import { PLAYER_KNOCKBACK_DECAY } from '../constants.js';

/** 玩家移动 + 击退 + 边界 + 无敌帧 + 回血。 */
export function stepPlayerMovement(world, dt) {
  const p = world.player;
  if (!p.alive) return;

  let mx = p.moveX || 0;
  let my = p.moveY || 0;
  let len = Math.hypot(mx, my);
  if (len > 1) {
    mx /= len;
    my /= len;
    len = 1;
  }
  p.moving = len > 0.12;

  const speed = p.stats.speed;
  p.vx = mx * speed;
  p.vy = my * speed;

  p.x += (p.vx + p.kx) * dt;
  p.y += (p.vy + p.ky) * dt;

  p.kx *= Math.exp(-PLAYER_KNOCKBACK_DECAY * dt);
  p.ky *= Math.exp(-PLAYER_KNOCKBACK_DECAY * dt);

  const arena = world.arena;
  p.x = Math.max(p.radius + 4, Math.min(arena.w - p.radius - 4, p.x));
  p.y = Math.max(p.radius + 4, Math.min(arena.h - p.radius - 4, p.y));

  if (p.invuln > 0) p.invuln = Math.max(0, p.invuln - dt);
  if (p.flash > 0) p.flash = Math.max(0, p.flash - dt);

  if (p.stats.regen > 0 && p.hp < p.stats.maxHp) {
    p.hp = Math.min(p.stats.maxHp, p.hp + p.stats.regen * dt);
  }
}