/** 找最近的敌人（可限定范围）。 */
export function findNearestEnemy(world, x, y, maxRange = Infinity) {
  let best = null;
  let bestD2 = maxRange * maxRange;
  for (const e of world.enemies) {
    if (e.dead) continue;
    const dx = e.x - x;
    const dy = e.y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 <= bestD2) {
      bestD2 = d2;
      best = e;
    }
  }
  return best;
}

/** 带朝向约束的最近敌人（近战/锥形用）。 */
export function findNearestInArc(world, x, y, angle, range, arc) {
  let best = null;
  let bestD = Infinity;
  for (const e of world.enemies) {
    if (e.dead) continue;
    const dx = e.x - x;
    const dy = e.y - y;
    const d = Math.hypot(dx, dy);
    if (d > range + e.radius) continue;
    if (Math.abs(angleDiff(Math.atan2(dy, dx), angle)) > arc / 2) continue;
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** 点到线段的距离。 */
export function pointSegmentDistance(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}

/** 选取离玩家最近的 n 个敌人（多目标武器用）。 */
export function nearestEnemies(world, x, y, n, maxRange = Infinity) {
  const arr = [];
  for (const e of world.enemies) {
    if (e.dead) continue;
    const d2 = (e.x - x) ** 2 + (e.y - y) ** 2;
    if (d2 <= maxRange * maxRange) arr.push({ e, d2 });
  }
  arr.sort((a, b) => a.d2 - b.d2);
  return arr.slice(0, n).map((it) => it.e);
}