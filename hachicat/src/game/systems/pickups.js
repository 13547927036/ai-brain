import { PICKUP_COLLECT_DIST, PICKUP_MAGNET_DELAY } from '../constants.js';
import { spawnSpark } from './effects.js';

const MAX_PICKUPS = 240;

export function addPickup(world, kind, x, y, value, rng) {
  if (world.pickups.length >= MAX_PICKUPS) world.pickups.shift();
  const rand = rng || Math.random;
  const a = rand() * Math.PI * 2;
  const s = 45 + rand() * 75;
  world.pickups.push({
    id: (world.nextId += 1),
    kind,
    x,
    y,
    vx: Math.cos(a) * s,
    vy: Math.sin(a) * s,
    value,
    age: 0,
    radius: kind === 'coin' ? 8 : 7,
  });
}

/** 掉落物：先散开，再被拾取范围吸过来。 */
export function stepPickups(world, dt) {
  const p = world.player;
  const list = world.pickups;
  const magnet = p.stats.pickup;

  for (let i = list.length - 1; i >= 0; i--) {
    const it = list[i];
    it.age += dt;

    const dx = p.x - it.x;
    const dy = p.y - it.y;
    const dist = Math.hypot(dx, dy) || 0.001;

    if (it.age > PICKUP_MAGNET_DELAY && dist < magnet && p.alive) {
      const pull = 280 + (1 - dist / magnet) * 620;
      it.vx += (dx / dist) * pull * dt * 8;
      it.vy += (dy / dist) * pull * dt * 8;
      const speed = Math.hypot(it.vx, it.vy);
      const maxSpeed = 900;
      if (speed > maxSpeed) {
        it.vx = (it.vx / speed) * maxSpeed;
        it.vy = (it.vy / speed) * maxSpeed;
      }
    } else {
      it.vx *= 1 - 4.5 * dt;
      it.vy *= 1 - 4.5 * dt;
    }

    it.x += it.vx * dt;
    it.y += it.vy * dt;
    it.x = Math.max(10, Math.min(world.arena.w - 10, it.x));
    it.y = Math.max(10, Math.min(world.arena.h - 10, it.y));

    if (dist < PICKUP_COLLECT_DIST && p.alive) {
      collect(world, it);
      list.splice(i, 1);
    }
  }
}

/** 波次结算时把地上剩下的掉落一次性收走，避免玩家吃亏。 */
export function collectAllPickups(world) {
  const p = world.player;
  for (const it of world.pickups) {
    if (it.kind === 'xp') {
      p.xp += it.value;
      world.stats.xpEarned += it.value;
    } else if (it.kind === 'coin') {
      p.money += it.value;
      world.stats.moneyEarned += it.value;
    }
  }
  world.pickups.length = 0;
}

function collect(world, it) {
  const p = world.player;
  if (it.kind === 'xp') {
    p.xp += it.value;
    world.stats.xpEarned += it.value;
    spawnSpark(world, it.x, it.y, 'xp', 2, 60);
  } else if (it.kind === 'coin') {
    p.money += it.value;
    world.stats.moneyEarned += it.value;
    spawnSpark(world, it.x, it.y, 'coin', 3, 80);
  }
}