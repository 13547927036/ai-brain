import type { Quality } from '../content/types.js';
import { ITEM_BY_ID, type ItemTier } from '../content/items.js';
import { QUALITY_BASE_PRICE, QUALITY_MIN_WAVE, WEAPONS, WEAPON_BY_ID } from '../content/weapons.js';
import { applyStat, ITEM_TIER_PRICE } from './stats.js';
import type { World } from './world.js';


export const SHOP_SLOTS = 4;
/** 货位中武器的目标占比（spec 4.3：约 35%） */
export const WEAPON_RATIO = 0.35;
/** 每波保底武器数 */
export const GUARANTEED_WEAPONS = 1;

export type ShopSlotKind = 'weapon' | 'item';

export interface ShopSlot {
  kind: ShopSlotKind;
  /** 武器 id 或道具 id */
  contentId: string;
  quality: Quality;
  basePrice: number;
  price: number;
  locked: boolean;
  sold: boolean;
}

export interface Shop {
  wave: number;
  slots: ShopSlot[];
  rerolls: number;
}

/** 最终价 = ceil(基础价 × (1 + 0.35 × (波数 − 1)))（spec 4.3） */
export function priceOf(basePrice: number, wave: number): number {
  return Math.ceil(basePrice * (1 + 0.35 * (wave - 1)));
}

/** 重掷费用 = 1 + 波数，同一商店内每次重掷再 +1 */
export function rerollCost(shop: Shop): number {
  return 1 + shop.wave + shop.rerolls;
}

function availableQualities(wave: number): Quality[] {
  const out: Quality[] = [];
  for (const q of [1, 2, 3, 4] as Quality[]) {
    if (wave >= QUALITY_MIN_WAVE[q]) out.push(q);
  }
  return out.length > 0 ? out : [1];
}

function pickQuality(w: World, wave: number): Quality {
  const avail = availableQualities(wave);
  if (w.rng.next() < 0.7) return avail[0] as Quality;
  const idx = Math.min(avail.length - 1, Math.floor(w.rng.next() * avail.length));
  return avail[idx] as Quality;
}

function makeWeaponSlot(w: World, wave: number): ShopSlot {
  const quality = pickQuality(w, wave);
  const pool = WEAPONS.filter((d) => d.basePrice > 0);
  const def = pool[Math.min(pool.length - 1, Math.floor(w.rng.next() * pool.length))];
  const id = def ? def.id : 'club';
  const base = QUALITY_BASE_PRICE[quality];
  return {
    kind: 'weapon',
    contentId: id,
    quality,
    basePrice: base,
    price: priceOf(base, wave),
    locked: false,
    sold: false,
  };
}

function makeItemSlot(w: World, wave: number): ShopSlot {
  const tiers: ItemTier[] = [1];
  if (wave >= 3) tiers.push(2);
  if (wave >= 6) tiers.push(3);
  if (wave >= 9) tiers.push(4);
  const tier = tiers[Math.min(tiers.length - 1, Math.floor(w.rng.next() * tiers.length))] as ItemTier;
  const pool = Object.values(ITEM_BY_ID).filter((i) => i.tier === tier);
  const def = pool[Math.min(pool.length - 1, Math.floor(w.rng.next() * pool.length))];
  const base = ITEM_TIER_PRICE[tier];
  return {
    kind: 'item',
    contentId: def ? def.id : 'pebble',
    quality: 1,
    basePrice: base,
    price: priceOf(base, wave),
    locked: false,
    sold: false,
  };
}

/** 生成商店。保底 1 个武器；已锁定的货位保留原内容。 */
export function generateShop(w: World, wave: number, previous?: Shop): Shop {
  const slots: ShopSlot[] = [];
  let weapons = 0;

  for (let i = 0; i < SHOP_SLOTS; i++) {
    const prev = previous?.slots[i];
    if (prev && prev.locked && !prev.sold) {
      slots.push({ ...prev, price: priceOf(prev.basePrice, wave) });
      if (prev.kind === 'weapon') weapons++;
      continue;
    }
    slots.push({ kind: 'item', contentId: 'pebble', quality: 1, basePrice: 8, price: 0, locked: false, sold: false });
  }

  // 先按比例填充未锁定货位
  for (let i = 0; i < SHOP_SLOTS; i++) {
    const slot = slots[i];
    if (!slot || slot.locked) continue;
    const wantWeapon = w.rng.next() < WEAPON_RATIO;
    slots[i] = wantWeapon ? makeWeaponSlot(w, wave) : makeItemSlot(w, wave);
    if (wantWeapon) weapons++;
  }

  // 保底：一个武器都没有时强行替换一个非锁定货位
  if (weapons < GUARANTEED_WEAPONS) {
    for (let i = 0; i < SHOP_SLOTS; i++) {
      const slot = slots[i];
      if (!slot || slot.locked) continue;
      slots[i] = makeWeaponSlot(w, wave);
      break;
    }
  }

  return { wave, slots, rerolls: 0 };
}

/** 重掷：保留锁定的货位，其余重生成 */
export function rerollShop(w: World, shop: Shop): boolean {
  shop.rerolls++;
  let weapons = 0;
  for (let i = 0; i < shop.slots.length; i++) {
    const slot = shop.slots[i];
    if (!slot || slot.locked) {
      if (slot?.kind === 'weapon') weapons++;
      continue;
    }
    const wantWeapon = w.rng.next() < WEAPON_RATIO;
    shop.slots[i] = wantWeapon ? makeWeaponSlot(w, shop.wave) : makeItemSlot(w, shop.wave);
    if (wantWeapon) weapons++;
  }
  if (weapons < GUARANTEED_WEAPONS) {
    for (let i = 0; i < shop.slots.length; i++) {
      const slot = shop.slots[i];
      if (!slot || slot.locked) continue;
      shop.slots[i] = makeWeaponSlot(w, shop.wave);
      break;
    }
  }
  return true;
}

/**
 * 武器入包：已有同名同品质则合成升阶（上限 T4），否则占用空槽。
 * 返回 false 表示槽位已满。
 */
export function addWeapon(w: World, defId: string, quality: Quality): boolean {
  const p = w.player;
  const twin = p.weapons.find((x) => x.defId === defId && x.quality === quality);
  if (twin && quality < 4) {
    twin.quality = (quality + 1) as Quality;
    return true;
  }
  if (p.weapons.length >= p.weaponSlots) return false;
  p.weapons.push({ defId, quality, cooldown: 0 });
  return true;
}

export function applyItem(w: World, itemId: string): boolean {
  const def = ITEM_BY_ID[itemId];
  if (!def) return false;
  for (const [stat, amount] of Object.entries(def.mods)) {
    if (typeof amount === 'number') applyStat(w, stat as never, amount);
  }
  return true;
}

/** 购买货位。返回是否成功（材料不足或槽位满则失败且不扣钱）。 */
export function buySlot(w: World, shop: Shop, index: number): boolean {
  const slot = shop.slots[index];
  if (!slot || slot.sold) return false;
  if (w.player.materials < slot.price) return false;

  if (slot.kind === 'weapon') {
    if (!addWeapon(w, slot.contentId, slot.quality)) return false;
  } else {
    if (!applyItem(w, slot.contentId)) return false;
  }

  w.player.materials -= slot.price;
  slot.sold = true;
  return true;
}

export function toggleLock(shop: Shop, index: number): void {
  const slot = shop.slots[index];
  if (!slot || slot.sold) return;
  slot.locked = !slot.locked;
}

export function weaponDisplayName(defId: string, quality: Quality): string {
  const def = WEAPON_BY_ID[defId];
  return `${def ? def.name : defId} T${quality}`;
}
