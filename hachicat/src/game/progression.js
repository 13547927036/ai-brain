import { UPGRADES, RARITY_WEIGHT } from '../content/upgrades.js';
import { WEAPONS, weaponPrice } from '../content/weapons.js';
import { ITEMS, ITEM_BY_ID } from '../content/items.js';
import { MAX_WEAPONS, MAX_WEAPON_LEVEL } from './constants.js';
import { recomputePlayerStats } from './stats.js';
import { weightedPick } from './rng.js';
import { getWeapon } from '../content/weapons.js';

/** 升到 level+1 所需经验。 */
export function xpForLevel(level) {
  return Math.round(6 + level * 6 + Math.pow(level, 1.4));
}

export function rollUpgradeOptions(player, rng, count = 3) {
  const pool = UPGRADES.filter((u) => (player.upgradeCounts[u.id] || 0) < u.maxStacks);
  const options = [];
  const used = new Set();
  while (options.length < count) {
    const entries = pool
      .filter((u) => !used.has(u.id))
      .map((u) => ({
        value: u,
        weight: RARITY_WEIGHT[u.rarity] * (1 + player.stats.luck * 0.035 * (u.rarity - 1)),
      }));
    if (!entries.length) break;
    const picked = weightedPick(entries, rng);
    if (!picked) break;
    used.add(picked.id);
    options.push(picked);
  }
  return options;
}

export function applyUpgrade(player, upgrade) {
  player.upgradeCounts[upgrade.id] = (player.upgradeCounts[upgrade.id] || 0) + 1;
  player.mods.push({ stat: upgrade.stat, amount: upgrade.amount, mode: upgrade.mode });
  recomputePlayerStats(player);
}

export function canEquipWeapon(player, weaponId) {
  const owned = player.weapons.find((w) => w.id === weaponId);
  if (owned) return owned.level < MAX_WEAPON_LEVEL;
  return player.weapons.length < MAX_WEAPONS;
}

/** 装备新武器；同名武器则升级。返回 {type, level} 或 null。 */
export function addWeapon(player, weaponId) {
  const def = getWeapon(weaponId);
  if (!def) return null;
  const owned = player.weapons.find((w) => w.id === weaponId);
  if (owned) {
    if (owned.level >= MAX_WEAPON_LEVEL) return null;
    owned.level += 1;
    return { type: 'upgrade', level: owned.level };
  }
  if (player.weapons.length >= MAX_WEAPONS) return null;
  player.weapons.push({ id: weaponId, level: 1, cd: 0, state: { spin: 0, hits: new Map() } });
  return { type: 'new', level: 1 };
}

/** 列出可合成的武器：同 id 且同等级成对，且未满级。 */
export function listSynthesis(player) {
  const groups = new Map();
  for (const w of player.weapons) {
    const key = `${w.id}@${w.level}`;
    const group = groups.get(key);
    if (group) group.count += 1;
    else groups.set(key, { id: w.id, level: w.level, count: 1 });
  }
  const list = [];
  for (const group of groups.values()) {
    if (group.count < 2 || group.level >= MAX_WEAPON_LEVEL) continue;
    list.push({ id: group.id, level: group.level, count: group.count, nextLevel: group.level + 1 });
  }
  return list;
}

/** 合成同 id 同等级的两件武器：消耗一件，保留的那件等级 +1。 */
export function synthesizeWeapon(player, weaponId) {
  const owned = player.weapons.filter((w) => w.id === weaponId);
  if (owned.length < 2) return { ok: false, reason: 'count' };
  const level = owned[0].level;
  if (owned.some((w) => w.level !== level)) return { ok: false, reason: 'level' };
  if (level >= MAX_WEAPON_LEVEL) return { ok: false, reason: 'max' };
  const kept = owned[0];
  const consumed = owned[1];
  kept.level = level + 1;
  player.weapons.splice(player.weapons.indexOf(consumed), 1);
  return { ok: true, id: weaponId, level: kept.level };
}
function rarityWeight(rarity, wave) {
  return RARITY_WEIGHT[rarity] * (1 + Math.max(0, wave - 1) * 0.05 * (rarity - 1));
}

/** 生成商店：2 个武器 + 2 个道具。 */
export function generateShop(player, rng, wave) {
  const offers = [];

  const weaponCandidates = Object.values(WEAPONS).filter((w) => canEquipWeapon(player, w.id));
  const pickedWeapons = new Set();
  for (let i = 0; i < 2; i++) {
    const entries = weaponCandidates
      .filter((w) => !pickedWeapons.has(w.id))
      .map((w) => ({ value: w, weight: rarityWeight(w.rarity, wave) }));
    if (!entries.length) break;
    const def = weightedPick(entries, rng);
    if (!def) break;
    pickedWeapons.add(def.id);
    const owned = player.weapons.find((w) => w.id === def.id);
    const level = owned ? owned.level + 1 : 1;
    offers.push({
      key: `w:${def.id}`,
      type: 'weapon',
      weaponId: def.id,
      level,
      price: Math.round(weaponPrice(def) * (1 + 0.3 * (level - 1))),
      sold: false,
    });
  }

  const itemCandidates = ITEMS.filter((it) => (player.itemCounts[it.id] || 0) < it.maxStacks);
  const pickedItems = new Set();
  for (let i = 0; i < 2; i++) {
    const entries = itemCandidates
      .filter((it) => !pickedItems.has(it.id))
      .map((it) => ({ value: it, weight: rarityWeight(it.rarity, wave) }));
    if (!entries.length) break;
    const item = weightedPick(entries, rng);
    if (!item) break;
    pickedItems.add(item.id);
    offers.push({
      key: `i:${item.id}`,
      type: 'item',
      itemId: item.id,
      price: item.price,
      sold: false,
    });
  }

  return { offers, rerolls: 0, rerollCost: 6, healPrice: healPrice(player), wave };
}

export function buyOffer(player, shop, index) {
  const offer = shop.offers[index];
  if (!offer) return { ok: false, reason: 'missing' };
  if (offer.sold) return { ok: false, reason: 'sold' };
  if (player.money < offer.price) return { ok: false, reason: 'money' };

  if (offer.type === 'weapon') {
    if (!canEquipWeapon(player, offer.weaponId)) return { ok: false, reason: 'slots' };
    const applied = addWeapon(player, offer.weaponId);
    if (!applied) return { ok: false, reason: 'slots' };
    player.money -= offer.price;
    offer.sold = true;
    return { ok: true, type: 'weapon', ...applied };
  }

  const item = ITEM_BY_ID[offer.itemId];
  if (!item) return { ok: false, reason: 'missing' };
  if ((player.itemCounts[item.id] || 0) >= item.maxStacks) return { ok: false, reason: 'maxed' };
  player.money -= offer.price;
  player.itemCounts[item.id] = (player.itemCounts[item.id] || 0) + 1;
  for (const m of item.mods) player.mods.push({ ...m });
  recomputePlayerStats(player);
  offer.sold = true;
  return { ok: true, type: 'item' };
}

export function rerollShop(player, shop, rng, wave) {
  const cost = shop.rerollCost + shop.rerolls * 3;
  if (player.money < cost) return { ok: false, reason: 'money', cost };
  player.money -= cost;
  shop.rerolls += 1;
  const fresh = generateShop(player, rng, wave);
  shop.offers = fresh.offers;
  shop.rerollCost = cost;
  shop.healPrice = healPrice(player);
  return { ok: true, cost };
}

export function healPrice(player) {
  return 14 + Math.round(player.stats.maxHp * 0.07);
}

export function buyHeal(player, shop) {
  const price = shop.healPrice ?? healPrice(player);
  if (player.money < price) return { ok: false, reason: 'money', price };
  if (player.hp >= player.stats.maxHp) return { ok: false, reason: 'full', price };
  player.money -= price;
  return { ok: true, price, amount: Math.round(player.stats.maxHp * 0.38) };
}// probe-write-test
