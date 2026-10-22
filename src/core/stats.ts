import type { StatId } from '../content/types.js';
import type { World } from './world.js';

/** 道具价格分档（spec 4.3：道具按强度分 8 / 14 / 20 / 25 四档） */
export const ITEM_TIER_PRICE: Record<1 | 2 | 3 | 4, number> = { 1: 8, 2: 14, 3: 20, 4: 25 };

/**
 * 应用一条属性增益。
 *
 * 1. 先过角色的属性获取倍率（吉伊卡哇幸运 ×1.5 只有这样才成立 ——
 *    基础幸运是 0，做成一次性加成永远是 0）。
 * 2. maxHp 特殊处理：同时提升上限与当前生命，
 *    否则玩家会「升级反而血量占比变差」。
 */
export function applyStat(w: World, stat: StatId, amount: number): void {
  const p = w.player;
  const mul = p.statMul[stat] ?? 1;
  const gained = amount * mul;

  p.stats[stat] += gained;

  if (stat === 'maxHp') {
    p.maxHp += gained;
    if (gained > 0) p.hp = Math.min(p.maxHp, p.hp + gained);
    else p.hp = Math.min(p.hp, p.maxHp);
  }
}
