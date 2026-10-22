import { Canvas2DBackend } from './backends/canvas2d.js';
import { WebGLBackend } from './backends/webgl.js';
import type { AtlasSource, BenchBackend } from './benchTypes.js';
import { ARENA_H, ARENA_W, makeAtlasCanvas, makeSprites, stepSprites } from './spriteData.js';
import { FrameStats } from './stats.js';

const SPRITE_COUNT = 500;
const SEED = 20261022;
const WARMUP_FRAMES = 60;
const MEASURE_FRAMES = 600;

export interface BenchResult {
  backend: string;
  sprites: number;
  frames: number;
  avgFps: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
  drawCalls: number;
  supported: boolean;
  note: string;
}

function measure(backend: BenchBackend, atlas: AtlasSource): BenchResult {
  const sprites = makeSprites(SPRITE_COUNT, SEED);
  const stats = new FrameStats();
  let last = performance.now();
  let frame = 0;
  let drawCalls = 0;

  while (frame < WARMUP_FRAMES + MEASURE_FRAMES) {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    stepSprites(sprites, dt);

    backend.beginFrame();
    for (const s of sprites) {
      backend.drawSprite(atlas, s, s.x * ARENA_W, s.y * ARENA_H);
    }
    drawCalls = backend.endFrame();

    if (frame >= WARMUP_FRAMES) stats.push(performance.now() - now);
    frame++;
  }

  const s = stats.summary();
  return {
    backend: backend.name,
    sprites: SPRITE_COUNT,
    frames: s.frames,
    avgFps: Number(s.avgFps.toFixed(1)),
    avgMs: Number(s.avgMs.toFixed(3)),
    p50Ms: Number(s.p50Ms.toFixed(3)),
    p95Ms: Number(s.p95Ms.toFixed(3)),
    maxMs: Number(s.maxMs.toFixed(3)),
    drawCalls,
    supported: true,
    note: '',
  };
}

function run(canvas: HTMLCanvasElement, label: string, make: () => BenchBackend): BenchResult {
  let backend: BenchBackend | null = null;
  try {
    backend = make();
  } catch (err) {
    return {
      backend: label,
      sprites: SPRITE_COUNT,
      frames: 0,
      avgFps: 0,
      avgMs: 0,
      p50Ms: 0,
      p95Ms: 0,
      maxMs: 0,
      drawCalls: -1,
      supported: false,
      note: err instanceof Error ? err.message : String(err),
    };
  }
  const atlas: AtlasSource = { image: makeAtlasCanvas(128), cell: 128, cols: 2 };
  const result = measure(backend, atlas);
  backend.dispose();
  return result;
}

const canvas = document.getElementById('game') as HTMLCanvasElement | null;
if (!canvas) throw new Error('找不到 #game 画布');
canvas.width = ARENA_W;
canvas.height = ARENA_H;
canvas.style.width = `${ARENA_W}px`;
canvas.style.height = `${ARENA_H}px`;

const results: BenchResult[] = [
  run(canvas, 'Canvas2D', () => new Canvas2DBackend(canvas)),
  run(canvas, 'WebGL', () => { const c = document.createElement('canvas'); c.width = ARENA_W; c.height = ARENA_H; document.body.appendChild(c); return new WebGLBackend(c, SPRITE_COUNT); }),
];

console.log('=== 渲染基准结果（精灵数 %d，种子 %d）===', SPRITE_COUNT, SEED);
console.table(results);

const el = document.createElement('pre');
el.style.cssText = 'position:fixed;left:0;top:0;color:#eee;background:#000a;font:12px monospace;padding:8px;margin:0;z-index:9';
el.textContent = results
  .map((r) => r.supported
    ? `${r.backend}: ${r.avgFps} fps  p95 ${r.p95Ms}ms  drawcall ${r.drawCalls}`
    : `${r.backend}: 不可用 (${r.note})`)
  .join('\n');
document.body.appendChild(el);
