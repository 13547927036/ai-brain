import { PLAYER_KNOCKBACK_DECAY } from '../constants.js';

/** 两轴分量差小于这个值时保持上一朝向，避免斜着走时方向左右横跳。 */
export const FACE_DIR_DEADBAND = 0.15;

/**
 * 移动向量 → 四方向。纯展示用途，不参与瞄准、攻击或受击判定。
 * 屏幕坐标 y 轴向下，所以 my > 0 是「向下」（正面朝向镜头）。
 */
export function faceDirFor(mx, my, prev = 'down') {
  const ax = Math.abs(mx || 0);
  const ay = Math.abs(my || 0);
  if (ax - ay > FACE_DIR_DEADBAND) return (mx || 0) >= 0 ? 'right' : 'left';
  if (ay - ax > FACE_DIR_DEADBAND) return (my || 0) >= 0 ? 'down' : 'up';
  return prev;
}

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
  // 停手时保留最后朝向，避免静止帧来回翻
  if (p.moving) p.faceDir = faceDirFor(mx, my, p.faceDir);

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