/**
 * 画风主题：只描述颜色与背景风格，不包含任何逻辑。
 * 要换画风时，新增一个主题 + assets.js 里的同名字段即可，
 * 战斗、武器数值、AI、升级、商店都不需要改。
 */
export const THEMES = {
  neon: {
    id: 'neon',
    name: '霓虹夜巷',
    label: '默认',
    style: 'neon',
    colors: {
      bgTop: '#080a14',
      bgBottom: '#141b30',
      floor: '#0d1220',
      floorLine: '#1b2540',
      floorGlow: '#2a3e68',
      propA: '#1a2338',
      propB: '#25324f',
      vignette: 'rgba(2, 4, 10, 0.72)',
      playerRim: '#7ce7ff',
      enemyRim: '#ff7a9c',
      enemyBullet: '#ff6b8a',
      xp: '#78e6a0',
      coin: '#ffce54',
      hp: '#ff5c7a',
      hpBack: '#2a1420',
      danger: '#ff3d63',
      accent: '#67e8f9',
      accent2: '#f9a826',
      text: '#e9efff',
      shadow: 'rgba(0, 0, 0, 0.45)',
      ring: 'rgba(103, 232, 249, 0.22)',
    },
    fx: { hit: '#ffe6a7', crit: '#ffb703', heal: '#7ee787', dust: '#8fa6d8' },
    backdrop: { kind: 'alley', lamp: '#67e8f9', signs: ['#ff5c7a', '#ffd166', '#67e8f9'], rain: true },
    joystick: { base: 'rgba(255,255,255,0.08)', ring: 'rgba(255,255,255,0.22)', knob: '#dff6ff', knobEdge: '#67e8f9' },
    glow: true,
  },

  paper: {
    id: 'paper',
    name: '纸片白日',
    label: '纸片',
    style: 'ink',
    colors: {
      bgTop: '#fdf6e8',
      bgBottom: '#f3e3c9',
      floor: '#f8ecd6',
      floorLine: '#e4d0ae',
      floorGlow: '#d9bd94',
      propA: '#e8d3ae',
      propB: '#dcc39a',
      vignette: 'rgba(92, 62, 32, 0.12)',
      playerRim: '#2f9e8f',
      enemyRim: '#c2452f',
      enemyBullet: '#d8432b',
      xp: '#3f8f5a',
      coin: '#c48a1c',
      hp: '#d94b3c',
      hpBack: '#e7cdb2',
      danger: '#b5382a',
      accent: '#2f7f74',
      accent2: '#d98032',
      text: '#2b2018',
      shadow: 'rgba(120, 86, 48, 0.25)',
      ring: 'rgba(47, 127, 116, 0.18)',
    },
    fx: { hit: '#b45309', crit: '#c2410c', heal: '#2f855a', dust: '#a98d63' },
    backdrop: { kind: 'paper', lamp: '#2f9e8f', signs: ['#c2452f', '#c48a1c', '#2f7f74'], rain: false },
    joystick: { base: 'rgba(80, 55, 30, 0.10)', ring: 'rgba(80, 55, 30, 0.26)', knob: '#fffaf0', knobEdge: '#c48a1c' },
    glow: false,
  },
};

export const THEME_LIST = Object.values(THEMES);
export const DEFAULT_THEME = 'neon';

export function getTheme(id) {
  return THEMES[id] || THEMES[DEFAULT_THEME];
}