/**
 * 主题层：换皮只改这个文件 + 贴图资源。
 * 默认值是 Chiikawa 占位（仅本地验证用，不发布 —— 见 spec 6.2 合规边界）。
 */

import { CHARACTER_SPRITES } from './sprites.js';

export interface ThemePalette {
  bg: string;
  arenaBorder: string;
  player: string;
  enemy: string;
  enemyFast: string;
  enemyRanged: string;
  boss: string;
  xpOrb: string;
  material: string;
  heal: string;
  text: string;
  danger: string;
}

export interface ThemeDef {
  id: string;
  name: string;
  /** 换皮开关：true 表示这是不可发布的占位主题 */
  placeholder: boolean;
  palette: ThemePalette;
  /** appearanceId -> 贴图资源键。换皮时替换整张映射表 */
  appearanceKeys: Record<string, string>;
  /**
   * 贴图资源键 -> 图片地址。缺省时相关角色回退到几何图形绘制，
   * 所以没有美术资源也能跑。
   */
  sprites?: Record<string, { normal: string; hit?: string }>;
}

export const CHIIKAWA_PLACEHOLDER: ThemeDef = {
  id: 'chiikawaPlaceholder',
  name: 'Chiikawa 占位主题',
  placeholder: true,
  palette: {
    bg: '#1a1a22',
    arenaBorder: '#3a3a4a',
    player: '#ffd166',
    enemy: '#8ecae6',
    enemyFast: '#ffb4a2',
    enemyRanged: '#b8b8d1',
    boss: '#ef476f',
    xpOrb: '#06d6a0',
    material: '#ffd166',
    heal: '#f72585',
    text: '#f1faee',
    danger: '#ef476f',
  },
  appearanceKeys: {
    playerHachiware: 'player_hachiware',
    playerChiikawa: 'player_chiikawa',
    playerUsagi: 'player_usagi',
    enemyGrunt: 'enemy_grunt',
    enemyRunner: 'enemy_runner',
    enemyShooter: 'enemy_shooter',
    enemyBoss: 'enemy_boss',
  },
  sprites: CHARACTER_SPRITES,
};

export const ORIGINAL_SKIN: ThemeDef = {
  id: 'originalSkin',
  name: '原创皮肤（占位色板）',
  placeholder: false,
  palette: {
    bg: '#f4f1ea',
    arenaBorder: '#c9c2b4',
    player: '#2f6f4f',
    enemy: '#b5533f',
    enemyFast: '#d98a3d',
    enemyRanged: '#4a6fa5',
    boss: '#7d2f4f',
    xpOrb: '#4a9d6f',
    material: '#c9a227',
    heal: '#c0392b',
    text: '#2b2b2b',
    danger: '#c0392b',
  },
  appearanceKeys: {
    playerHachiware: 'skin_scout',
    playerChiikawa: 'skin_hero',
    playerUsagi: 'skin_bruiser',
    enemyGrunt: 'skin_foe_grunt',
    enemyRunner: 'skin_foe_runner',
    enemyShooter: 'skin_foe_shooter',
    enemyBoss: 'skin_foe_boss',
  },
};

export const THEMES: Record<string, ThemeDef> = {
  [CHIIKAWA_PLACEHOLDER.id]: CHIIKAWA_PLACEHOLDER,
  [ORIGINAL_SKIN.id]: ORIGINAL_SKIN,
};

export const DEFAULT_THEME_ID = CHIIKAWA_PLACEHOLDER.id;

/**
 * 按 id 取主题，缺失或不认识时回退默认主题。
 *
 * 上层一律通过它拿主题，不再直接 import 具体常量 ——
 * 否则「换皮只改数据」就只是说法，实际换不了。
 */
export function getTheme(id?: string | null): ThemeDef {
  const found = id ? THEMES[id] : undefined;
  const fallback = THEMES[DEFAULT_THEME_ID];
  return found ?? fallback ?? CHIIKAWA_PLACEHOLDER;
}

/** 已注册的全部主题 id，供调试与测试使用 */
export function themeIds(): string[] {
  return Object.keys(THEMES);
}
