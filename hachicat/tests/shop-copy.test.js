import test from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/game/rng.js';
import { createWorld } from '../src/game/world.js';
import {
  generateShop,
  buyOffer,
  addWeaponCopy,
  hasFreeWeaponSlot,
  canEquipWeapon,
  weaponOfferPrice,
  weaponCopyPrice,
  listSynthesis,
  synthesizeWeapon,
} from '../src/game/progression.js';
import { WEAPON_LIST, weaponLevelStats } from '../src/content/weapons.js';
import { MAX_WEAPONS, MAX_WEAPON_LEVEL } from '../src/game/constants.js';

const ALL_IDS = WEAPON_LIST.map((w) => w.id);

/** 造一件裸武器实例，避免测试依赖 createWorld 的初始装备。 */
function makeWeapon(id, level) {
  return { id, level, cd: 0, state: { spin: 0, hits: new Map() } };
}

/** 造一个可控玩家：清空武器、装满钱。 */
function makePlayer(money = 500) {
  const w = createWorld({ characterId: 'ginger', seed: 1 });
  const p = w.player;
  p.weapons.length = 0;
  p.money = money;
  return p;
}

test('副本价恒低于同级直购升级价的一半', () => {
  for (const id of ALL_IDS) {
    for (let level = 1; level < MAX_WEAPON_LEVEL; level++) {
      const direct = weaponOfferPrice(id, level + 1);
      const copy = weaponCopyPrice(id, level);
      assert.ok(copy > 0, `${id} L${level} 副本价应为正`);
      assert.ok(copy * 2 < direct, `${id} L${level} 副本价 ${copy} 未低于直购价 ${direct} 的一半`);
    }
  }
});

test('直接复制：占一个空槽、等级与原武器相同、不动原武器', () => {
  const p = makePlayer();
  const base = makeWeapon('hairball', 2);
  p.weapons.push(base);
  const res = addWeaponCopy(p, 'hairball', 2);
  assert.equal(res.type, 'copy');
  assert.equal(res.id, 'hairball');
  assert.equal(res.level, 2);
  assert.equal(p.weapons.length, 2);
  assert.equal(base.level, 2, '原武器等级不应被改动');
  assert.equal(p.weapons[1].id, 'hairball');
  assert.equal(p.weapons[1].level, 2);
  assert.ok(p.weapons[1].state.hits instanceof Map, '副本应带独立的命中记录');
});

test('商店买副本：扣金币、标记已售、重复购买被拒绝', () => {
  const p = makePlayer(200);
  p.weapons.push(makeWeapon('hairball', 3));
  const price = weaponCopyPrice('hairball', 3);
  const shop = {
    offers: [{ key: 'c:hairball:0', type: 'weapon', copy: true, weaponId: 'hairball', level: 3, price, sold: false }],
    rerolls: 0,
    rerollCost: 6,
  };
  const before = p.money;
  const res = buyOffer(p, shop, 0);
  assert.equal(res.ok, true);
  assert.equal(res.type, 'copy');
  assert.equal(p.money, before - price, '金币应按副本价扣除');
  assert.equal(shop.offers[0].sold, true);
  assert.equal(p.weapons.length, 2);

  const again = buyOffer(p, shop, 0);
  assert.equal(again.ok, false);
  assert.equal(again.reason, 'sold');
  assert.equal(p.money, before - price, '重复购买不应再扣款');
});

test('满 6 件武器时副本不可购买且不扣金币', () => {
  const p = makePlayer(500);
  for (const id of ALL_IDS) p.weapons.push(makeWeapon(id, 1));
  assert.equal(p.weapons.length, MAX_WEAPONS);
  assert.equal(hasFreeWeaponSlot(p), false);
  assert.equal(addWeaponCopy(p, 'hairball', 1), null);

  const shop = {
    offers: [{ key: 'c:hairball:0', type: 'weapon', copy: true, weaponId: 'hairball', level: 1, price: weaponCopyPrice('hairball', 1), sold: false }],
    rerolls: 0,
    rerollCost: 6,
  };
  const res = buyOffer(p, shop, 0);
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'slots');
  assert.equal(p.money, 500, '购买失败不应扣款');
  assert.equal(p.weapons.length, MAX_WEAPONS);
  assert.equal(shop.offers[0].sold, false);
});

test('闭环：商店刷出副本 → 购买 → 合成升一级，只留一件并释放槽位', () => {
  const p = makePlayer(300);
  p.weapons.push(makeWeapon('hairball', 2));

  // 真实流程：反复开店，直到刷出毛球副本
  let picked = null;
  for (let seed = 1; seed <= 300 && !picked; seed++) {
    const shop = generateShop(p, createRng(seed), 3);
    const idx = shop.offers.findIndex((o) => o.copy && o.weaponId === 'hairball');
    if (idx >= 0) picked = { shop, idx };
  }
  assert.ok(picked, '300 个种子里都没有刷出毛球副本');

  const { shop, idx } = picked;
  const offer = shop.offers[idx];
  assert.equal(offer.type, 'weapon');
  assert.equal(offer.level, 2, '副本等级应与已有武器相同');
  assert.equal(offer.price, weaponCopyPrice('hairball', 2));
  assert.ok(offer.price * 2 < weaponOfferPrice('hairball', 3));

  const moneyBefore = p.money;
  const bought = buyOffer(p, shop, idx);
  assert.equal(bought.ok, true);
  assert.equal(bought.type, 'copy');
  assert.equal(p.money, moneyBefore - offer.price);
  assert.equal(p.weapons.filter((x) => x.id === 'hairball').length, 2);

  const list = listSynthesis(p);
  assert.equal(list.length, 1);
  assert.equal(list[0].id, 'hairball');
  assert.equal(list[0].level, 2);
  assert.equal(list[0].nextLevel, 3);

  const lv2 = weaponLevelStats('hairball', 2);
  const lv3 = weaponLevelStats('hairball', 3);
  assert.notDeepEqual(lv2, lv3, '3 级数值应与 2 级不同');

  const synth = synthesizeWeapon(p, 'hairball');
  assert.equal(synth.ok, true);
  assert.equal(synth.level, 3);
  assert.equal(p.weapons.length, 1, '合成后应释放一个槽位');
  assert.equal(p.weapons[0].id, 'hairball');
  assert.equal(p.weapons[0].level, 3);
  assert.deepEqual(weaponLevelStats(p.weapons[0].id, p.weapons[0].level), lv3, '合成后应继承 3 级数值');
  assert.ok(p.weapons[0].state.hits instanceof Map);
  assert.equal(listSynthesis(p).length, 0, '合成后不应再有可合成项');
  assert.equal(p.money, moneyBefore - offer.price, '合成本身不收费');
});

test('满槽时直购升级路线依然可用（副本无法替代）', () => {
  const p = makePlayer(500);
  for (const id of ALL_IDS) p.weapons.push(makeWeapon(id, 1));

  const shop = generateShop(p, createRng(5), 3);
  assert.equal(shop.offers.filter((o) => o.type === 'weapon').length, 2);
  assert.equal(shop.offers.some((o) => o.copy), false, '无空槽时不应刷副本');

  const wOffer = shop.offers.find((o) => o.type === 'weapon' && !o.copy);
  assert.ok(wOffer, '满槽时仍应有直购商品');
  assert.ok(canEquipWeapon(p, wOffer.weaponId), '已拥有武器应可继续升级');
  const target = p.weapons.find((x) => x.id === wOffer.weaponId);

  const res = buyOffer(p, shop, shop.offers.indexOf(wOffer));
  assert.equal(res.ok, true);
  assert.equal(res.type, 'upgrade');
  assert.equal(target.level, 2, '直购应稳定升到下一级');
  assert.equal(p.weapons.length, MAX_WEAPONS, '直购升级不额外占槽');
});
test('副本位不改变商品总数，且所有 key 唯一', () => {
  const p = makePlayer(9999);
  p.weapons.push(makeWeapon('hairball', 1));
  p.weapons.push(makeWeapon('claw', 2));
  for (let seed = 1; seed <= 60; seed++) {
    const shop = generateShop(p, createRng(seed), 3);
    assert.equal(shop.offers.length, 4, `种子 ${seed} 商品数应为 4`);
    assert.equal(shop.offers.filter((o) => o.type === 'weapon').length, 2, `种子 ${seed} 武器位应为 2`);
    assert.equal(shop.offers.filter((o) => o.type === 'item').length, 2, `种子 ${seed} 道具位应为 2`);
    assert.ok(shop.offers.every((o) => o.price > 0), `种子 ${seed} 价格应为正`);
    const keys = shop.offers.map((o) => o.key);
    assert.equal(new Set(keys).size, keys.length, `种子 ${seed} 出现重复 key: ${keys.join(',')}`);
    for (const o of shop.offers) {
      if (!o.copy) continue;
      assert.equal(o.level, p.weapons.find((x) => x.id === o.weaponId).level, '副本等级应等于原武器等级');
      assert.ok(o.level < MAX_WEAPON_LEVEL, '满级武器不应刷副本');
    }
  }
});

test('副本出现概率处在合理区间：既不会消失也不会泛滥', () => {
  const p = makePlayer(99999);
  p.weapons.push(makeWeapon('hairball', 1));
  const runs = 400;
  let withCopy = 0;
  for (let seed = 1; seed <= runs; seed++) {
    const shop = generateShop(p, createRng(seed), 3);
    if (shop.offers.some((o) => o.copy)) withCopy++;
  }
  const rate = withCopy / runs;
  assert.ok(rate > 0.2, `副本出现率过低：${rate}`);
  assert.ok(rate < 0.75, `副本出现率过高：${rate}`);
});

test('满级武器不参与合成，也不会成为副本候选', () => {
  const p = makePlayer(9999);
  p.weapons.push(makeWeapon('hairball', MAX_WEAPON_LEVEL));
  p.weapons.push(makeWeapon('hairball', MAX_WEAPON_LEVEL));
  assert.equal(listSynthesis(p).length, 0, '满级同名武器不应可合成');
  const synth = synthesizeWeapon(p, 'hairball');
  assert.equal(synth.ok, false);
  assert.equal(synth.reason, 'max');
  const shop = generateShop(p, createRng(11), 3);
  assert.equal(shop.offers.some((o) => o.copy), false, '满级武器不应刷副本');
});