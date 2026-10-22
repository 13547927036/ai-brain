import type { StatId } from './types.js';

export interface StatDef {
  id: StatId;
  name: string;
  kind: 'main' | 'sub';
  suffix: string;
}

export const STAT_DEFS: StatDef[] = [
  { id: 'maxHp', name: '最大生命', kind: 'main', suffix: '' },
  { id: 'regen', name: '生命回复', kind: 'main', suffix: '/3s' },
  { id: 'meleeDamage', name: '近战伤害', kind: 'main', suffix: '' },
  { id: 'rangedDamage', name: '远程伤害', kind: 'main', suffix: '' },
  { id: 'attackSpeed', name: '攻速', kind: 'main', suffix: '%' },
  { id: 'critChance', name: '暴击率', kind: 'main', suffix: '%' },
  { id: 'armor', name: '护甲', kind: 'main', suffix: '' },
  { id: 'dodge', name: '闪避', kind: 'main', suffix: '' },
  { id: 'moveSpeed', name: '移动速度', kind: 'main', suffix: '%' },
  { id: 'luck', name: '幸运', kind: 'main', suffix: '' },
  { id: 'pickupRange', name: '拾取范围', kind: 'sub', suffix: 'px' },
  { id: 'knockback', name: '击退强度', kind: 'sub', suffix: '' },
  { id: 'luckDrop', name: '幸运掉落', kind: 'sub', suffix: '%' },
];

export const MAIN_STAT_IDS: StatId[] = STAT_DEFS.filter((s) => s.kind === 'main').map((s) => s.id);
export const SUB_STAT_IDS: StatId[] = STAT_DEFS.filter((s) => s.kind === 'sub').map((s) => s.id);

export const BASE_PLAYER = {
  maxHp: 60,
  regen: 0,
  meleeDamage: 0,
  rangedDamage: 0,
  attackSpeed: 0,
  critChance: 3,
  armor: 0,
  dodge: 0,
  moveSpeed: 0,
  luck: 0,
  pickupRange: 60,
  knockback: 0,
  luckDrop: 0,
  baseSpeed: 180,
} as const;

export const STAT_CAPS = {
  armor: 30,
  dodgeRate: 0.6,
  attacksPerSecond: 12,
} as const;
