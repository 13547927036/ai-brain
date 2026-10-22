import type { Quality, StatId } from '../content/types.js';
import { WAVE_COUNT } from '../content/waves.js';
import { beginWave, createRun, type Run } from './run.js';
import { generateShop } from './shop.js';
import type { KeyValueStore } from '../platform/types.js';
import { emptyStats } from './world.js';

/**
 * 存档。
 *
 * spec 要求两层：
 * - 局内快照：波末序列化，中途退出可续玩
 * - 局外记录：最佳记录、统计数据、设置
 *
 * 只保存「重建所需的最小信息」，不序列化 World 整体 ——
 * 池子里有对象引用、rng 是函数，直接 JSON 化既臃肿又脆弱。
 */

export const SAVE_VERSION = 1;
export const RUN_KEY = 'brotato.run.v1';
export const META_KEY = 'brotato.meta.v1';

export interface SavedWeapon {
  defId: string;
  quality: Quality;
}

export interface SavedPlayer {
  hp: number;
  maxHp: number;
  level: number;
  xp: number;
  materials: number;
  weaponSlots: number;
  pendingLevelUps: number;
  stats: Partial<Record<StatId, number>>;
  weapons: SavedWeapon[];
}

export interface RunSnapshot {
  version: number;
  characterId: string;
  /** 已完成的波次（续玩时从 waveIndex + 1 开始） */
  waveIndex: number;
  seed: number;
  savedAt: number;
  player: SavedPlayer;
}

export interface MetaRecord {
  version: number;
  /** 历史最远波次 */
  bestWave: number;
  runsPlayed: number;
  victories: number;
  totalKills: number;
  muted: boolean;
}

export function defaultMeta(): MetaRecord {
  return { version: SAVE_VERSION, bestWave: 0, runsPlayed: 0, victories: 0, totalKills: 0, muted: false };
}

export function snapshotRun(run: Run, kills: number, now = Date.now()): RunSnapshot {
  const p = run.world.player;
  const snapshot: RunSnapshot = {
    version: SAVE_VERSION,
    characterId: run.character.id,
    // 战斗中存档时，当前波尚未完成，恢复时应重打这一波的商店阶段
    waveIndex: run.world.wave.active ? run.world.wave.index - 1 : run.world.wave.index,
    seed: run.seed,
    savedAt: now,
    player: {
      hp: p.hp,
      maxHp: p.maxHp,
      level: p.level,
      xp: p.xp,
      materials: p.materials,
      weaponSlots: p.weaponSlots,
      pendingLevelUps: p.pendingLevelUps,
      stats: { ...p.stats },
      weapons: p.weapons.map((w) => ({ defId: w.defId, quality: w.quality })),
    },
  };
  void kills;
  return snapshot;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/** 严格校验：任何字段不对劲就整份作废，绝不用半成品存档去构造世界 */
export function parseSnapshot(raw: string | null): RunSnapshot | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;
  const d = data as Partial<RunSnapshot>;
  if (d.version !== SAVE_VERSION) return null;
  if (typeof d.characterId !== 'string' || !d.characterId) return null;
  if (!isFiniteNumber(d.waveIndex) || !Number.isInteger(d.waveIndex)) return null;
  if (d.waveIndex < 1 || d.waveIndex > WAVE_COUNT) return null;
  if (!isFiniteNumber(d.seed)) return null;
  const p = d.player;
  if (!p || typeof p !== 'object') return null;
  if (!isFiniteNumber(p.hp) || !isFiniteNumber(p.maxHp) || p.maxHp <= 0) return null;
  if (!isFiniteNumber(p.level) || p.level < 1) return null;
  if (!isFiniteNumber(p.xp) || !isFiniteNumber(p.materials)) return null;
  if (!isFiniteNumber(p.weaponSlots) || p.weaponSlots < 1) return null;
  if (!Array.isArray(p.weapons)) return null;
  if (!isFiniteNumber(p.pendingLevelUps)) return null;
  if (typeof p.stats !== 'object' || p.stats === null) return null;
  return d as RunSnapshot;
}

/** 从快照重建一局，直接停在商店阶段（存档点就是波末） */
export function restoreRun(snap: RunSnapshot): Run {
  const run = createRun({ characterId: snap.characterId, seed: snap.seed });
  const p = run.world.player;
  const s = snap.player;

  p.hp = Math.max(1, Math.min(s.maxHp, s.hp));
  p.maxHp = s.maxHp;
  p.level = s.level;
  p.xp = s.xp;
  p.materials = s.materials;
  p.weaponSlots = Math.max(1, s.weaponSlots);
  p.pendingLevelUps = Math.max(0, s.pendingLevelUps);

  const stats = emptyStats();
  for (const [k, v] of Object.entries(s.stats)) {
    if (isFiniteNumber(v)) stats[k as StatId] = v;
  }
  p.stats = stats;

  p.weapons = s.weapons
    .filter((w) => typeof w.defId === 'string' && w.defId)
    .slice(0, p.weaponSlots)
    .map((w) => ({ defId: w.defId, quality: w.quality, cooldown: 0 }));

  run.world.wave.index = snap.waveIndex;
  run.world.wave.active = false;

  if (snap.waveIndex >= WAVE_COUNT) {
    run.world.victory = true;
    run.phase = 'victory';
    return run;
  }

  run.phase = 'shop';
  run.shop = generateShop(run.world, snap.waveIndex + 1);
  return run;
}

export function saveRun(store: KeyValueStore, run: Run, kills = 0): void {
  try {
    const snapshot = snapshotRun(run, kills);
    // 第 1 波都还没打完，没有值得续的进度
    if (snapshot.waveIndex < 1) return;
    store.save(RUN_KEY, JSON.stringify(snapshot));
  } catch {
    /* 存储满 / 隐私模式：存档失败不应让游戏崩溃 */
  }
}

export function loadRun(store: KeyValueStore): RunSnapshot | null {
  try {
    return parseSnapshot(store.load(RUN_KEY));
  } catch {
    return null;
  }
}

export function clearRun(store: KeyValueStore): void {
  try {
    store.remove(RUN_KEY);
  } catch {
    /* ignore */
  }
}

export function parseMeta(raw: string | null): MetaRecord {
  const base = defaultMeta();
  if (!raw) return base;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return base;
  }
  if (typeof data !== 'object' || data === null) return base;
  const d = data as Partial<MetaRecord>;
  if (d.version !== SAVE_VERSION) return base;
  return {
    version: SAVE_VERSION,
    bestWave: isFiniteNumber(d.bestWave) ? d.bestWave : 0,
    runsPlayed: isFiniteNumber(d.runsPlayed) ? d.runsPlayed : 0,
    victories: isFiniteNumber(d.victories) ? d.victories : 0,
    totalKills: isFiniteNumber(d.totalKills) ? d.totalKills : 0,
    muted: d.muted === true,
  };
}

export function loadMeta(store: KeyValueStore): MetaRecord {
  try {
    return parseMeta(store.load(META_KEY));
  } catch {
    return defaultMeta();
  }
}

export function saveMeta(store: KeyValueStore, meta: MetaRecord): void {
  try {
    store.save(META_KEY, JSON.stringify(meta));
  } catch {
    /* ignore */
  }
}

/** 一局结束：更新最佳记录与统计，返回新记录 */
export function recordRunEnd(store: KeyValueStore, waveReached: number, victory: boolean, kills = 0): MetaRecord {
  const meta = loadMeta(store);
  const next: MetaRecord = {
    ...meta,
    bestWave: Math.max(meta.bestWave, waveReached),
    runsPlayed: meta.runsPlayed + 1,
    victories: meta.victories + (victory ? 1 : 0),
    totalKills: meta.totalKills + Math.max(0, Math.floor(kills)),
  };
  saveMeta(store, next);
  return next;
}

export { beginWave };
