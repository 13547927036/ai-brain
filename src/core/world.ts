import type { Quality, StatId } from '../content/types.js';
import { BASE_PLAYER } from '../content/stats.js';
import { Pool } from './pool.js';
import type { Rng } from './rng.js';

/** 池容量 = spec 4.6 同屏预算。池满时新对象被丢弃，不扩容。 */
export const POOL_CAPS = {
  enemies: 120,
  bullets: 200,
  pickups: 80,
  floaters: 24,
  particles: 200,
} as const;

/** 逻辑分辨率（spec 4.1：750 基准宽，竖屏） */
export const ARENA = { w: 750, h: 1334 } as const;

export interface Enemy {
  defId: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  radius: number;
  contact: boolean;
  /** 远程怪开火计时 */
  fireTimer: number;
  /** Boss 召唤小怪计时 */
  summonTimer: number;
  /** 受击闪白剩余时间 */
  hitFlash: number;
  /** 击退位移残留 */
  knockX: number;
  knockY: number;
  /** 是否参与"接触伤害"冷却 */
  touchTimer: number;
}

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  radius: number;
  /** 剩余可穿透次数 */
  pierce: number;
  /** true = 玩家发射，false = 敌人发射 */
  fromPlayer: boolean;
  life: number;
  /** 命中后是否产生范围伤害 */
  aoeRadius: number;
  /** 该弹丸发射时是否判定为暴击 */
  crit: boolean;
}

export type PickupKind = 'xp' | 'material' | 'heal';

export interface Pickup {
  kind: PickupKind;
  x: number;
  y: number;
  value: number;
  /** 超时自动吸附（spec 4.6） */
  life: number;
  magnet: boolean;
}

export interface Floater {
  x: number;
  y: number;
  vy: number;
  value: number;
  crit: boolean;
  life: number;
  maxLife: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  colorIndex: number;
}

export interface WeaponInstance {
  defId: string;
  quality: Quality;
  /** 剩余冷却，秒 */
  cooldown: number;
}

export interface Player {
  x: number;
  y: number;
  /** 归一化朝向（自动开火用） */
  facingX: number;
  facingY: number;
  hp: number;
  maxHp: number;
  level: number;
  xp: number;
  /** 已累加的主/副属性 */
  stats: Record<StatId, number>;
  weapons: WeaponInstance[];
  weaponSlots: number;
  materials: number;
  /** 材料与经验获取倍率（角色规则，小八 = 1.25） */
  materialXpMul: number;
  /** 属性获取倍率（角色规则，如吉伊卡哇幸运 x1.5） */
  statMul: Partial<Record<StatId, number>>;
  /** 待处理的升级三选一次数 */
  pendingLevelUps: number;
  /** 无敌帧剩余时间 */
  invuln: number;
  /** 移动输入（单位向量，来自摇杆） */
  inputX: number;
  inputY: number;
  alive: boolean;
}

export interface WaveState {
  /** 1 起算 */
  index: number;
  /** 本波剩余时间，秒 */
  timeLeft: number;
  /** 已生成敌人总数 */
  spawned: number;
  /** 本波计划生成总数 */
  total: number;
  /** 生成计时器 */
  spawnTimer: number;
  bossSpawned: boolean;
  /** 是否处于战斗阶段（false = 波间商店） */
  active: boolean;
}

export interface World {
  rng: Rng;
  /** 累计逻辑时间，秒 */
  time: number;
  /** 已执行的逻辑帧数 */
  frame: number;
  arena: { w: number; h: number };
  player: Player;
  enemies: Pool<Enemy>;
  bullets: Pool<Bullet>;
  pickups: Pool<Pickup>;
  floaters: Pool<Floater>;
  particles: Pool<Particle>;
  wave: WaveState;
  /** 本帧产生的表现事件（音效/顿帧等），每帧开头清空 */
  events: GameEvent[];
  /** 本局是否结束 */
  over: boolean;
  victory: boolean;
}

export type GameEvent =
  | { type: 'fire'; x: number; y: number; weaponId: string }
  | { type: 'hit'; x: number; y: number; crit: boolean }
  | { type: 'kill'; x: number; y: number; enemyId: string }
  | { type: 'hurt'; amount: number }
  | { type: 'dodge' }
  | { type: 'pickup'; kind: PickupKind }
  | { type: 'levelUp'; level: number }
  | { type: 'waveStart'; index: number }
  | { type: 'waveEnd'; index: number };

export function emptyStats(): Record<StatId, number> {
  return {
    maxHp: 0, regen: 0, meleeDamage: 0, rangedDamage: 0, attackSpeed: 0,
    critChance: 0, armor: 0, dodge: 0, moveSpeed: 0, luck: 0,
    pickupRange: 0, knockback: 0, luckDrop: 0,
  };
}

export interface CreateWorldOptions {
  rng: Rng;
  /** 起始武器 */
  startingWeaponId: string;
  weaponSlots: number;
  maxHp: number;
  /** 角色幸运倍率等已在外层折算完毕 */
  stats?: Partial<Record<StatId, number>>;
  /** 材料与经验获取倍率（小八 +25% -> 1.25） */
  materialXpMul?: number;
  /** 属性获取倍率（角色规则） */
  statMul?: Partial<Record<StatId, number>>;
}

export function createWorld(opts: CreateWorldOptions): World {
  const stats = emptyStats();
  if (opts.stats) {
    for (const [k, v] of Object.entries(opts.stats)) {
      if (typeof v === 'number') stats[k as StatId] = v;
    }
  }

  const player: Player = {
    x: ARENA.w / 2,
    y: ARENA.h / 2,
    facingX: 0,
    facingY: -1,
    hp: opts.maxHp,
    maxHp: opts.maxHp,
    level: 1,
    xp: 0,
    stats,
    weapons: [{ defId: opts.startingWeaponId, quality: 1, cooldown: 0 }],
    weaponSlots: opts.weaponSlots,
    materials: 0,
    materialXpMul: opts.materialXpMul ?? 1,
    statMul: opts.statMul ?? {},
    pendingLevelUps: 0,
    invuln: 0,
    inputX: 0,
    inputY: 0,
    alive: true,
  };

  return {
    rng: opts.rng,
    time: 0,
    frame: 0,
    arena: { w: ARENA.w, h: ARENA.h },
    player,
    enemies: new Pool<Enemy>(POOL_CAPS.enemies, () => ({
      defId: '', x: 0, y: 0, hp: 0, maxHp: 0, speed: 0, damage: 0, radius: 12,
      contact: true, fireTimer: 0, summonTimer: 0, hitFlash: 0,
      knockX: 0, knockY: 0, touchTimer: 0,
    })),
    bullets: new Pool<Bullet>(POOL_CAPS.bullets, () => ({
      x: 0, y: 0, vx: 0, vy: 0, damage: 0, radius: 6, pierce: 0,
      fromPlayer: true, life: 0, aoeRadius: 0, crit: false,
    })),
    pickups: new Pool<Pickup>(POOL_CAPS.pickups, () => ({
      kind: 'xp', x: 0, y: 0, value: 0, life: 0, magnet: false,
    })),
    floaters: new Pool<Floater>(POOL_CAPS.floaters, () => ({
      x: 0, y: 0, vy: 0, value: 0, crit: false, life: 0, maxLife: 0,
    })),
    particles: new Pool<Particle>(POOL_CAPS.particles, () => ({
      x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, size: 3, colorIndex: 0,
    })),
    wave: { index: 1, timeLeft: 0, spawned: 0, total: 0, spawnTimer: 0, bossSpawned: false, active: false },
    events: [],
    over: false,
    victory: false,
  };
}

/** 玩家基础生命（含角色生命倍率与等级成长） */
export function playerMaxHp(hpMul: number, level: number, statMaxHp: number): number {
  return Math.round(BASE_PLAYER.maxHp * hpMul) + (level - 1) + statMaxHp;
}
