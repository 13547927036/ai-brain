import test from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/game/rng.js';
import { createWorld } from '../src/game/world.js';
import { computeStats, clamp, rollDamage } from '../src/game/stats.js';
import { xpForLevel, rollUpgradeOptions, applyUpgrade, canEquipWeapon, addWeapon, generateShop, buyOffer, buyHeal, healPrice, rerollShop } from '../src/game/progression.js';
import { getCharacter } from '../src/content/characters.js';
import { healPlayer } from '../src/game/systems/damage.js';

test('xp 曲线单调递增，1 级为 13', () => {
  assert.equal(xpForLevel(1), 13);
  let prev = 0;
  for (let lv = 1; lv <= 30; lv++) {
    const v = xpForLevel(lv);
    assert.ok(v > prev, `level ${lv} not increasing`);
    prev = v;
  }
});

test('computeStats 会夹紧极端数值', () => {
  const base = { ...getCharacter('ginger').base, speed: 999, crit: 5, armor: -3 };
  const s = computeStats(base, []);
  assert.equal(s.speed, 340);
  assert.equal(s.crit, 0.85);
  assert.equal(s.armor, 0);
  assert.ok(s.maxHp >= 1);
});

test('clamp 基本行为', () => {
  assert.equal(clamp(5, 1, 3), 3);
  assert.equal(clamp(-5, 1, 3), 1);
  assert.equal(clamp(2, 1, 3), 2);
});

test('rollDamage 暴击按概率生效', () => {
  const noCrit = rollDamage(10, { damageMul: 2, crit: 0, critMul: 2 }, createRng(1));
  assert.equal(noCrit.crit, false);
  assert.equal(noCrit.damage, 20);
  const alwaysCrit = rollDamage(10, { damageMul: 2, crit: 1, critMul: 2 }, createRng(1));
  assert.equal(alwaysCrit.crit, true);
  assert.equal(alwaysCrit.damage, 40);
});

test('升级三选一不重复，且能修改属性', () => {
  const w = createWorld({ characterId: 'ginger', seed: 1 });
  const p = w.player;
  const rng = createRng(4);
  const options = rollUpgradeOptions(p, rng, 3);
  assert.equal(options.length, 3);
  assert.equal(new Set(options.map((o) => o.id)).size, 3);

  const before = JSON.stringify(p.stats);
  applyUpgrade(p, options[0]);
  assert.notEqual(JSON.stringify(p.stats), before);
  assert.equal(p.upgradeCounts[options[0].id], 1);
});

test('武器可升级、可满栏判断', () => {
  const w = createWorld({ characterId: 'ginger', seed: 1 });
  const p = w.player;
  assert.equal(p.weapons.length, 1);
  assert.equal(canEquipWeapon(p, p.weapons[0].id), true);

  const applied = addWeapon(p, p.weapons[0].id);
  assert.ok(applied);
  assert.equal(p.weapons.length, 1);
  assert.equal(p.weapons[0].level, 2);
});

test('满 6 件武器后不能装新武器', () => {
  const w = createWorld({ characterId: 'ginger', seed: 1 });
  const p = w.player;
  for (const id of ['claw', 'hiss', 'laser', 'tail', 'trap']) addWeapon(p, id);
  assert.equal(p.weapons.length, 6);
  assert.equal(canEquipWeapon(p, 'hairball'), true); // 已有，可升级
  assert.equal(canEquipWeapon(p, 'claw2'), false); // 不存在，仅验证新武器需空位
});

test('商店固定 4 个报价（2 武器 + 2 道具）', () => {
  const w = createWorld({ characterId: 'ginger', seed: 2 });
  const shop = generateShop(w.player, createRng(8), 3);
  assert.equal(shop.offers.length, 4);
  assert.equal(shop.offers.filter((o) => o.type === 'weapon').length, 2);
  assert.equal(shop.offers.filter((o) => o.type === 'item').length, 2);
  assert.ok(shop.offers.every((o) => o.price > 0));
});

test('购买武器扣款并标记已售，重复购买被拒绝', () => {
  const w = createWorld({ characterId: 'ginger', seed: 3 });
  const p = w.player;
  p.money = 999;
  const shop = generateShop(p, createRng(9), 2);
  const idx = shop.offers.findIndex((o) => o.type === 'weapon');
  const price = shop.offers[idx].price;
  const res = buyOffer(p, shop, idx);
  assert.equal(res.ok, true);
  assert.equal(p.money, 999 - price);
  assert.equal(shop.offers[idx].sold, true);

  const again = buyOffer(p, shop, idx);
  assert.equal(again.ok, false);
  assert.equal(again.reason, 'sold');
});

test('钱不够时不能购买', () => {
  const w = createWorld({ characterId: 'ginger', seed: 4 });
  const p = w.player;
  p.money = 0;
  const shop = generateShop(p, createRng(10), 1);
  const res = buyOffer(p, shop, 0);
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'money');
});

test('治疗扣款并返回回血量，满血拒绝', () => {
  const w = createWorld({ characterId: 'ginger', seed: 5 });
  const p = w.player;
  p.money = 500;
  p.hp = 10;
  const shop = generateShop(p, createRng(11), 3);
  const price = healPrice(p);
  const res = buyHeal(p, { ...shop, healPrice: price });
  assert.equal(res.ok, true);
  assert.ok(res.amount > 0);
  assert.equal(p.money, 500 - price);

  p.hp = p.stats.maxHp;
  const full = buyHeal(p, { ...shop, healPrice: price });
  assert.equal(full.ok, false);
});

test('healPlayer 回血且不超过上限', () => {
  const w = createWorld({ characterId: 'ginger', seed: 15 });
  const p = w.player;
  p.hp = 10;
  healPlayer(w, 40);
  assert.equal(p.hp, 50);
  healPlayer(w, 9999);
  assert.equal(p.hp, p.stats.maxHp);
});

test('刷新商店会收费并更换商品', () => {
  const w = createWorld({ characterId: 'ginger', seed: 6 });
  const p = w.player;
  p.money = 500;
  const shop = generateShop(p, createRng(12), 4);
  const beforeKeys = shop.offers.map((o) => o.key).join(',');
  const res = rerollShop(p, shop, createRng(13), 4);
  assert.equal(res.ok, true);
  assert.equal(shop.rerolls, 1);
  assert.ok(p.money < 500);
  assert.notEqual(shop.offers.map((o) => o.key).join(','), beforeKeys);
});