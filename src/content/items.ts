import type { StatId } from './types.js';

export type ItemTier = 1 | 2 | 3 | 4;

export interface ItemDef {
  id: string;
  name: string;
  tier: ItemTier;
  /** 属性修正，可为负（《土豆兄弟》的道具大多带代价） */
  mods: Partial<Record<StatId, number>>;
  desc: string;
}

/**
 * 24 件道具，四档各 6 件（spec 4.3）。
 * 设计原则沿用《土豆兄弟》：**绝大多数道具都带负面代价**，
 * 让「变强」永远是一次取舍而不是纯奖励。
 */
export const ITEMS: ItemDef[] = [
  // ---- 一档：纯小增益，无代价 ----
  { id: 'pebble', name: '小石子', tier: 1, mods: { meleeDamage: 2 }, desc: '近战伤害 +2' },
  { id: 'rubberBand', name: '橡皮筋', tier: 1, mods: { rangedDamage: 2 }, desc: '远程伤害 +2' },
  { id: 'bandage', name: '创可贴', tier: 1, mods: { maxHp: 5 }, desc: '最大生命 +5' },
  { id: 'coin', name: '幸运硬币', tier: 1, mods: { luck: 8 }, desc: '幸运 +8' },
  { id: 'rag', name: '破布', tier: 1, mods: { armor: 1 }, desc: '护甲 +1' },
  { id: 'pouch', name: '小布袋', tier: 1, mods: { pickupRange: 20 }, desc: '拾取范围 +20' },

  // ---- 二档：有代价的中等增益 ----
  { id: 'badge', name: '讨伐队徽章', tier: 2, mods: { meleeDamage: 4, dodge: -2 }, desc: '近战伤害 +4，闪避 -2' },
  { id: 'ammoBox', name: '弹药包', tier: 2, mods: { rangedDamage: 4, attackSpeed: -3 }, desc: '远程伤害 +4，攻速 -3' },
  { id: 'lifeHerb', name: '生命草', tier: 2, mods: { maxHp: 10, moveSpeed: -3 }, desc: '最大生命 +10，移速 -3' },
  { id: 'whetstone', name: '磨刀石', tier: 2, mods: { attackSpeed: 8, meleeDamage: 1 }, desc: '攻速 +8，近战伤害 +1' },
  { id: 'bracer', name: '铁护腕', tier: 2, mods: { armor: 3, moveSpeed: -4 }, desc: '护甲 +3，移速 -4' },
  { id: 'clover', name: '四叶草', tier: 2, mods: { luck: 12, luckDrop: 10 }, desc: '幸运 +12，幸运掉落 +10' },

  // ---- 三档：明显倾斜的强化 ----
  { id: 'gauntlet', name: '猛击手套', tier: 3, mods: { meleeDamage: 6, dodge: -3 }, desc: '近战伤害 +6，闪避 -3' },
  { id: 'scope', name: '狙击镜', tier: 3, mods: { rangedDamage: 6, attackSpeed: -5 }, desc: '远程伤害 +6，攻速 -5' },
  { id: 'stimulant', name: '兴奋剂', tier: 3, mods: { attackSpeed: 15, maxHp: -5 }, desc: '攻速 +15，最大生命 -5' },
  { id: 'shell', name: '龟壳', tier: 3, mods: { armor: 5, moveSpeed: -8 }, desc: '护甲 +5，移速 -8' },
  { id: 'critLens', name: '暴击镜', tier: 3, mods: { critChance: 8, attackSpeed: -3 }, desc: '暴击率 +8，攻速 -3' },
  { id: 'magnet', name: '磁石', tier: 3, mods: { pickupRange: 60, armor: -1 }, desc: '拾取范围 +60，护甲 -1' },

  // ---- 四档：强力但代价明确 ----
  { id: 'spikedClub', name: '狼牙棒', tier: 4, mods: { meleeDamage: 10, armor: -2 }, desc: '近战伤害 +10，护甲 -2' },
  { id: 'heavyBarrel', name: '重炮管', tier: 4, mods: { rangedDamage: 10, moveSpeed: -6 }, desc: '远程伤害 +10，移速 -6' },
  { id: 'windBoots', name: '疾风靴', tier: 4, mods: { moveSpeed: 20, maxHp: -8 }, desc: '移速 +20，最大生命 -8' },
  { id: 'rolyPoly', name: '不倒翁', tier: 4, mods: { dodge: 12, armor: -3 }, desc: '闪避 +12，护甲 -3' },
  { id: 'charm', name: '幸运符', tier: 4, mods: { luck: 20, luckDrop: 25 }, desc: '幸运 +20，幸运掉落 +25' },
  { id: 'warDrum', name: '战鼓', tier: 4, mods: { attackSpeed: 20, meleeDamage: -2 }, desc: '攻速 +20，近战伤害 -2' },
];

export const ITEM_BY_ID: Record<string, ItemDef> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

/** 各档道具数量自检用 */
export function itemsByTier(tier: ItemTier): ItemDef[] {
  return ITEMS.filter((i) => i.tier === tier);
}
