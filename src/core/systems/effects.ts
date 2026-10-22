import type { Floater, Particle, World } from '../world.js';

/** 飘字：上抛后轻微下落，纯视觉，不影响逻辑 */
export function updateFloaters(w: World, dt: number): void {
  for (let i = w.floaters.length - 1; i >= 0; i--) {
    const f = w.floaters.items[i] as Floater;
    f.life -= dt;
    f.y += f.vy * dt;
    f.vy += 60 * dt;
    if (f.life <= 0) w.floaters.remove(i);
  }
}

export function updateParticles(w: World, dt: number): void {
  for (let i = w.particles.length - 1; i >= 0; i--) {
    const p = w.particles.items[i] as Particle;
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.92;
    p.vy *= 0.92;
    if (p.life <= 0) w.particles.remove(i);
  }
}
