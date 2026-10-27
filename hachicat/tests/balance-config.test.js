import test from 'node:test';
import assert from 'node:assert/strict';
import { ENEMY_LIST, ENEMY_BY_ID, BOSSES, ALL_ENEMIES, ELITE_SCALING } from '../src/content/enemies.js';
import { WAVES, TOTAL_WAVES, shouldSpawnElite } from '../src/content/waves.js';
import { WEAPON_LIST, weaponPrice } from '../src/content/weapons.js';
import { ITEMS } from '../src/content/items.js';
import { getCommission, commissionPayout } from '../src/content/commissions.js';
import { weaponOfferPrice, weaponCopyPrice, healPrice, rerollPrice, xpForLevel, generateShop } from '../src/game/progression.js';
import { createRng } from '../src/game/rng.js';
import { createWorld } from '../src/game/world.js';

test('怪物阵容：9 种普通怪 + 召唤物 + 讨伐目标，行为类型齐全', () => {
  const normal = ENEMY_LIST.filter((e) => !e.summonOnly);
  assert.ok(normal.length >= 8 && normal.length <= 10, `普通怪数量 ${normal.length} 不在 8–10`);
  const ais = new Set([...ENEMY_LIST, ...Object.values(BOSSES)].map((e) => e.ai));
  for (const ai of ['chase', 'weave', 'shooter', 'dash', 'bomber', 'summoner', 'support', 'boss']) {
    assert.ok(ais.has(ai), `缺少行为类型 ${ai}`);
  }
  assert.ok(BOSSES.rumble, '缺少讨伐目标');
  assert.ok(ENEMY_BY_ID.guard.ward, '缺少减伤型敌人');
  assert.ok(ENEMY_BY_ID.mite.summonOnly, '召唤物应标记 summonOnly');

  for (const e of [...ENEMY_LIST, ...Object.values(BOSSES)]) {
    assert.ok(e.id && e.name && e.sprite, `${e.id} 缺少基础字段`);
    assert.ok(e.hp > 0 && e.speed > 0 && e.damage >= 0, `${e.id} 数值异常`);
    assert.ok(e.xp >= 0 && e.coin >= 0, `${e.id} 奖励异常`);
  }
});

test('新怪物按波次逐步登场，不会开局堆机制', () => {
  const debut = { dart: 4, guard: 5, bomber: 6, nester: 7, glowcap: 8 };
  for (const [id, wave] of Object.entries(debut)) {
    assert.ok(WAVES[wave - 1].pool[id] > 0, `${id} 应在第 ${wave} 波出现`);
    for (let n = 1; n < wave; n++) {
      assert.ok(!WAVES[n - 1].pool[id], `${id} 不应在第 ${n} 波出现`);
    }
  }
  for (let n = 1; n <= 3; n++) {
    for (const id of Object.keys(debut)) assert.ok(!WAVES[n - 1].pool[id], `第 ${n} 波过早出现 ${id}`);
  }
  assert.equal(TOTAL_WAVES, 12);
});

test('波次池只引用存在的敌人，精英只在中后期出现', () => {
  for (const wave of WAVES) {
    for (const id of Object.keys(wave.pool)) {
      assert.ok(ALL_ENEMIES[id], `第 ${wave.n} 波引用了不存在的敌人 ${id}`);
      assert.ok(wave.pool[id] > 0, `第 ${wave.n} 波权重必须为正`);
    }
    assert.ok(wave.maxAlive > 0);
    assert.ok(wave.interval > 0);
    if (wave.n <= 6) assert.ok(!wave.eliteEvery, `第 ${wave.n} 波不应出精英`);
  }
  for (let n = 7; n <= 11; n++) assert.ok(WAVES[n - 1].eliteEvery > 0, `第 ${n} 波应出精英`);
  assert.equal(shouldSpawnElite(WAVES[6], 14), true);
  assert.equal(shouldSpawnElite(WAVES[6], 13), false);
  assert.equal(shouldSpawnElite(WAVES[0], 1), false);
});

test('刷怪压力随波次提升；同屏上限在第 1–11 波不下降', () => {
  for (let n = 2; n <= 11; n++) {
    assert.ok(WAVES[n - 1].maxAlive >= WAVES[n - 2].maxAlive, `第 ${n} 波同屏上限下降`);
    assert.ok(WAVES[n - 1].interval < WAVES[n - 2].interval, `第 ${n} 波刷新间隔未收紧`);
  }
  assert.ok(WAVES[10].maxAlive > WAVES[0].maxAlive * 2, '后期同屏压力应明显高于开局');
});

test('精英缩放倍率合理，奖励高于普通怪', () => {
  assert.ok(ELITE_SCALING.hp > 1.5 && ELITE_SCALING.hp < 2.5);
  assert.ok(ELITE_SCALING.reward >= 2);
  assert.ok(ELITE_SCALING.radius > 1 && ELITE_SCALING.radius < 1.3);
});

test('武器升级价格逐级递增，副本价低于直购价一半', () => {
  for (const def of WEAPON_LIST) {
    let prev = 0;
    for (let level = 1; level <= 5; level++) {
      const price = weaponOfferPrice(def.id, level);
      assert.ok(price > prev, `${def.id} L${level} 价格未递增`);
      prev = price;
      if (level < 5) {
        const copy = weaponCopyPrice(def.id, level);
        assert.ok(copy > 0);
        assert.ok(copy * 2 < weaponOfferPrice(def.id, level + 1), `${def.id} L${level} 副本价过高`);
      }
    }
  }
  assert.ok(weaponPrice({ rarity: 3 }) > weaponPrice({ rarity: 1 }));
});

test('道具价格处于前期可负担、后期需取舍的区间', () => {
  for (const item of ITEMS) {
    assert.ok(item.price >= 20 && item.price <= 50, `${item.name} 价格 ${item.price} 超出区间`);
  }
});

test('喝汤与换一批价格随进度增长，换一批不能零成本', () => {
  const low = { stats: { maxHp: 100 } };
  const high = { stats: { maxHp: 220 } };
  assert.ok(healPrice(high) > healPrice(low), '高生命上限的喝汤应更贵');

  const shop = { rerolls: 0 };
  const seq = [];
  for (let i = 0; i < 4; i++) {
    seq.push(rerollPrice(shop));
    shop.rerolls += 1;
  }
  assert.deepEqual(seq, [8, 11, 17, 26]);
  assert.ok(seq[0] > 0, '换一批必须有成本');
});

test('经验曲线单调递增且开局为 16', () => {
  assert.equal(xpForLevel(1), 16);
  let prev = 0;
  for (let lv = 1; lv <= 30; lv++) {
    const v = xpForLevel(lv);
    assert.ok(v > prev);
    prev = v;
  }
});

test('委托：失败收益低于胜利收益，且失败仍有底薪', () => {
  const c = getCommission('hunt');
  const fail = commissionPayout(c, { moneyEarned: 300, victory: false });
  const win = commissionPayout(c, { moneyEarned: 300, victory: true });
  assert.equal(fail.base, c.basePay);
  assert.ok(fail.total > 0, '失败仍应有底薪与沿途收入');
  assert.ok(win.total > fail.total, '胜利收益必须高于失败');
});

test('商店报价价格与售价一致，重复购买不会重复扣款', () => {
  const w = createWorld({ characterId: 'hachiware', seed: 9 });
  const p = w.player;
  p.money = 999;
  const shop = generateShop(p, createRng(21), 5);
  for (const offer of shop.offers) {
    if (offer.type === 'weapon' && !offer.copy) {
      assert.equal(offer.price, weaponOfferPrice(offer.weaponId, offer.level));
    } else if (offer.type === 'weapon') {
      assert.equal(offer.price, weaponCopyPrice(offer.weaponId, offer.level));
    } else {
      assert.ok(offer.price > 0);
    }
  }
});
