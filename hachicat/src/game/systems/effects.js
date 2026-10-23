import { MAX_EFFECTS } from '../constants.js';

/** 飘字：颜色用语义 key，由渲染层按当前主题解析，逻辑层不接触颜色。 */
export function spawnText(world, x, y, text, colorKey = 'text', opts = {}) {
  pushEffect(world, {
    kind: 'text',
    x,
    y,
    vy: opts.vy ?? -46,
    text,
    colorKey,
    size: opts.size ?? 15,
    life: opts.life ?? 0.72,
    crit: !!opts.crit,
  });
}

export function spawnSpark(world, x, y, colorKey, count = 6, speed = 150) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.35 + Math.random() * 0.8);
    pushEffect(world, {
      kind: 'spark',
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      size: 1.6 + Math.random() * 2.2,
      colorKey,
      life: 0.28 + Math.random() * 0.24,
    });
  }
}

export function spawnRing(world, x, y, radius, colorKey = 'accent', life = 0.36, width = 3) {
  pushEffect(world, { kind: 'ring', x, y, radius, colorKey, life, width });
}

export function spawnBeam(world, x1, y1, x2, y2, colorKey = 'accent', life = 0.14) {
  pushEffect(world, { kind: 'beam', x1, y1, x2, y2, colorKey, life });
}

export function spawnSlash(world, x, y, angle, radius, arc, colorKey = 'accent', life = 0.2) {
  pushEffect(world, { kind: 'slash', x, y, angle, radius, arc, colorKey, life });
}

export function spawnPuff(world, x, y, angle, radius, arc, colorKey = 'accent', life = 0.34) {
  pushEffect(world, { kind: 'puff', x, y, angle, radius, arc, colorKey, life });
}

export function spawnShock(world, x, y, radius, colorKey = 'accent') {
  pushEffect(world, { kind: 'shock', x, y, radius, colorKey, life: 0.4 });
}

function pushEffect(world, effect) {
  if (world.effects.length >= MAX_EFFECTS) world.effects.shift();
  effect.maxLife = effect.life;
  world.effects.push(effect);
}

export function stepEffects(world, dt) {
  const list = world.effects;
  for (let i = list.length - 1; i >= 0; i--) {
    const e = list[i];
    e.life -= dt;
    if (e.life <= 0) {
      list.splice(i, 1);
      continue;
    }
    if (e.kind === 'text') {
      e.y += e.vy * dt;
      e.vy += 42 * dt;
    } else if (e.kind === 'spark') {
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.vx *= 1 - 3.2 * dt;
      e.vy *= 1 - 3.2 * dt;
    }
  }
  if (world.shake > 0) world.shake = Math.max(0, world.shake - dt * 2.6);
}