/**
 * 升级池：每次升级随机抽 3 个。
 * rarity 1 普通 / 2 稀有 / 3 史诗，仅影响出现权重与卡片配色。
 */
export const UPGRADES = [
  // ---- 普通 ----
  { id: 'sharp_claws', name: '磨利爪子', rarity: 1, stat: 'damageMul', amount: 0.08, mode: 'mul', maxStacks: 10, flavor: '抓痕深了一点点。' },
  { id: 'quick_paws', name: '快爪', rarity: 1, stat: 'attackSpeedMul', amount: 0.08, mode: 'mul', maxStacks: 10, flavor: '出爪快过念头。' },
  { id: 'light_step', name: '轻脚步', rarity: 1, stat: 'speed', amount: 9, mode: 'add', maxStacks: 8, flavor: '落在雨上都不出声。' },
  { id: 'thick_fur', name: '厚毛', rarity: 1, stat: 'maxHp', amount: 14, mode: 'add', maxStacks: 10, flavor: '多一层，少一刀。' },
  { id: 'long_whiskers', name: '长胡须', rarity: 1, stat: 'pickup', amount: 12, mode: 'add', maxStacks: 8, flavor: '风里有一点鱼味。' },
  { id: 'scab', name: '结痂', rarity: 1, stat: 'armor', amount: 1, mode: 'add', maxStacks: 8, flavor: '打过的架都长在身上。' },
  { id: 'nap', name: '打盹', rarity: 1, stat: 'regen', amount: 0.4, mode: 'add', maxStacks: 6, flavor: '三秒钟也能睡一觉。' },

  // ---- 稀有 ----
  { id: 'fury', name: '炸毛', rarity: 2, stat: 'damageMul', amount: 0.15, mode: 'mul', maxStacks: 8, flavor: '整只猫大了一圈。' },
  { id: 'frenzy', name: '应激反应', rarity: 2, stat: 'attackSpeedMul', amount: 0.15, mode: 'mul', maxStacks: 8, flavor: '越吵越兴奋。' },
  { id: 'nine_lives', name: '九条命', rarity: 2, stat: 'maxHp', amount: 24, mode: 'add', maxStacks: 6, flavor: '还剩八条。' },
  { id: 'eagle_eye', name: '夜视眼', rarity: 2, stat: 'crit', amount: 0.04, mode: 'add', maxStacks: 6, flavor: '黑暗里全是轮廓。' },
  { id: 'wide_net', name: '大扫把', rarity: 2, stat: 'rangeMul', amount: 0.1, mode: 'mul', maxStacks: 6, flavor: '手伸得比别人长。' },
  { id: 'magnet', name: '吃鱼直觉', rarity: 2, stat: 'pickup', amount: 22, mode: 'add', maxStacks: 5, flavor: '鱼干自己会过来。' },

  // ---- 史诗 ----
  { id: 'berserk', name: '护崽本能', rarity: 3, stat: 'damageMul', amount: 0.24, mode: 'mul', maxStacks: 5, flavor: '不许碰我的箱子。' },
  { id: 'overclock', name: '过热', rarity: 3, stat: 'attackSpeedMul', amount: 0.24, mode: 'mul', maxStacks: 5, flavor: '风扇转到发烫。' },
  { id: 'assassin', name: '猎手', rarity: 3, stat: 'crit', amount: 0.08, mode: 'add', maxStacks: 4, flavor: '一次就够。' },
  { id: 'sharp_fang', name: '尖牙', rarity: 3, stat: 'critMul', amount: 0.2, mode: 'add', maxStacks: 4, flavor: '咬下去有回声。' },
  { id: 'iron_hide', name: '铁皮', rarity: 3, stat: 'armor', amount: 3, mode: 'add', maxStacks: 4, flavor: '像一只会走路的罐头。' },
];

export const RARITY_WEIGHT = { 1: 100, 2: 44, 3: 16 };
export const RARITY_LABEL = { 1: '普通', 2: '稀有', 3: '史诗' };

export function getUpgrade(id) {
  return UPGRADES.find((u) => u.id === id) || null;
}

export function upgradeMods(upgrade) {
  return [{ stat: upgrade.stat, amount: upgrade.amount, mode: upgrade.mode }];
}