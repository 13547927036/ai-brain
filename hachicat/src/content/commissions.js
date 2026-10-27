import { TOTAL_WAVES } from './waves.js';

/**
 * 委托数据。
 * 第一版只有「讨伐」；将来若要加除草 / 采集，在这里补条目并复用同一套
 * 接取 → 战斗 → 结算流程，不需要改战斗系统。
 */
export const COMMISSIONS = {
  hunt: {
    id: 'hunt',
    name: '讨伐委托',
    client: '小镇委托所',
    area: '茸茸草原外缘',
    brief: `完成 ${TOTAL_WAVES} 波讨伐，击退巨兽「隆隆」；沿途捡到的金币会一并结算。`,
    danger: '中',
    /** 接单即付的底薪，失败也有；胜利再加完成奖金。 */
    basePay: 30,
    victoryBonus: 80,
    ranks: [
      { rank: 'S', victory: true },
      { rank: 'A', minWave: 10 },
      { rank: 'B', minWave: 6 },
      { rank: 'C', minWave: 0 },
    ],
  },
};

export const DEFAULT_COMMISSION = 'hunt';

export function getCommission(id = DEFAULT_COMMISSION) {
  return COMMISSIONS[id] || COMMISSIONS[DEFAULT_COMMISSION];
}

/**
 * 委托报酬 = 底薪 + 沿途捡到的金币 + 完成奖金。
 * 当前没有独立的材料货币；`earned` 就是本局击杀掉落的金币，
 * 只用于结算展示，不写回钱包，避免影响商店经济。
 */
export function commissionPayout(commission, { moneyEarned = 0, victory = false } = {}) {
  const base = commission.basePay || 0;
  const bonus = victory ? commission.victoryBonus || 0 : 0;
  return { base, earned: moneyEarned, bonus, total: base + moneyEarned + bonus };
}

export function commissionRank(commission, { wave = 0, victory = false } = {}) {
  for (const band of commission.ranks) {
    if (band.victory && victory) return band.rank;
    if (!band.victory && wave >= band.minWave) return band.rank;
  }
  return 'C';
}