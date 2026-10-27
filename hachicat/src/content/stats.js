/**
 * 属性元数据：决定 UI 显示名、格式化方式、图标。
 * 新增属性时只改这里 + game/stats.js 的计算即可。
 */
export const STAT_META = {
  maxHp: { label: '最大生命', kind: 'flat', icon: 'heart', decimals: 0 },
  speed: { label: '移动速度', kind: 'flat', icon: 'boot', decimals: 0 },
  damageMul: { label: '伤害', kind: 'percent', icon: 'hammer', decimals: 0 },
  attackSpeedMul: { label: '攻击速度', kind: 'percent', icon: 'bolt', decimals: 0 },
  rangeMul: { label: '攻击范围', kind: 'percent', icon: 'target', decimals: 0 },
  pickup: { label: '拾取范围', kind: 'flat', icon: 'magnet', decimals: 0 },
  armor: { label: '护甲', kind: 'flat', icon: 'shield', decimals: 0 },
  crit: { label: '暴击率', kind: 'points', icon: 'star', decimals: 0 },
  critMul: { label: '暴击伤害', kind: 'percent', icon: 'burst', decimals: 0 },
  luck: { label: '幸运', kind: 'flat', icon: 'clover', decimals: 0 },
  regen: { label: '生命回复', kind: 'flat', icon: 'leaf', decimals: 1 },
};

export const STAT_ORDER = Object.keys(STAT_META);

/** 把 { stat, amount } 格式化成 "+8% 伤害" / "+14 最大生命"。 */
export function formatMod(mod) {
  const meta = STAT_META[mod.stat];
  if (!meta) return '';
  const sign = mod.amount >= 0 ? '+' : '';
  let value;
  if (meta.kind === 'percent') value = `${sign}${Math.round(mod.amount * 100)}%`;
  else if (meta.kind === 'points') value = `${sign}${Math.round(mod.amount * 100)}%`;
  else value = `${sign}${Number(mod.amount.toFixed(meta.decimals))}`;
  return `${value} ${meta.label}`;
}

/** 同一条目可以包含多个属性：mods: [{stat, amount}] */
export function formatMods(mods) {
  return mods.map(formatMod).join(' · ');
}