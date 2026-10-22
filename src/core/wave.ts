import { ENEMY_BY_ID, scaleEnemy } from '../content/enemies.js';
import { WAVE_COUNT, waveAt } from '../content/waves.js';
import { ARENA, type Enemy, type World } from './world.js';
import { collectPickup } from './systems/pickup.js';

/** 敌人在竞技场边缘内侧多少像素处生成 */
export const SPAWN_INSET = 40;

export function startWave(w: World, index: number): void {
  const def = waveAt(index);
  w.wave.index = def.index;
  w.wave.timeLeft = def.duration;
  w.wave.spawned = 0;
  w.wave.total = def.enemyCount;
  w.wave.spawnTimer = 0;
  w.wave.bossSpawned = false;
  w.wave.active = true;
  w.events.push({ type: 'waveStart', index: def.index });
}

export function pickEnemyKind(w: World, mix: { grunt: number; runner: number; shooter: number }): string {
  const total = mix.grunt + mix.runner + mix.shooter;
  if (total <= 0) return 'grunt';
  const r = w.rng.next() * total;
  if (r < mix.grunt) return 'grunt';
  if (r < mix.grunt + mix.runner) return 'runner';
  return 'shooter';
}

export function spawnEnemy(w: World, defId: string, waveIndex: number): Enemy | null {
  const def = ENEMY_BY_ID[defId];
  if (!def) return null;
  const e = w.enemies.spawn();
  if (!e) return null;

  const r = def.radius + SPAWN_INSET;
  const side = w.rng.int(0, 3);
  if (side === 0) {
    e.x = w.rng.range(r, ARENA.w - r);
    e.y = r;
  } else if (side === 1) {
    e.x = ARENA.w - r;
    e.y = w.rng.range(r, ARENA.h - r);
  } else if (side === 2) {
    e.x = w.rng.range(r, ARENA.w - r);
    e.y = ARENA.h - r;
  } else {
    e.x = r;
    e.y = w.rng.range(r, ARENA.h - r);
  }

  const s = scaleEnemy(def, def.kind === 'boss' ? 12 : waveIndex);
  e.defId = def.id;
  e.hp = s.hp;
  e.maxHp = s.hp;
  e.speed = s.speed;
  e.damage = s.damage;
  e.radius = def.radius;
  e.contact = def.contact;
  e.fireTimer = def.fireCooldown;
  e.summonTimer = def.spawnMinionCooldown;
  e.hitFlash = 0;
  e.knockX = 0;
  e.knockY = 0;
  e.touchTimer = 0;
  return e;
}

/** Boss 在波次过半时登场，其余敌人按 spawnRate 均匀投放 */
export function updateWave(w: World, dt: number): void {
  const wave = w.wave;
  if (!wave.active) return;
  const def = waveAt(wave.index);

  wave.timeLeft -= dt;
  wave.spawnTimer -= dt;

  if (def.boss && !wave.bossSpawned && wave.timeLeft <= def.duration * 0.5) {
    spawnEnemy(w, 'boss', 12);
    wave.bossSpawned = true;
  }

  if (wave.spawned < wave.total && wave.spawnTimer <= 0) {
    wave.spawnTimer = 1 / Math.max(0.01, def.spawnRate);
    if (spawnEnemy(w, pickEnemyKind(w, def.mix), wave.index)) wave.spawned++;
  }
}

export function allEnemiesSpawned(w: World): boolean {
  const def = waveAt(w.wave.index);
  if (def.boss && !w.wave.bossSpawned) return false;
  return w.wave.spawned >= w.wave.total;
}

/** 本波是否该结束：时间到 + 该生成的都生成了（第 12 波还要求 Boss 已死） */
export function isWaveOver(w: World): boolean {
  const wave = w.wave;
  if (!wave.active) return false;
  if (wave.timeLeft > 0) return false;
  if (!allEnemiesSpawned(w)) return false;
  const def = waveAt(wave.index);
  if (def.boss && w.enemies.length > 0) return false;
  return true;
}

/** 波末结算（spec 4.2）：剩余材料自动入袋 → 场上敌人清空 */
export function endWave(w: World): void {
  for (let i = w.pickups.length - 1; i >= 0; i--) {
    const k = w.pickups.items[i];
    if (k) collectPickup(w, k);
  }
  w.pickups.clear();
  w.enemies.clear();
  w.bullets.clear();
  w.wave.active = false;
  w.events.push({ type: 'waveEnd', index: w.wave.index });
}

/** 是否还有下一波 */
export function hasNextWave(w: World): boolean {
  return w.wave.index < WAVE_COUNT;
}
