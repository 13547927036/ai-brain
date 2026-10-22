import type { EnemyDef } from './types.js';

/**
 * 数值严格取自 spec 4.4。前三行是第 1 波基准值，随波次成长；
 * Boss 数值已按第 12 波直接给定，不再参与成长。
 */
export const ENEMIES: EnemyDef[] = [
  {
    id: 'grunt', name: '小怪', kind: 'grunt',
    hp: 10, speed: 60, damage: 3, radius: 14,
    contact: true, projectileSpeed: 0, keepDistance: 0, fireCooldown: 0,
    spawnMinionId: null, spawnMinionCount: 0, spawnMinionCooldown: 0,
  },
  {
    id: 'runner', name: '快速怪', kind: 'runner',
    hp: 6, speed: 100, damage: 2, radius: 11,
    contact: true, projectileSpeed: 0, keepDistance: 0, fireCooldown: 0,
    spawnMinionId: null, spawnMinionCount: 0, spawnMinionCooldown: 0,
  },
  {
    id: 'shooter', name: '远程怪', kind: 'shooter',
    hp: 14, speed: 45, damage: 4, radius: 13,
    contact: false, projectileSpeed: 180, keepDistance: 220, fireCooldown: 2.5,
    spawnMinionId: null, spawnMinionCount: 0, spawnMinionCooldown: 0,
  },
  {
    id: 'boss', name: 'Boss', kind: 'boss',
    hp: 3000, speed: 50, damage: 6, radius: 34,
    contact: true, projectileSpeed: 0, keepDistance: 0, fireCooldown: 0,
    spawnMinionId: 'grunt', spawnMinionCount: 3, spawnMinionCooldown: 5,
  },
];

export const ENEMY_BY_ID: Record<string, EnemyDef> = Object.fromEntries(ENEMIES.map((e) => [e.id, e]));

/** 每波成长（spec 4.4）：生命 +18%、伤害 +10%、移速 +2%；Boss 不成长 */
export const ENEMY_GROWTH = { hp: 0.18, damage: 0.10, speed: 0.02 } as const;

export interface ScaledEnemy {
  hp: number;
  damage: number;
  speed: number;
}

export function scaleEnemy(def: EnemyDef, wave: number): ScaledEnemy {
  if (def.kind === 'boss') {
    return { hp: def.hp, damage: def.damage, speed: def.speed };
  }
  const n = Math.max(0, wave - 1);
  return {
    hp: Math.round(def.hp * (1 + ENEMY_GROWTH.hp * n)),
    damage: def.damage * (1 + ENEMY_GROWTH.damage * n),
    speed: def.speed * (1 + ENEMY_GROWTH.speed * n),
  };
}

/** 第 12 波倍率自检：生命 2.98×、伤害 2.10×、移速 1.22×（spec 4.4） */
export const WAVE12_MULTIPLIER = {
  hp: 1 + ENEMY_GROWTH.hp * 11,
  damage: 1 + ENEMY_GROWTH.damage * 11,
  speed: 1 + ENEMY_GROWTH.speed * 11,
} as const;
