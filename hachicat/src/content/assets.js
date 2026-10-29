/**
 * 素材注册表：把「实体 → 外观」的映射集中在这一处。
 *
 * 换画风时只需要：
 *   1. 改下面的 palette / themeOverrides（换配色）；
 *   2. 或者给 sprite 加 image: { src, frames... }，由 render/sprites.js 画图片；
 *   3. 或者新增一个 kind，在 render/sprites.js 里加一个绘制函数。
 * 战斗逻辑、数值、AI 完全不需要动。
 *
 * kind 目前支持：image / fluff / flutter / spitter / brute / dart / guard /
 *                bomber / nester / glowcap / mite / boss /
 *                orb / xp / coin / trap / glyph
 */

const CHAR_PALETTE = {
  body: '#fff4e6',
  bodyDark: '#e3cbb8',
  belly: '#fffaf2',
  earInner: '#ffb3a0',
  eye: '#2b2440',
  pupil: '#151020',
  nose: '#ff9fb8',
  scarf: '#9be3c3',
  accent: '#ffd08a',
};

export const SPRITES = {
  // ---------- 玩家角色（图片素材）----------
  // 素材由原图裁掉透明边、再按同一系数等比缩放到"内容宽度 192px"导出，
  // 因此三者的相对比例与原图完全一致（不透明像素比在原图与成品间误差 < 0.2%），
  // 透明背景、颜色、主体均未改动，也没有任何拉伸变形。
  // palette 只作为图片不可用时的程序化兜底配色；variant 决定兜底外形。
  'char.hachiware': {
    kind: 'image',
    variant: 'hachiware',
    image: './chars/hachiware.png',
    size: 44,
    // 四方向逐帧素材（见 docs/character-4dir-animation-spec.md §6）。
    // 目前只有向下的待机 4 帧 + 走路 6 帧；其他方向回退到 fallbackDir。
    anim: {
      base: './chars/anim',
      prefix: 'hachiware',
      cell: 256,
      anchor: { x: 128, y: 224 },
      dirs: ['down'],
      fallbackDir: 'down',
      frames: { idle: 4, walk: 6 },
      fps: { idle: 6, walk: 10 },
    },
    palette: { ...CHAR_PALETTE, body: '#fffdf8', bodyDark: '#d8d3e8', scarf: '#7fd8e8' },
  },
  'char.chiikawa': {
    kind: 'image',
    variant: 'chiikawa',
    image: './chars/chiikawa.png',
    size: 42,
    palette: { ...CHAR_PALETTE, body: '#fff1e6', bodyDark: '#e8cdbb', scarf: '#ffd166' },
  },
  'char.usagi': {
    kind: 'image',
    variant: 'usagi',
    image: './chars/usagi.png',
    size: 44,
    palette: { ...CHAR_PALETTE, body: '#ffe9a8', bodyDark: '#e0c06a', scarf: '#ff9fb8' },
  },

  // ---------- 敌人：原创讨伐目标 ----------
  'enemy.fluff': {
    kind: 'fluff',
    size: 34,
    palette: { body: '#e8b07a', bodyDark: '#b97b48', glow: '#ffd166', eye: '#4b3024', tuft: '#f7d7a8' },
    themeOverrides: {
      paper: { body: '#c79a6a', bodyDark: '#9a6d42', glow: '#c48a1c', eye: '#4d3324', tuft: '#e8d0a8' },
    },
  },
  'enemy.flutter': {
    kind: 'flutter',
    size: 30,
    palette: { body: '#8fd8c7', bodyDark: '#4f9f95', glow: '#ff9fb8', eye: '#24403c', wing: '#d8fff2', beak: '#ffb703' },
    themeOverrides: {
      paper: { body: '#7fa58a', bodyDark: '#5d7f68', glow: '#c2452f', eye: '#2b2018', wing: '#d8efe0', beak: '#c48a1c' },
    },
  },
  'enemy.spitter': {
    kind: 'spitter',
    size: 36,
    palette: { body: '#9ccb7a', bodyDark: '#5f8f4a', glow: '#f2c14e', eye: '#3b2b20', seed: '#f2c14e', leaf: '#4f8f5a' },
    themeOverrides: {
      paper: { body: '#8fa878', bodyDark: '#647a4f', glow: '#c48a1c', eye: '#3b2b20', seed: '#c48a1c', leaf: '#5d7f68' },
    },
  },
  'enemy.brute': {
    kind: 'brute',
    size: 52,
    palette: { body: '#8a7a68', bodyDark: '#584b3f', glow: '#ffd166', eye: '#33261e', shell: '#b9a184', moss: '#7fa05a' },
    themeOverrides: {
      paper: { body: '#9b8a6d', bodyDark: '#75664c', glow: '#c48a1c', eye: '#3b2b20', shell: '#c2ae8b', moss: '#7f9a63' },
    },
  },
  'enemy.dart': {
    kind: 'dart',
    size: 30,
    palette: { body: '#f08a5d', bodyDark: '#a84f32', glow: '#ffd166', eye: '#3a241f', horn: '#fff1cf', hoof: '#4d3324' },
    themeOverrides: {
      paper: { body: '#d08a5f', bodyDark: '#9b6238', glow: '#c48a1c', eye: '#3b2b20', horn: '#efe0bf', hoof: '#4d4030' },
    },
  },
  'enemy.guard': {
    kind: 'guard',
    size: 46,
    palette: { body: '#7b8f7a', bodyDark: '#4e5f50', plate: '#c9d3b8', rivet: '#3a4a3d', eye: '#ffce54' },
    themeOverrides: {
      paper: { body: '#8f9b74', bodyDark: '#61704c', plate: '#d8c9a8', rivet: '#4d4030', eye: '#c48a1c' },
    },
  },
  'enemy.bomber': {
    kind: 'bomber',
    size: 30,
    palette: { body: '#e8a15c', bodyDark: '#a86632', core: '#ff6b6b', spark: '#ffd166', leaf: '#6f9a5a' },
    themeOverrides: {
      paper: { body: '#d08a5f', bodyDark: '#9b6238', core: '#c2452f', spark: '#c48a1c', leaf: '#7f9a63' },
    },
  },
  'enemy.nester': {
    kind: 'nester',
    size: 42,
    palette: { body: '#c99a6b', bodyDark: '#8f6340', nest: '#d8b77a', egg: '#fff1cf', eye: '#3b2b20' },
    themeOverrides: {
      paper: { body: '#b09470', bodyDark: '#7a6248', nest: '#d8c29c', egg: '#fff7e4', eye: '#3b2b20' },
    },
  },
  'enemy.glowcap': {
    kind: 'glowcap',
    size: 34,
    palette: { body: '#c9b7e8', bodyDark: '#8a76b0', light: '#b7f7dc', spot: '#fff1cf', eye: '#3b2b20' },
    themeOverrides: {
      paper: { body: '#b7a6c9', bodyDark: '#7f6f94', light: '#d8efe0', spot: '#fff7e4', eye: '#3b2b20' },
    },
  },
  'enemy.mite': {
    kind: 'mite',
    size: 18,
    palette: { body: '#ffe1b8', bodyDark: '#d8b184', eye: '#3b2b20', spark: '#ffd166' },
    themeOverrides: {
      paper: { body: '#e8d0a8', bodyDark: '#b99a6d', eye: '#3b2b20', spark: '#c48a1c' },
    },
  },
  'enemy.boss': {
    kind: 'boss',
    size: 104,
    palette: { body: '#7c8462', bodyDark: '#4c543c', glow: '#ffb86b', core: '#ffd166', eye: '#ffd166', horn: '#f0e3c4' },
    themeOverrides: {
      paper: { body: '#9a8f70', bodyDark: '#6b6048', glow: '#c2452f', core: '#c48a1c', eye: '#b07a2f', horn: '#efe0bf' },
    },
  },

  // ---------- 投射物 ----------
  'proj.yarn': { kind: 'orb', size: 14, palette: { core: '#ffe6b8', glow: '#f08a5d', edge: '#a84f32' } },
  'proj.seed': { kind: 'orb', size: 12, palette: { core: '#fff3c4', glow: '#f2c14e', edge: '#8f6a1f' } },
  'proj.spore': { kind: 'orb', size: 16, palette: { core: '#ffd0dc', glow: '#c9b7e8', edge: '#6f5a86' } },
  'proj.generic': { kind: 'orb', size: 12, palette: { core: '#ffffff', glow: '#ffd08a', edge: '#a86a32' } },

  // ---------- 掉落 ----------
  'pickup.xp': { kind: 'xp', size: 12, palette: { core: '#e6ffe9', glow: '#9be3a0', edge: '#3f8f5a' } },
  'pickup.coin': { kind: 'coin', size: 13, palette: { core: '#fff3c4', glow: '#ffd166', edge: '#b07d12' } },

  // ---------- 陷阱 ----------
  'trap.snare': { kind: 'trap', size: 26, palette: { metal: '#d8c9a8', metalDark: '#8f7a58', glow: '#ffd166' } },

  // ---------- 武器图标（React HUD 复用同一套绘制） ----------
  'icon.hairball': { kind: 'glyph', glyph: 'yarn', size: 28, palette: { a: '#f08a5d', b: '#ffe6b8', c: '#a84f32' } },
  'icon.claw': { kind: 'glyph', glyph: 'mallet', size: 28, palette: { a: '#d8b184', b: '#fff1cf', c: '#8f6340' } },
  'icon.hiss': { kind: 'glyph', glyph: 'horn', size: 28, palette: { a: '#ffd08a', b: '#fff7e4', c: '#c98a45' } },
  'icon.laser': { kind: 'glyph', glyph: 'flashlight', size: 28, palette: { a: '#ffd166', b: '#fff7e4', c: '#8f6a1f' } },
  'icon.tail': { kind: 'glyph', glyph: 'pinwheel', size: 28, palette: { a: '#9be3c3', b: '#fff7e4', c: '#3f8f7a' } },
  'icon.trap': { kind: 'glyph', glyph: 'snare', size: 28, palette: { a: '#d8c9a8', b: '#fff7e4', c: '#8f7a58' } },
  'icon.heart': { kind: 'glyph', glyph: 'heart', size: 28, palette: { a: '#ff9fb8', b: '#fff7e4', c: '#c2455a' } },
  'icon.scarf': { kind: 'glyph', glyph: 'scarf', size: 28, palette: { a: '#e8a0a8', b: '#fff3e0', c: '#a85e6b' } },
  'icon.glove': { kind: 'glyph', glyph: 'glove', size: 28, palette: { a: '#d8b184', b: '#fff1cf', c: '#8f6340' } },
  'icon.band': { kind: 'glyph', glyph: 'band', size: 28, palette: { a: '#9be3c3', b: '#fff7e4', c: '#3f8f7a' } },
  'icon.pouch': { kind: 'glyph', glyph: 'pouch', size: 28, palette: { a: '#c7a3d8', b: '#f7eaff', c: '#7d5a91' } },
  'icon.candy': { kind: 'glyph', glyph: 'candy', size: 28, palette: { a: '#ffd08a', b: '#fff7e4', c: '#c98a45' } },
  'icon.box': { kind: 'glyph', glyph: 'box', size: 28, palette: { a: '#9fb7c9', b: '#eaf4ff', c: '#5c7488' } },
  'icon.soup': { kind: 'glyph', glyph: 'soup', size: 28, palette: { a: '#ffb37a', b: '#fff1d6', c: '#b56b3f' } },
  'icon.bell': { kind: 'glyph', glyph: 'bell', size: 28, palette: { a: '#ffd166', b: '#fff7e4', c: '#a87c1f' } },
  'icon.scope': { kind: 'glyph', glyph: 'scope', size: 28, palette: { a: '#9be3c3', b: '#fff7e4', c: '#3f8f7a' } },
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

/**
 * 逐帧图集地址：`<base>/<prefix>_<dir>_<state>.png`。
 * 缺该方向的素材时退回 fallbackDir，避免因为没画好某个方向就整块不显示。
 */
export function animSheetUrl(anim, dir, state) {
  if (!anim) return '';
  const hasDir = anim.dirs && anim.dirs.includes(dir);
  const useDir = hasDir ? dir : anim.fallbackDir || 'down';
  return `${anim.base}/${anim.prefix}_${useDir}_${state}.png`;
}

/** 武器弹道 → 投射物 sprite（换画风时只改这里或 sprite 定义）。 */
export const WEAPON_PROJECTILE_SPRITE = {
  hairball: 'proj.yarn',
  trap: 'trap.snare',
};

/** 敌人弹道 → 投射物 sprite。 */
export const ENEMY_PROJECTILE_SPRITE = {
  spitter: 'proj.seed',
  rumble: 'proj.spore',
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

/** 用品 id → 图标 sprite id（用品图标与属性图标分开，避免都退化成同一个圆点）。 */
export const ITEM_ICONS = {
  collar: 'icon.scarf',
  hook: 'icon.glove',
  rubber: 'icon.band',
  moonstone: 'icon.pouch',
  catnip: 'icon.candy',
  can: 'icon.box',
  fishcan: 'icon.soup',
  bell: 'icon.bell',
  scope: 'icon.scope',
};

export const UI_ICONS = {
  heart: 'icon.heart',
};
