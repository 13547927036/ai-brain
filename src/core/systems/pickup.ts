import { BASE_PLAYER } from '../../content/stats.js';
import { HP_PER_LEVEL, xpForLevel } from '../formulas.js';
import type { Pickup, World } from '../world.js';
import { PLAYER_RADIUS } from './movement.js';

export const PICKUP_COLLECT_RADIUS = 18;
export const PICKUP_MAGNET_SPEED = 700;
/** 掉落物存活超过这个时间后自动吸附（spec 4.6：超时自动吸附） */
export const AUTO_MAGNET_AFTER = 5;

export function pickupRange(w: World): number {
  return BASE_PLAYER.pickupRange + w.player.stats.pickupRange;
}

/**
 * 材料拾取同时给材料与经验 —— 「材料与经验获取 +25%」这条角色规则
 * 才能用同一个倍率统一表达。
 * 材料保留小数累加，消费时再取整，避免小八的 +25% 被逐次取整吃掉。
 */
export function collectPickup(w: World, k: Pickup): void {
  const p = w.player;
  if (k.kind === 'heal') {
    p.hp = Math.min(p.maxHp, p.hp + k.value);
  } else {
    const gain = k.value * p.materialXpMul;
    p.materials += gain;
    addXp(w, gain);
  }
  w.events.push({ type: 'pickup', kind: k.kind });
}

export function addXp(w: World, amount: number): void {
  const p = w.player;
  p.xp += amount;
  let guard = 0;
  while (p.xp >= xpForLevel(p.level) && guard++ < 1000) {
    p.xp -= xpForLevel(p.level);
    p.level++;
    p.maxHp += HP_PER_LEVEL;
    p.hp += HP_PER_LEVEL;
    p.pendingLevelUps++;
    w.events.push({ type: 'levelUp', level: p.level });
  }
}

export function updatePickups(w: World, dt: number): void {
  const p = w.player;
  const range = pickupRange(w);

  for (let i = w.pickups.length - 1; i >= 0; i--) {
    const k = w.pickups.items[i] as Pickup;
    k.life -= dt;

    const dx = p.x - k.x;
    const dy = p.y - k.y;
    const dist = Math.hypot(dx, dy) || 1;

    if (dist <= range) k.magnet = true;
    if (k.life <= AUTO_MAGNET_AFTER) k.magnet = true;

    if (k.magnet && dist > 1) {
      const step = Math.min(dist, PICKUP_MAGNET_SPEED * dt);
      k.x += (dx / dist) * step;
      k.y += (dy / dist) * step;
    }

    if (dist <= PICKUP_COLLECT_RADIUS + PLAYER_RADIUS) {
      collectPickup(w, k);
      w.pickups.remove(i);
      continue;
    }

    if (k.life <= 0) {
      collectPickup(w, k);
      w.pickups.remove(i);
    }
  }
}
