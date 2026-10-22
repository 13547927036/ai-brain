import { MAIN_STAT_IDS, SUB_STAT_IDS } from '../content/stats.js';
import type { StatId } from '../content/types.js';
import { applyStat } from './stats.js';
import type { World } from './world.js';

export type UpgradeTier = 'common' | 'uncommon' | 'rare';

/** 档位权重（spec 4.3：普通 60% / 优良 30% / 稀有 10%） */
export const UPGRADE_WEIGHTS: ReadonlyArray<{ tier: UpgradeTier; weight: number }> = [
  { tier: 'common', weight: 0.6 },
  { tier: 'uncommon', weight: 0.3 },
  { tier: 'rare', weight: 0.1 },
];

/** 主属性增益量：+3 / +6 / +10 */
export const MAIN_STAT_AMOUNT: Record<UpgradeTier, number> = { common: 3, uncommon: 6, rare: 10 };

/** 稀有档可能改为「副属性大幅提升」 */
export const SUB_STAT_AMOUNT: Partial<Record<StatId, number>> = {
  pickupRange: 40,
  knockback: 5,
  luckDrop: 25,
};

/** 稀有档掷到副属性的概率 */
export const RARE_SUB_STAT_CHANCE = 0.5;

export interface UpgradeChoice {
  stat: StatId;
  amount: number;
  tier: UpgradeTier;
  isSub: boolean;
  label: string;
}

const STAT_LABEL: Record<string, string> = {
  maxHp: '最大生命', regen: '生命回复', meleeDamage: '近战伤害',
  rangedDamage: '远程伤害', attackSpeed: '攻速', critChance: '暴击率',
  armor: '护甲', dodge: '闪避', moveSpeed: '移动速度', luck: '幸运',
  pickupRange: '拾取范围', knockback: '击退强度', luckDrop: '幸运掉落',
};

export function rollTier(roll: number): UpgradeTier {
  let acc = 0;
  for (const { tier, weight } of UPGRADE_WEIGHTS) {
    acc += weight;
    if (roll < acc) return tier;
  }
  return 'common';
}

function pickFrom<T>(w: World, list: readonly T[]): T {
  const idx = Math.min(list.length - 1, Math.floor(w.rng.next() * list.length));
  return list[idx] as T;
}

/** 掷出单个升级选项；exclude 用于避免三选一里出现重复属性 */
export function rollUpgrade(w: World, exclude: StatId[] = []): UpgradeChoice {
  const tier = rollTier(w.rng.next());

  if (tier === 'rare' && w.rng.next() < RARE_SUB_STAT_CHANCE) {
    const subs = SUB_STAT_IDS.filter((s) => !exclude.includes(s));
    const stat = pickFrom(w, subs.length > 0 ? subs : SUB_STAT_IDS);
    const amount = SUB_STAT_AMOUNT[stat] ?? 10;
    return { stat, amount, tier, isSub: true, label: STAT_LABEL[stat] ?? stat };
  }

  const mains = MAIN_STAT_IDS.filter((s) => !exclude.includes(s));
  const stat = pickFrom(w, mains.length > 0 ? mains : MAIN_STAT_IDS);
  return {
    stat,
    amount: MAIN_STAT_AMOUNT[tier],
    tier,
    isSub: false,
    label: STAT_LABEL[stat] ?? stat,
  };
}

/** 升级三选一：三条互不重复 */
export function rollUpgradeChoices(w: World, count = 3): UpgradeChoice[] {
  const out: UpgradeChoice[] = [];
  const used: StatId[] = [];
  for (let i = 0; i < count; i++) {
    const c = rollUpgrade(w, used);
    used.push(c.stat);
    out.push(c);
  }
  return out;
}

export function applyUpgrade(w: World, choice: UpgradeChoice): void {
  applyStat(w, choice.stat, choice.amount);
}
