export type Quality = 1 | 2 | 3 | 4;
export type WeaponKind = 'melee' | 'ranged' | 'elemental';
export type EnemyKind = 'grunt' | 'runner' | 'shooter' | 'boss';

export type StatId =
  | 'maxHp' | 'regen' | 'meleeDamage' | 'rangedDamage' | 'attackSpeed'
  | 'critChance' | 'armor' | 'dodge' | 'moveSpeed' | 'luck'
  | 'pickupRange' | 'knockback' | 'luckDrop';

export interface WeaponDef {
  id: string;
  name: string;
  kind: WeaponKind;
  damage: number;
  cooldown: number;
  range: number;
  shots: number;
  spreadDeg: number;
  pierce: number;
  hitRadius: number;
  arcDeg: number;
  maxHits: number;
  projectileSpeed: number;
  knockback: number;
  basePrice: number;
}

export interface EnemyDef {
  id: string;
  name: string;
  kind: EnemyKind;
  hp: number;
  speed: number;
  damage: number;
  radius: number;
  contact: boolean;
  projectileSpeed: number;
  keepDistance: number;
  fireCooldown: number;
  spawnMinionId: string | null;
  spawnMinionCount: number;
  spawnMinionCooldown: number;
}

export interface WaveDef {
  index: number;
  duration: number;
  enemyCount: number;
  spawnRate: number;
  mix: { grunt: number; runner: number; shooter: number };
  boss: boolean;
}

export interface CharacterDef {
  id: string;
  name: string;
  appearanceId: string;
  hpMul: number;
  luckMul: number;
  attackSpeedMul: number;
  armorLocked: boolean;
  materialXpMul: number;
  weaponSlots: number;
  /** 每项表示"该波结束后解锁 1 格" */
  slotUnlockWaves: number[];
}
