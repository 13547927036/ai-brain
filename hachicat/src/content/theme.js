/**
 * 画风主题：只描述颜色与背景风格，不包含任何逻辑。
 * 要换画风时，新增一个主题 + assets.js 里的同名字段即可，
 * 战斗、武器数值、AI、升级、商店都不需要改。
 */
export const THEMES = {
  neon: {
    id: 'neon',
    name: '星夜集市',
    label: '默认',
    style: 'neon',
    colors: {
      bgTop: '#0d0b17',
      bgBottom: '#1a1528',
      floor: '#171322',
      floorLine: '#2a2339',
      floorGlow: '#4a3b5e',
      propA: '#3a2f4a',
      propB: '#514063',
      vignette: 'rgba(6, 4, 12, 0.55)',
      playerRim: '#ffd08a',
      enemyRim: '#ff8a9a',
      enemyBullet: '#ff9b7a',
      xp: '#9be3a0',
      coin: '#ffd166',
      hp: '#ff7d8f',
      hpBack: '#2a1620',
      danger: '#ff6b7a',
      accent: '#ffd08a',
      accent2: '#9be3c3',
      text: '#fbf3e8',
      shadow: 'rgba(0, 0, 0, 0.4)',
      ring: 'rgba(255, 208, 138, 0.2)',
    },
    fx: { hit: '#ffe6a7', crit: '#ffb703', heal: '#9be3a0', mote: '#c9b6d8' },
    backdrop: { kind: 'meadow', lamp: '#ffd08a', signs: ['#ff9fb8', '#9be3c3', '#ffd166'], rain: false },
    joystick: { base: 'rgba(255,255,255,0.08)', ring: 'rgba(255,255,255,0.22)', knob: '#fff3dc', knobEdge: '#ffd08a' },
    glow: true,
  },

  paper: {
    id: 'paper',
    name: '纸片日常',
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
    fx: { hit: '#b45309', crit: '#c2410c', heal: '#2f855a', mote: '#a98d63' },
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
