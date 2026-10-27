/**
 * 升级池：每次升级随机抽 3 个。
 * rarity 1 常见 / 2 难得 / 3 珍藏，仅影响出现权重与卡片配色。
 * id 为兼容保留，不作为玩家可见文案。
 */
export const UPGRADES = [
  // ---- 常见 ----
  { id: 'sharp_claws', name: '认真练习', rarity: 1, stat: 'damageMul', amount: 0.08, mode: 'mul', maxStacks: 10, flavor: '每天多练一点点。' },
  { id: 'quick_paws', name: '手脚麻利', rarity: 1, stat: 'attackSpeedMul', amount: 0.08, mode: 'mul', maxStacks: 10, flavor: '做熟了，就快了。' },
  { id: 'light_step', name: '轻快脚步', rarity: 1, stat: 'speed', amount: 9, mode: 'add', maxStacks: 8, flavor: '走在小路上不出声。' },
  { id: 'thick_fur', name: '厚实外套', rarity: 1, stat: 'maxHp', amount: 14, mode: 'add', maxStacks: 10, flavor: '多一层，少受一点凉。' },
  { id: 'long_whiskers', name: '好眼力', rarity: 1, stat: 'pickup', amount: 12, mode: 'add', maxStacks: 8, flavor: '掉在草丛里的东西也看得见。' },
  { id: 'scab', name: '耐磨围裙', rarity: 1, stat: 'armor', amount: 1, mode: 'add', maxStacks: 8, flavor: '干粗活留下的痕迹。' },
  { id: 'nap', name: '午后小憩', rarity: 1, stat: 'regen', amount: 0.4, mode: 'add', maxStacks: 6, flavor: '打个盹，力气就回来了。' },

  // ---- 难得 ----
  { id: 'fury', name: '鼓起勇气', rarity: 2, stat: 'damageMul', amount: 0.15, mode: 'mul', maxStacks: 8, flavor: '害怕，但还是往前一步。' },
  { id: 'frenzy', name: '越干越起劲', rarity: 2, stat: 'attackSpeedMul', amount: 0.15, mode: 'mul', maxStacks: 8, flavor: '事情一多，反而更专注。' },
  { id: 'nine_lives', name: '伙伴的牵挂', rarity: 2, stat: 'maxHp', amount: 24, mode: 'add', maxStacks: 6, flavor: '想到有人在等，就不能倒下。' },
  { id: 'eagle_eye', name: '专注', rarity: 2, stat: 'crit', amount: 0.04, mode: 'add', maxStacks: 6, flavor: '只看眼前这一件事。' },
  { id: 'wide_net', name: '伸长手臂', rarity: 2, stat: 'rangeMul', amount: 0.1, mode: 'mul', maxStacks: 6, flavor: '够得着更远的地方。' },
  { id: 'magnet', name: '闻香而来', rarity: 2, stat: 'pickup', amount: 22, mode: 'add', maxStacks: 5, flavor: '好吃的味道不会被错过。' },

  // ---- 珍藏 ----
  { id: 'berserk', name: '保护朋友', rarity: 3, stat: 'damageMul', amount: 0.24, mode: 'mul', maxStacks: 5, flavor: '不许碰我的伙伴。' },
  { id: 'overclock', name: '全力以赴', rarity: 3, stat: 'attackSpeedMul', amount: 0.24, mode: 'mul', maxStacks: 5, flavor: '今天也要把活干完。' },
  { id: 'assassin', name: '抓住破绽', rarity: 3, stat: 'crit', amount: 0.08, mode: 'add', maxStacks: 4, flavor: '看准了再出手。' },
  { id: 'sharp_fang', name: '用力一击', rarity: 3, stat: 'critMul', amount: 0.2, mode: 'add', maxStacks: 4, flavor: '把力气都用在这一次。' },
  { id: 'iron_hide', name: '厚壳护甲', rarity: 3, stat: 'armor', amount: 3, mode: 'add', maxStacks: 4, flavor: '像背着一口小锅，沉但安心。' },
];

export const RARITY_WEIGHT = { 1: 100, 2: 44, 3: 16 };
export const RARITY_LABEL = { 1: '常见', 2: '难得', 3: '珍藏' };

export function getUpgrade(id) {
  return UPGRADES.find((u) => u.id === id) || null;
}

export function upgradeMods(upgrade) {
  return [{ stat: upgrade.stat, amount: upgrade.amount, mode: upgrade.mode }];
}
