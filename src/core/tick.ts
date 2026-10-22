import type { World } from './world.js';
import { compactDeadEnemies, handleContactDamage, updateBullets } from './systems/collision.js';
import { updateFloaters, updateParticles } from './systems/effects.js';
import { keepDistanceOf, updateEnemyActions } from './systems/enemyAi.js';
import { updateWeapons } from './systems/firing.js';
import { moveEnemies, movePlayer } from './systems/movement.js';
import { updatePickups } from './systems/pickup.js';
import { endWave, isWaveOver, updateWave } from './wave.js';

/** 逻辑步长固定 60Hz，与渲染帧率解耦 */
export const LOGIC_DT = 1 / 60;
/** 单帧最多追赶多少个逻辑步，防止卡顿后的「死亡螺旋」 */
export const MAX_STEPS_PER_FRAME = 5;

/**
 * 单帧逻辑总装。顺序有意如此：
 * 移动 → 刷怪 → 敌人移动 → 开火 → 敌人行为 → 子弹 → 接触伤害 → 回收 → 拾取 → 特效。
 * 回收放在伤害之后，保证本帧被打死的敌人仍能参与本帧命中判定。
 */
export function tick(w: World, dt: number): void {
  w.events.length = 0;
  w.frame++;
  w.time += dt;

  const p = w.player;
  if (p.invuln > 0) p.invuln = Math.max(0, p.invuln - dt);

  movePlayer(w, dt);
  updateWave(w, dt);
  moveEnemies(w, dt, keepDistanceOf);
  updateWeapons(w, dt);
  updateEnemyActions(w, dt);
  updateBullets(w, dt);
  handleContactDamage(w);
  compactDeadEnemies(w);
  updatePickups(w, dt);
  updateFloaters(w, dt);
  updateParticles(w, dt);

  if (!p.alive) {
    w.over = true;
    return;
  }

  if (isWaveOver(w)) endWave(w);
}

/** 固定步长累加器：渲染帧可变，逻辑步恒定 */
export class FixedStepper {
  private acc = 0;

  step(w: World, frameDt: number): number {
    this.acc += Math.min(frameDt, 0.25);
    let steps = 0;
    while (this.acc >= LOGIC_DT && steps < MAX_STEPS_PER_FRAME) {
      tick(w, LOGIC_DT);
      this.acc -= LOGIC_DT;
      steps++;
      if (w.over) break;
    }
    if (steps >= MAX_STEPS_PER_FRAME) this.acc = 0;
    return steps;
  }

  reset(): void {
    this.acc = 0;
  }
}
