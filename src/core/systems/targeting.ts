import type { Enemy, World } from '../world.js';

/**
 * 自动开火的索敌：找射程内最近的敌人。
 * 用平方距离比较，避免每次 sqrt。
 */
export function nearestEnemy(w: World, x: number, y: number, maxRange: number): Enemy | null {
  let best: Enemy | null = null;
  let bestSq = maxRange * maxRange;
  for (let i = 0; i < w.enemies.length; i++) {
    const e = w.enemies.items[i] as Enemy;
    const dx = e.x - x;
    const dy = e.y - y;
    const sq = dx * dx + dy * dy;
    if (sq < bestSq) {
      bestSq = sq;
      best = e;
    }
  }
  return best;
}

/** 更新玩家朝向：有目标则朝向目标，否则保持上一次朝向 */
export function updateFacing(w: World, maxRange: number): Enemy | null {
  const p = w.player;
  const target = nearestEnemy(w, p.x, p.y, maxRange);
  if (target) {
    const dx = target.x - p.x;
    const dy = target.y - p.y;
    const len = Math.hypot(dx, dy) || 1;
    p.facingX = dx / len;
    p.facingY = dy / len;
  }
  return target;
}

/** 扇形判定：目标是否落在以 (ox,oy) 为顶点、朝向 (fx,fy)、半角 halfArc 的扇形内 */
export function inArc(
  ox: number, oy: number,
  fx: number, fy: number,
  tx: number, ty: number,
  halfArcCos: number,
): boolean {
  const dx = tx - ox;
  const dy = ty - oy;
  const len = Math.hypot(dx, dy) || 1;
  const dot = (dx / len) * fx + (dy / len) * fy;
  return dot >= halfArcCos;
}

/** 扇形半角（度）转成判定用的 cos 阈值 */
export function arcCosThreshold(arcDeg: number): number {
  return Math.cos((arcDeg / 2) * (Math.PI / 180));
}
