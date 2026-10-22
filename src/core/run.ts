import { CHARACTER_BY_ID, slotsAfterWave } from '../content/characters.js';
import { BASE_PLAYER } from '../content/stats.js';
import type { CharacterDef, StatId } from '../content/types.js';
import { mulberry32 } from './rng.js';
import { generateShop, type Shop } from './shop.js';
import { FixedStepper, tick } from './tick.js';
import { applyUpgrade, rollUpgradeChoices, type UpgradeChoice } from './upgrade.js';
import { hasNextWave, startWave } from './wave.js';
import { WAVE_COUNT } from '../content/waves.js';
import { createWorld, type World } from './world.js';

export type RunPhase = 'battle' | 'levelUp' | 'shop' | 'victory' | 'defeat';

export interface Run {
  phase: RunPhase;
  world: World;
  character: CharacterDef;
  /** 本局种子，存档恢复时重建 RNG */
  seed: number;
  shop: Shop | null;
  /** 当前升级三选一的候选项 */
  choices: UpgradeChoice[];
  stepper: FixedStepper;
}

export const DEFAULT_WEAPON = 'club';

export interface CreateRunOptions {
  characterId: string;
  seed: number;
  startingWeaponId?: string;
}

export function createRun(opts: CreateRunOptions): Run {
  const character = CHARACTER_BY_ID[opts.characterId] ?? (CHARACTER_BY_ID.hachiware as CharacterDef);

  const statMul: Partial<Record<StatId, number>> = {};
  if (character.luckMul !== 1) statMul.luck = character.luckMul;
  if (character.attackSpeedMul !== 1) statMul.attackSpeed = character.attackSpeedMul;

  const maxHp = Math.round(BASE_PLAYER.maxHp * character.hpMul);

  const world = createWorld({
    rng: mulberry32(opts.seed),
    startingWeaponId: opts.startingWeaponId ?? DEFAULT_WEAPON,
    weaponSlots: slotsAfterWave(character, 1),
    maxHp,
    materialXpMul: character.materialXpMul,
    statMul,
  });

  return {
    phase: 'battle',
    world,
    character,
    seed: opts.seed,
    shop: null,
    choices: [],
    stepper: new FixedStepper(),
  };
}

export function beginWave(run: Run, waveIndex: number): void {
  startWave(run.world, waveIndex);
  run.phase = 'battle';
}

/** 推进一帧。只在 battle 阶段跑逻辑；返回本帧执行的逻辑步数。 */
export function advance(run: Run, frameDt: number): number {
  if (run.phase !== 'battle') return 0;

  const steps = run.stepper.step(run.world, frameDt);

  if (run.world.over) {
    run.phase = 'defeat';
    return steps;
  }
  if (!run.world.wave.active) {
    onWaveComplete(run);
  }
  return steps;
}

function onWaveComplete(run: Run): void {
  const w = run.world;
  const p = w.player;

  // 波末解锁武器槽（小八：第 5 波后 5 格、第 9 波后 6 格）
  p.weaponSlots = slotsAfterWave(run.character, w.wave.index);

  if (p.pendingLevelUps > 0) {
    run.phase = 'levelUp';
    run.choices = rollUpgradeChoices(w);
    return;
  }

  if (w.wave.index >= WAVE_COUNT) {
    w.victory = true;
    run.phase = 'victory';
    return;
  }

  run.phase = 'shop';
  run.shop = generateShop(w, w.wave.index + 1);
}

/** 玩家选择一项升级。返回是否还需要继续选。 */
export function chooseUpgrade(run: Run, index: number): boolean {
  const w = run.world;
  const choice = run.choices[index];
  if (!choice) return w.player.pendingLevelUps > 0;

  applyUpgrade(w, choice);
  if (w.player.pendingLevelUps > 0) w.player.pendingLevelUps--;

  if (w.player.pendingLevelUps > 0) {
    run.choices = rollUpgradeChoices(w);
    return true;
  }

  run.choices = [];
  if (w.wave.index >= WAVE_COUNT) {
    w.victory = true;
    run.phase = 'victory';
  } else {
    run.phase = 'shop';
    run.shop = generateShop(w, w.wave.index + 1);
  }
  return false;
}

/** 玩家点「开始下一波」 */
export function startNextWave(run: Run): boolean {
  const w = run.world;
  if (run.phase !== 'shop') return false;
  if (!hasNextWave(w)) {
    w.victory = true;
    run.phase = 'victory';
    return false;
  }
  run.shop = null;
  beginWave(run, w.wave.index + 1);
  return true;
}

/** 便于测试与 headless 工具：把当前战斗阶段直接跑完 */
export function runWaveToCompletion(run: Run, maxFrames = 40000): number {
  let frames = 0;
  while (run.phase === 'battle' && frames < maxFrames) {
    advance(run, 1 / 60);
    frames++;
  }
  return frames;
}

export { tick };
