/**
 * 商店道具：纯数据。mods 数组会被合并进玩家属性。
 */
export const ITEMS = [
  {
    id: 'collar', name: '旧围巾', rarity: 1, price: 21, maxStacks: 4,
    desc: '有点起球，但围上很暖。',
    mods: [{ stat: 'maxHp', amount: 15, mode: 'add' }],
  },
  {
    id: 'hook', name: '结实手套', rarity: 1, price: 26, maxStacks: 4,
    desc: '干活磨出来的厚手套，抓东西更稳。',
    mods: [{ stat: 'damageMul', amount: 0.1, mode: 'mul' }],
  },
  {
    id: 'rubber', name: '弹力发圈', rarity: 1, price: 26, maxStacks: 4,
    desc: '绷紧，然后松开，干活更有节奏。',
    mods: [{ stat: 'attackSpeedMul', amount: 0.12, mode: 'mul' }],
  },
  {
    id: 'moonstone', name: '小布袋', rarity: 1, price: 23, maxStacks: 4,
    desc: '装得下路上捡到的所有小东西。',
    mods: [
      { stat: 'pickup', amount: 20, mode: 'add' },
      { stat: 'luck', amount: 2, mode: 'add' },
    ],
  },
  {
    id: 'catnip', name: '薄荷糖', rarity: 2, price: 36, maxStacks: 3,
    desc: '含一颗，头脑清醒，手也更稳。',
    mods: [{ stat: 'crit', amount: 0.06, mode: 'add' }],
  },
  {
    id: 'can', name: '铁皮饭盒', rarity: 2, price: 31, maxStacks: 3,
    desc: '吃完也舍不得扔，挡一下还挺有用。',
    mods: [
      { stat: 'armor', amount: 2, mode: 'add' },
      { stat: 'maxHp', amount: 10, mode: 'add' },
    ],
  },
  {
    id: 'fishcan', name: '热汤罐头', rarity: 2, price: 40, maxStacks: 3,
    desc: '忙完喝一口，身上就暖起来。',
    mods: [{ stat: 'regen', amount: 1.2, mode: 'add' }],
  },
  {
    id: 'bell', name: '幸运铃铛', rarity: 1, price: 30, maxStacks: 3,
    desc: '走路叮当响，好事也跟着来。',
    mods: [
      { stat: 'luck', amount: 6, mode: 'add' },
      { stat: 'rangeMul', amount: 0.08, mode: 'mul' },
    ],
  },
  {
    id: 'scope', name: '单筒望远镜', rarity: 3, price: 45, maxStacks: 2,
    desc: '看得远，也看得准。不是谁都能用，但现在归你了。',
    mods: [
      { stat: 'crit', amount: 0.04, mode: 'add' },
      { stat: 'critMul', amount: 0.15, mode: 'add' },
    ],
  },
];

export const ITEM_BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

export function getItem(id) {
  return ITEM_BY_ID[id] || null;
}

export function itemPrice(item) {
  return item.price;
}