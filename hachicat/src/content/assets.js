/**
 * 素材注册表：把「实体 → 外观」的映射集中在这一处。
 *
 * 换画风时只需要：
 *   1. 改下面的 palette / themeOverrides（换配色）；
 *   2. 或者给 sprite 加 image: { src, frames... }，由 render/sprites.js 画图片；
 *   3. 或者新增一个 kind，在 render/sprites.js 里加一个绘制函数。
 * 战斗逻辑、数值、AI 完全不需要动。
 *
 * kind 目前支持：cat / sweeper / drone / spitter / brute / boss /
 *                orb / xp / coin / trap / glyph
 */

const CAT_PALETTE = {
  fur: '#f3a35c',
  furDark: '#c97a34',
  belly: '#ffe8c9',
  earInner: '#ffb3a0',
  eye: '#16222e',
  pupil: '#070c12',
  nose: '#ff8fa3',
  scarf: '#4fd1e0',
  stripe: '#d9873f',
};

export const SPRITES = {
  // ---------- 玩家猫 ----------
  'cat.ginger': {
    kind: 'cat',
    size: 44,
    palette: CAT_PALETTE,
  },
  'cat.soot': {
    kind: 'cat',
    size: 42,
    palette: {
      ...CAT_PALETTE,
      fur: '#4a5266', furDark: '#2c3242', belly: '#8d97ad',
      earInner: '#6b7488', eye: '#9df5ff', pupil: '#0a1018',
      nose: '#d9a0b0', scarf: '#ffce54', stripe: '#2c3242',
    },
  },
  'cat.frost': {
    kind: 'cat',
    size: 44,
    palette: {
      ...CAT_PALETTE,
      fur: '#eef4ff', furDark: '#b9c7e2', belly: '#ffffff',
      earInner: '#ffc9d8', eye: '#3d7dff', pupil: '#0a1024',
      nose: '#ff9fb8', scarf: '#7aa7ff', stripe: '#cfdcf5',
    },
  },
  'cat.shadow': {
    kind: 'cat',
    size: 43,
    palette: {
      ...CAT_PALETTE,
      fur: '#3b2a4d', furDark: '#241733', belly: '#6b4a83',
      earInner: '#8b5aa8', eye: '#ff7ad9', pupil: '#150a1e',
      nose: '#ff8fb0', scarf: '#b06bff', stripe: '#513469',
    },
    themeOverrides: {
      paper: { fur: '#5b4166', furDark: '#3a2742', belly: '#8b6a97', eye: '#b13a6a' },
    },
  },

  // ---------- 敌人 ----------
  'enemy.sweeper': {
    kind: 'sweeper',
    size: 34,
    palette: { body: '#9aa6c4', bodyDark: '#6a7592', glow: '#67e8f9', eye: '#ff5c7a', brush: '#4a5470' },
    themeOverrides: {
      paper: { body: '#b9a887', bodyDark: '#8e7c5e', glow: '#2f7f74', eye: '#c2452f', brush: '#6d5a3e' },
    },
  },
  'enemy.drone': {
    kind: 'drone',
    size: 30,
    palette: { body: '#5b6482', bodyDark: '#39415a', glow: '#ff7a9c', eye: '#ff5c7a', rotor: '#9aa6c4' },
    themeOverrides: {
      paper: { body: '#a89474', bodyDark: '#7a6647', glow: '#c2452f', eye: '#a8321f', rotor: '#d8c29c' },
    },
  },
  'enemy.spitter': {
    kind: 'spitter',
    size: 36,
    palette: { body: '#6fb3a4', bodyDark: '#4d8b7f', glow: '#a7f3d0', eye: '#ffce54', water: '#7ee3ff' },
    themeOverrides: {
      paper: { body: '#7fa58a', bodyDark: '#5d7f68', glow: '#2f7f74', eye: '#c48a1c', water: '#3f8fb0' },
    },
  },
  'enemy.brute': {
    kind: 'brute',
    size: 52,
    palette: { body: '#6d7387', bodyDark: '#4a4f61', glow: '#ffb703', eye: '#ff5c7a', lid: '#8d93a8' },
    themeOverrides: {
      paper: { body: '#9b8a6d', bodyDark: '#75664c', glow: '#c48a1c', eye: '#b5382a', lid: '#c2ae8b' },
    },
  },
  'enemy.boss': {
    kind: 'boss',
    size: 104,
    palette: { body: '#39415a', bodyDark: '#242b40', glow: '#ff4d6d', core: '#ffd166', eye: '#ff2e55' },
    themeOverrides: {
      paper: { body: '#6a5c49', bodyDark: '#493f31', glow: '#a8321f', core: '#c48a1c', eye: '#8f1f14' },
    },
  },

  // ---------- 投射物 ----------
  'proj.hairball': { kind: 'orb', size: 14, palette: { core: '#ffe6b8', glow: '#f9a826', edge: '#c97a34' } },
  'proj.water': { kind: 'orb', size: 12, palette: { core: '#d8fbff', glow: '#7ee3ff', edge: '#2c8fb0' } },
  'proj.ink': { kind: 'orb', size: 16, palette: { core: '#ffd0dc', glow: '#ff4d6d', edge: '#8c1f38' } },
  'proj.generic': { kind: 'orb', size: 12, palette: { core: '#ffffff', glow: '#67e8f9', edge: '#2c8fb0' } },

  // ---------- 掉落 ----------
  'pickup.xp': { kind: 'xp', size: 12, palette: { core: '#d9ffe6', glow: '#78e6a0', edge: '#2f8f5a' } },
  'pickup.coin': { kind: 'coin', size: 13, palette: { core: '#fff3c4', glow: '#ffce54', edge: '#b07d12' } },

  // ---------- 陷阱 ----------
  'trap.mouse': { kind: 'trap', size: 26, palette: { metal: '#c9d3e6', metalDark: '#78839c', glow: '#ffce54' } },

  // ---------- 武器图标（React HUD 复用同一套绘制） ----------
  'icon.hairball': { kind: 'glyph', glyph: 'hairball', size: 28, palette: { a: '#f9a826', b: '#ffe6b8', c: '#c97a34' } },
  'icon.claw': { kind: 'glyph', glyph: 'claw', size: 28, palette: { a: '#ff9fb8', b: '#ffffff', c: '#c2452f' } },
  'icon.hiss': { kind: 'glyph', glyph: 'hiss', size: 28, palette: { a: '#a7f3d0', b: '#ffffff', c: '#2f7f74' } },
  'icon.laser': { kind: 'glyph', glyph: 'laser', size: 28, palette: { a: '#ff5c7a', b: '#ffe6b8', c: '#8c1f38' } },
  'icon.tail': { kind: 'glyph', glyph: 'tail', size: 28, palette: { a: '#c4b5fd', b: '#ffffff', c: '#6d28d9' } },
  'icon.trap': { kind: 'glyph', glyph: 'trap', size: 28, palette: { a: '#c9d3e6', b: '#ffffff', c: '#78839c' } },
  'icon.paw': { kind: 'glyph', glyph: 'paw', size: 28, palette: { a: '#ffce54', b: '#ffffff', c: '#c97a34' } },
};

export function getSprite(id) {
  return SPRITES[id] || SPRITES['proj.generic'];
}

/** 解析出当前画风下的实际配色。 */
export function resolveSprite(id, themeId) {
  const base = getSprite(id);
  const override = base.themeOverrides && base.themeOverrides[themeId];
  if (!override) return base;
  return { ...base, palette: { ...base.palette, ...override } };
}

/** 武器弹道 → 投射物 sprite（换画风时只改这里或 sprite 定义）。 */
export const WEAPON_PROJECTILE_SPRITE = {
  hairball: 'proj.hairball',
  trap: 'trap.mouse',
};

/** 敌人弹道 → 投射物 sprite。 */
export const ENEMY_PROJECTILE_SPRITE = {
  spitter: 'proj.water',
  ironLung: 'proj.ink',
};

/** 武器 id → 图标 sprite id（数据驱动，新增武器时在这里登记）。 */
export const WEAPON_ICONS = {
  hairball: 'icon.hairball',
  claw: 'icon.claw',
  hiss: 'icon.hiss',
  laser: 'icon.laser',
  tail: 'icon.tail',
  trap: 'icon.trap',
};

export const UI_ICONS = {
  paw: 'icon.paw',
};