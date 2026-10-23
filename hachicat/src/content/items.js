/**
 * 商店道具：纯数据。mods 数组会被合并进玩家属性。
 */
export const ITEMS = [
  {
    id: 'collar', name: '旧项圈', rarity: 1, price: 21, maxStacks: 4,
    desc: '不知道谁戴过，但很结实。',
    mods: [{ stat: 'maxHp', amount: 15, mode: 'add' }],
  },
  {
    id: 'hook', name: '生锈鱼钩', rarity: 1, price: 26, maxStacks: 4,
    desc: '钩住过很多顿晚饭。',
    mods: [{ stat: 'damageMul', amount: 0.1, mode: 'mul' }],
  },
  {
    id: 'rubber', name: '橡皮筋', rarity: 1, price: 26, maxStacks: 4,
    desc: '绷紧，然后松开。',
    mods: [{ stat: 'attackSpeedMul', amount: 0.12, mode: 'mul' }],
  },
  {
    id: 'moonstone', name: '月亮石', rarity: 1, price: 23, maxStacks: 4,
    desc: '捡到的东西总比别人多。',
    mods: [
      { stat: 'pickup', amount: 20, mode: 'add' },
      { stat: 'luck', amount: 2, mode: 'add' },
    ],
  },
  {
    id: 'catnip', name: '猫薄荷', rarity: 2, price: 36, maxStacks: 3,
    desc: '世界慢下来，只有爪子很快。',
    mods: [{ stat: 'crit', amount: 0.06, mode: 'add' }],
  },
  {
    id: 'can', name: '铁皮罐头', rarity: 2, price: 31, maxStacks: 3,
    desc: '吃完把罐子套在身上。',
    mods: [
      { stat: 'armor', amount: 2, mode: 'add' },
      { stat: 'maxHp', amount: 10, mode: 'add' },
    ],
  },
  {
    id: 'fishcan', name: '小鱼干罐', rarity: 2, price: 40, maxStacks: 3,
    desc: '边打边吃，伤口会自己合上。',
    mods: [{ stat: 'regen', amount: 1.2, mode: 'add' }],
  },
  {
    id: 'bell', name: '幸运铃铛', rarity: 1, price: 30, maxStacks: 3,
    desc: '走路叮当响，敌人却抓不到。',
    mods: [
      { stat: 'luck', amount: 6, mode: 'add' },
      { stat: 'rangeMul', amount: 0.08, mode: 'mul' },
    ],
  },
  {
    id: 'scope', name: '红点瞄准镜', rarity: 3, price: 45, maxStacks: 2,
    desc: '不是猫用的，但现在归你了。',
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