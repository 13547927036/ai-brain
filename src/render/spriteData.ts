import { mulberry32 } from '../core/rng.js';
import type { SpriteData } from './benchTypes.js';

export const ARENA_W = 750;
export const ARENA_H = 1334;

export function makeSprites(count: number, seed: number): SpriteData[] {
  const rng = mulberry32(seed);
  const sprites: SpriteData[] = [];
  for (let i = 0; i < count; i++) {
    const speed = rng.range(40, 160);
    const angle = rng.range(0, Math.PI * 2);
    sprites.push({
      x: rng.next(),
      y: rng.next(),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      cell: rng.int(0, 3),
      size: rng.range(32, 56),
    });
  }
  return sprites;
}

export function stepSprites(sprites: SpriteData[], dt: number): number {
  let bounces = 0;
  for (const s of sprites) {
    s.x += (s.vx * dt) / ARENA_W;
    s.y += (s.vy * dt) / ARENA_H;
    if (s.x < 0) { s.x = 0; s.vx = -s.vx; bounces++; }
    else if (s.x > 1) { s.x = 1; s.vx = -s.vx; bounces++; }
    if (s.y < 0) { s.y = 0; s.vy = -s.vy; bounces++; }
    else if (s.y > 1) { s.y = 1; s.vy = -s.vy; bounces++; }
  }
  return bounces;
}

export function makeAtlasCanvas(cell = 128): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = cell * 2;
  canvas.height = cell * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法获取 2d 上下文');
  const colors = ['#ffd166', '#06d6a0', '#ef476f', '#4cc9f0'];
  for (let i = 0; i < 4; i++) {
    const cx = (i % 2) * cell + cell / 2;
    const cy = Math.floor(i / 2) * cell + cell / 2;
    ctx.fillStyle = colors[i] as string;
    ctx.beginPath();
    ctx.arc(cx, cy, cell * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas;
}
