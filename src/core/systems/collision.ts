import { applyArmor, dodgeRate } from '../formulas.js';
import type { Bullet, Enemy, World } from '../world.js';
import { damageEnemy } from './damage.js';
import { PLAYER_RADIUS, TOUCH_DAMAGE_INTERVAL } from './movement.js';

/** 玩家受击后的无敌帧，秒 —— 防止被一群敌人同帧秒杀 */
export const PLAYER_INVULN = 0.3;
/** 弹丸飞出竞技场多远后销毁 */
export const BULLET_MARGIN = 60;

export function hurtPlayer(w: World, amount: number): boolean {
  const p = w.player;
  if (!p.alive) return false;
  if (p.invuln > 0) return false;

  if (w.rng.next() < dodgeRate(p.stats.dodge)) {
    w.events.push({ type: 'dodge' });
    p.invuln = PLAYER_INVULN;
    return false;
  }

  const dealt = applyArmor(amount, p.stats.armor);
  p.hp -= dealt;
  p.invuln = PLAYER_INVULN;
  w.events.push({ type: 'hurt', amount: dealt });

  if (p.hp <= 0) {
    p.hp = 0;
    p.alive = false;
    w.over = true;
  }
  return true;
}

/** 范围伤害：半径内所有敌人走同一套 damageEnemy（掉落/粒子/击退都不能漏） */
function aoeHit(w: World, b: Bullet, dirX: number, dirY: number): number {
  let applied = 0;
  for (let j = 0; j < w.enemies.length; j++) {
    const e = w.enemies.items[j] as Enemy;
    if (e.hp <= 0) continue;
    const dx = e.x - b.x;
    const dy = e.y - b.y;
    const rr = b.aoeRadius + e.radius;
    if (dx * dx + dy * dy > rr * rr) continue;
    damageEnemy(w, e, b.damage, b.crit, dirX, dirY, 0.5);
    applied++;
  }
  return applied;
}

/** 弹丸推进与命中。倒序遍历 + 末尾填补回收是安全的。 */
export function updateBullets(w: World, dt: number): void {
  for (let i = w.bullets.length - 1; i >= 0; i--) {
    const b = w.bullets.items[i] as Bullet;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;

    let dead = b.life <= 0
      || b.x < -BULLET_MARGIN || b.y < -BULLET_MARGIN
      || b.x > w.arena.w + BULLET_MARGIN || b.y > w.arena.h + BULLET_MARGIN;

    const speed = Math.hypot(b.vx, b.vy) || 1;
    const dirX = b.vx / speed;
    const dirY = b.vy / speed;

    if (!dead && b.fromPlayer) {
      for (let j = 0; j < w.enemies.length; j++) {
        const e = w.enemies.items[j] as Enemy;
        if (e.hp <= 0) continue;
        const dx = e.x - b.x;
        const dy = e.y - b.y;
        const rr = e.radius + b.radius;
        if (dx * dx + dy * dy > rr * rr) continue;

        if (b.aoeRadius > 0) {
          aoeHit(w, b, dirX, dirY);
          dead = true;
        } else {
          damageEnemy(w, e, b.damage, b.crit, dirX, dirY, 0.3);
          if (b.pierce > 0) b.pierce--;
          else dead = true;
        }
        break;
      }
    } else if (!dead) {
      const p = w.player;
      const dx = p.x - b.x;
      const dy = p.y - b.y;
      const rr = PLAYER_RADIUS + b.radius;
      if (dx * dx + dy * dy <= rr * rr) {
        hurtPlayer(w, b.damage);
        dead = true;
      }
    }

    if (dead) w.bullets.remove(i);
  }
}

/** 接触伤害：每个敌人有独立的触发间隔 */
export function handleContactDamage(w: World): void {
  const p = w.player;
  if (!p.alive) return;
  for (let i = 0; i < w.enemies.length; i++) {
    const e = w.enemies.items[i] as Enemy;
    if (!e.contact || e.hp <= 0) continue;
    if (e.touchTimer > 0) continue;
    const rr = e.radius + PLAYER_RADIUS;
    const dx = e.x - p.x;
    const dy = e.y - p.y;
    if (dx * dx + dy * dy > rr * rr) continue;
    e.touchTimer = TOUCH_DAMAGE_INTERVAL;
    hurtPlayer(w, e.damage);
  }
}

/** 回收本帧被打死的敌人。掉落与粒子已在 damageEnemy 里发过。 */
export function compactDeadEnemies(w: World): number {
  let removed = 0;
  for (let i = w.enemies.length - 1; i >= 0; i--) {
    const e = w.enemies.items[i] as Enemy;
    if (e.hp > 0) continue;
    w.enemies.remove(i);
    removed++;
  }
  return removed;
}
