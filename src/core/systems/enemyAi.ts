import { ENEMY_BY_ID } from '../../content/enemies.js';
import { spawnEnemy } from '../wave.js';
import type { Enemy, World } from '../world.js';

/** 远程怪的保持距离；近战怪返回 0（= 直接贴脸） */
export function keepDistanceOf(e: Enemy): number {
  return ENEMY_BY_ID[e.defId]?.keepDistance ?? 0;
}

/**
 * 敌人主动行为：远程怪开火、Boss 周期召唤小怪。
 * 用 e.damage（已按波次成长）而不是 def.damage，远程怪的弹丸才会随波次变强。
 */
export function updateEnemyActions(w: World, dt: number): void {
  const p = w.player;
  for (let i = 0; i < w.enemies.length; i++) {
    const e = w.enemies.items[i] as Enemy;
    if (e.hp <= 0) continue;
    const def = ENEMY_BY_ID[e.defId];
    if (!def) continue;

    if (def.kind === 'shooter' && def.projectileSpeed > 0) {
      e.fireTimer -= dt;
      if (e.fireTimer <= 0) {
        const dx = p.x - e.x;
        const dy = p.y - e.y;
        const len = Math.hypot(dx, dy) || 1;
        const b = w.bullets.spawn();
        if (b) {
          b.x = e.x;
          b.y = e.y;
          b.vx = (dx / len) * def.projectileSpeed;
          b.vy = (dy / len) * def.projectileSpeed;
          b.damage = e.damage;
          b.crit = false;
          b.radius = 8;
          b.pierce = 0;
          b.fromPlayer = false;
          b.life = 4;
          b.aoeRadius = 0;
        }
        e.fireTimer = def.fireCooldown;
      }
    }

    if (def.kind === 'boss' && def.spawnMinionId) {
      e.summonTimer -= dt;
      if (e.summonTimer <= 0) {
        for (let k = 0; k < def.spawnMinionCount; k++) {
          spawnEnemy(w, def.spawnMinionId, w.wave.index);
        }
        e.summonTimer = def.spawnMinionCooldown;
      }
    }
  }
}
