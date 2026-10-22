import { STAT_META } from '../content/stats.js';

/**
 * 由 base + mods 计算最终属性。
 * mods: [{ stat, amount, mode: 'add' | 'mul' }]
 */
export function computeStats(base, mods = []) {
  const out = {};
  for (const key of Object.keys(STAT_META)) out[key] = base[key] ?? 0;
  for (const m of mods) {
    if (!(m.stat in out)) continue;
    if (m.mode === 'mul') out[m.stat] *= 1 + m.amount;
    else out[m.stat] += m.amount;
  }

  // 兜底范围，避免出现负数 / 溢出
  out.maxHp = Math.max(1, Math.round(out.maxHp));
  out.speed = clamp(out.speed, 90, 340);
  out.damageMul = Math.max(0.1, out.damageMul);
  out.attackSpeedMul = clamp(out.attackSpeedMul, 0.35, 4);
  out.rangeMul = clamp(out.rangeMul, 0.5, 2.5);
  out.pickup = clamp(out.pickup, 40, 320);
  out.armor = clamp(Math.round(out.armor), 0, 40);
  out.crit = clamp(out.crit, 0, 0.85);
  out.critMul = Math.max(1.2, out.critMul);
  out.luck = clamp(out.luck, 0, 40);
  out.regen = clamp(out.regen, 0, 12);
  return out;
}

export function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

/** 升级 / 买道具后统一重算，最大生命变化时同步补血。 */
export function recomputePlayerStats(player) {
  const before = player.stats;
  const next = computeStats(player.base, player.mods);
  const diff = next.maxHp - (before ? before.maxHp : next.maxHp);
  player.stats = next;
  if (diff > 0) player.hp = Math.min(next.maxHp, player.hp + diff);
  player.hp = Math.min(player.hp, next.maxHp);
  return next;
}

/** 伤害结算：先乘伤害倍率，再判定暴击。 */
export function rollDamage(baseDamage, stats, rng) {
  const isCrit = rng() < stats.crit;
  const dmg = baseDamage * stats.damageMul * (isCrit ? stats.critMul : 1);
  return { damage: dmg, crit: isCrit };
}