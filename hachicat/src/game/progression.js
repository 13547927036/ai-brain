import { UPGRADES, RARITY_WEIGHT } from '../content/upgrades.js';
import {
  WEAPONS,
  weaponPrice,
  WEAPON_COPY_CHANCE,
  WEAPON_COPY_PRICE_RATIO,
  WEAPON_LEVEL_PRICE_MUL,
} from '../content/weapons.js';
import { ITEMS, ITEM_BY_ID } from '../content/items.js';
import { MAX_WEAPONS, MAX_WEAPON_LEVEL } from './constants.js';
import { recomputePlayerStats } from './stats.js';
import { weightedPick } from './rng.js';
import { getWeapon } from '../content/weapons.js';

/** 刷新商店的基础价格。 */
export const REROLL_BASE_COST = 8;

/** 升到 level+1 所需经验。比旧曲线略慢，用来抵消新增怪物带来的经验增量。 */
export function xpForLevel(level) {
  return Math.round(8 + level * 7 + Math.pow(level, 1.45));
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

/** 是否还有空武器槽（首次购买与副本都受此限制）。 */
export function hasFreeWeaponSlot(player) {
  return player.weapons.length < MAX_WEAPONS;
}

/** 造一件武器实例。数值一律由 id + level 派生，不在这里固化。 */
function makeWeapon(weaponId, level = 1) {
  return {
    id: weaponId,
    level: Math.max(1, Math.min(MAX_WEAPON_LEVEL, level)),
    cd: 0,
    state: { spin: 0, hits: new Map() },
  };
}

/** 直购价：拿下 offerLevel 级的这件武器要多少钱（等级越高溢价越陡）。 */
export function weaponOfferPrice(weaponId, offerLevel) {
  const def = getWeapon(weaponId);
  if (!def) return 0;
  const lv = Math.max(1, Math.min(WEAPON_LEVEL_PRICE_MUL.length, offerLevel));
  return Math.round(weaponPrice(def) * WEAPON_LEVEL_PRICE_MUL[lv - 1]);
}

/** 副本单价：level 级副本的价钱，恒低于「升到 level+1」的直购价的一半。 */
export function weaponCopyPrice(weaponId, level) {
  const direct = weaponOfferPrice(weaponId, level + 1);
  return Math.max(1, Math.round(direct * WEAPON_COPY_PRICE_RATIO));
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
  player.weapons.push(makeWeapon(weaponId, 1));
  return { type: 'new', level: 1 };
}

/**
 * 复制一件已有武器（商店副本）：占一个空槽，等级与原武器相同，不动原武器。
 * 返回 { type, id, level }，没有空槽或武器不存在时返回 null。
 */
export function addWeaponCopy(player, weaponId, level) {
  const def = getWeapon(weaponId);
  if (!def) return null;
  if (!hasFreeWeaponSlot(player)) return null;
  player.weapons.push(makeWeapon(weaponId, level));
  const added = player.weapons[player.weapons.length - 1];
  return { type: 'copy', id: weaponId, level: added.level };
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
  // 同级副本候选：已拥有、未满级，且有空槽放副本
  const copyCandidates = hasFreeWeaponSlot(player)
    ? player.weapons.filter((w) => w.level < MAX_WEAPON_LEVEL)
    : [];
  for (let i = 0; i < 2; i++) {
    // 这一格改成同级副本：按概率出现，替代直购位，不增加商品总数
    if (copyCandidates.length && rng.chance(WEAPON_COPY_CHANCE)) {
      const pick = rng.pick(copyCandidates);
      if (pick) {
        offers.push({
          key: `c:${pick.id}:${i}`,
          type: 'weapon',
          copy: true,
          weaponId: pick.id,
          level: pick.level,
          price: weaponCopyPrice(pick.id, pick.level),
          sold: false,
        });
        continue;
      }
    }
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
      price: weaponOfferPrice(def.id, level),
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

  return { offers, rerolls: 0, rerollCost: REROLL_BASE_COST, healPrice: healPrice(player), wave };
}

/** 第 n 次刷新的价格：8 → 11 → 17 → 26 → 38……递增幅度逐次变大。 */
export function rerollPrice(shop) {
  const n = shop?.rerolls || 0;
  return REROLL_BASE_COST + 3 * n * (n + 1) / 2;
}

export function buyOffer(player, shop, index) {
  const offer = shop.offers[index];
  if (!offer) return { ok: false, reason: 'missing' };
  if (offer.sold) return { ok: false, reason: 'sold' };
  if (player.money < offer.price) return { ok: false, reason: 'money' };

  if (offer.type === 'weapon') {
    if (offer.copy) {
      const copied = addWeaponCopy(player, offer.weaponId, offer.level);
      if (!copied) return { ok: false, reason: 'slots' };
      player.money -= offer.price;
      offer.sold = true;
      return { ok: true, type: 'weapon', ...copied };
    }
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
  const cost = rerollPrice(shop);
  if (player.money < cost) return { ok: false, reason: 'money', cost };
  player.money -= cost;
  shop.rerolls += 1;
  const fresh = generateShop(player, rng, wave);
  shop.offers = fresh.offers;
  shop.rerollCost = rerollPrice(shop);
  shop.healPrice = healPrice(player);
  return { ok: true, cost };
}

export function healPrice(player) {
  return 18 + Math.round(player.stats.maxHp * 0.09);
}

export function buyHeal(player, shop) {
  const price = shop.healPrice ?? healPrice(player);
  if (player.money < price) return { ok: false, reason: 'money', price };
  if (player.hp >= player.stats.maxHp) return { ok: false, reason: 'full', price };
  player.money -= price;
  return { ok: true, price, amount: Math.round(player.stats.maxHp * 0.34) };
}
