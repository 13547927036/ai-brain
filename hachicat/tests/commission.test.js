import test from 'node:test';
import assert from 'node:assert/strict';
import { getCommission, commissionPayout, commissionRank } from '../src/content/commissions.js';

test('委托报酬 = 底薪 + 材料 + 胜利奖金', () => {
  const commission = getCommission('hunt');

  const failed = commissionPayout(commission, { moneyEarned: 120, victory: false });
  assert.equal(failed.base, commission.basePay);
  assert.equal(failed.bonus, 0);
  assert.equal(failed.total, commission.basePay + 120);

  const won = commissionPayout(commission, { moneyEarned: 120, victory: true });
  assert.equal(won.bonus, commission.victoryBonus);
  assert.equal(won.total, commission.basePay + 120 + commission.victoryBonus);
});

test('委托评价按胜利与波次划分', () => {
  const commission = getCommission();
  assert.equal(commissionRank(commission, { victory: true, wave: 12 }), 'S');
  assert.equal(commissionRank(commission, { victory: false, wave: 11 }), 'A');
  assert.equal(commissionRank(commission, { victory: false, wave: 6 }), 'B');
  assert.equal(commissionRank(commission, { victory: false, wave: 1 }), 'C');
});

test('未知委托回退到讨伐', () => {
  assert.equal(getCommission('missing').id, 'hunt');
});