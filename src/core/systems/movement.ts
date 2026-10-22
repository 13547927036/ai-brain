import { BASE_PLAYER } from '../../content/stats.js';
import { moveSpeed } from '../formulas.js';
import { clamp } from '../types.js';
import type { Enemy, World } from '../world.js';

export const PLAYER_RADIUS = 16;
/** 接触伤害的触发间隔，秒 */
export const TOUCH_DAMAGE_INTERVAL = 0.5;
/** 击退衰减速度（每秒衰减到原值的多少倍） */
export const KNOCKBACK_DECAY = 8;

export function playerSpeed(w: World): number {
  return moveSpeed(BASE_PLAYER.baseSpeed, w.player.stats.moveSpeed);
}

/** 玩家移动：输入向量长度 >1 时归一化，保证斜向不会更快 */
export function movePlayer(w: World, dt: number): void {
  const p = w.player;
  let ix = p.inputX;
  let iy = p.inputY;
  const len = Math.hypot(ix, iy);
  if (len > 1) {
    ix /= len;
    iy /= len;
  }
  const speed = playerSpeed(w);
  p.x = clamp(p.x + ix * speed * dt, PLAYER_RADIUS, w.arena.w - PLAYER_RADIUS);
  p.y = clamp(p.y + iy * speed * dt, PLAYER_RADIUS, w.arena.h - PLAYER_RADIUS);
}

/**
 * 敌人移动：直线追踪玩家；远程怪保持 keepDistance（太近则后退）。
 * 击退位移按指数衰减叠加。
 */
export function moveEnemies(w: World, dt: number, keepDistanceOf: (e: Enemy) => number): void {
  const p = w.player;
  const decay = Math.exp(-KNOCKBACK_DECAY * dt);

  for (let i = 0; i < w.enemies.length; i++) {
    const e = w.enemies.items[i] as Enemy;
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;

    const keep = keepDistanceOf(e);
    let dir = 1;
    if (keep > 0) {
      if (dist < keep - 20) dir = -1;
      else if (dist < keep + 20) dir = 0;
    }

    e.x += nx * e.speed * dir * dt + e.knockX * dt;
    e.y += ny * e.speed * dir * dt + e.knockY * dt;

    e.knockX *= decay;
    e.knockY *= decay;
    if (Math.abs(e.knockX) < 1) e.knockX = 0;
    if (Math.abs(e.knockY) < 1) e.knockY = 0;

    e.x = clamp(e.x, e.radius, w.arena.w - e.radius);
    e.y = clamp(e.y, e.radius, w.arena.h - e.radius);

    if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dt);
    if (e.touchTimer > 0) e.touchTimer = Math.max(0, e.touchTimer - dt);
  }
}

/** 给敌人施加击退（方向由伤害来源指向敌人） */
export function applyKnockback(e: Enemy, dirX: number, dirY: number, strength: number): void {
  e.knockX += dirX * strength;
  e.knockY += dirY * strength;
}
