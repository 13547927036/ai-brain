/**
 * 主题层：换皮只改这个文件 + 贴图资源。
 * 默认值是 Chiikawa 占位（仅本地验证用，不发布 —— 见 spec 6.2 合规边界）。
 */

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
};

export const THEMES: Record<string, ThemeDef> = {
  [CHIIKAWA_PLACEHOLDER.id]: CHIIKAWA_PLACEHOLDER,
};

export const DEFAULT_THEME_ID = CHIIKAWA_PLACEHOLDER.id;
