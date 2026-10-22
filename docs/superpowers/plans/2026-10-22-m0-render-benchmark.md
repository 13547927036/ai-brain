# M0 实施计划：零依赖工具链与 500 精灵渲染基准

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭起零依赖的原生 TypeScript 工程，并用同一套精灵数据分别跑 Canvas 2D 与 WebGL 两个后端，产出 500 精灵的实测帧率与 drawcall 数据，据此定下渲染后端。

**Architecture:** 本计划只建立工程骨架与 `render/` 这一层，不碰玩法逻辑。精灵数据、帧统计、报告输出三者与渲染后端解耦：两个后端实现同一个 `BenchBackend` 接口，由同一段驱动代码喂同样的数据，保证对比公平。

**Tech Stack:** Node.js 24、TypeScript 7（唯一 devDependency，另加 `@types/node`）、Node 内置 `node --test` 测试运行器、Node 内置 `node:http` 静态服务器、Canvas 2D 与 WebGL 双后端。**不使用 Vite / Vitest / ESLint / 任何打包器。**

---

## 为什么是零依赖工具链

| 常规选择 | 本计划的选择 | 理由 |
|---|---|---|
| Vitest | `node --test`（Node 24 内置） | 少一个依赖、少一套配置；本项目的 `core/` 是纯函数，内置运行器完全够用 |
| Vite | `tools/dev-server.mjs`（约 30 行 `node:http`） | 只需静态托管 + 手动刷新，原型阶段不需要 HMR |
| ESLint + typescript-eslint | `tools/check-boundaries.mjs`（约 30 行正则扫描） | 要的是"`core/` 不许 import `render/`/`platform/`"这一条**强制规则**，不是一整套 lint。自写脚本零依赖、可在 CI 与提交前直接跑 |
| 打包器 | `tsc` 直接输出 ESM 到 `dist/` | 源码 import 写 `.js` 后缀，`module: nodenext` 下 TS 解析到 `.ts`，产出的 `.js` 直接被 Node 与浏览器加载，无需打包 |

依赖总数：**2 个**（`typescript`、`@types/node`），且只用于编译与类型，不进运行时。

**已实测的环境事实**（本机，勿凭记忆假设）：

- npm registry 已配置为 `https://registry.npmmirror.com`，实测 1.7 秒可达
- 镜像上 `typescript` 最新为 `7.0.2`，`@types/node` 存在
- Node 为 `v24.14.1`，npm 为 `11.11.0`
- Github 直连不可达，本计划的提交都做在**本地仓库**

---

## 文件结构

| 文件 | 职责 |
|---|---|
| `package.json` | 脚本与两个 devDependency |
| `tsconfig.json` | `module: nodenext` + 严格模式，输出 ESM 到 `dist/` |
| `index.html` | 浏览器入口，加载 `/dist/app/main.js` |
| `.gitignore` | 忽略 `node_modules/`、`dist/` |
| `tools/dev-server.mjs` | 静态服务器，端口 5180 |
| `tools/check-boundaries.mjs` | 强制 `src/core/**` 的依赖边界 |
| `src/core/types.ts` | `Vec2` / `Size` 与向量工具 |
| `src/core/rng.ts` | 确定性随机（mulberry32） |
| `src/core/types.test.ts` | 向量工具与 RNG 的单元测试 |
| `src/render/benchTypes.ts` | `BenchBackend` 接口与 `SpriteData` 定义 |
| `src/render/spriteData.ts` | 生成 500 个精灵的运动数据与程序化图集 |
| `src/render/stats.ts` | 帧时间采样与百分位统计 |
| `src/render/backends/canvas2d.ts` | Canvas 2D 后端 |
| `src/render/backends/webgl.ts` | WebGL 批处理后端 |
| `src/render/bench.ts` | 驱动两个后端、输出报告 |
| `docs/superpowers/plans/m0-result.md` | 实测结果与后端决策记录 |

---

### Task 0: 零依赖工程骨架

**Files:**
- Create: `package.json`, `tsconfig.json`, `index.html`, `.gitignore`, `tools/dev-server.mjs`, `tools/check-boundaries.mjs`

- [ ] **Step 1: 创建 `package.json`**

```json
{
  "name": "brotato-like-minigame",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "watch": "tsc --watch --preserveWatchOutput",
    "serve": "node tools/dev-server.mjs",
    "test": "tsc && node --test dist",
    "check:boundaries": "node tools/check-boundaries.mjs",
    "bench": "tsc && node dist/render/bench.js"
  },
  "devDependencies": {
    "typescript": "^7.0.2",
    "@types/node": "^24.0.0"
  }
}
```

- [ ] **Step 2: 创建 `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "rootDir": "src",
    "outDir": "dist",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "verbatimModuleSyntax": true,
    "sourceMap": true,
    "skipLibCheck": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  },
  "include": ["src"]
}
```

- [ ] **Step 3: 创建 `.gitignore`**

```
node_modules/
dist/
*.log
```

- [ ] **Step 4: 创建 `index.html`**

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
  <title>Brotato-like prototype</title>
  <style>
    html, body { margin: 0; height: 100%; background: #111; overflow: hidden; }
    canvas { display: block; touch-action: none; }
  </style>
</head>
<body>
  <canvas id="game"></canvas>
  <script type="module" src="/dist/app/main.js"></script>
</body>
</html>
```

- [ ] **Step 5: 创建 `tools/dev-server.mjs`**

```js
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = process.cwd();
const PORT = Number(process.env.PORT ?? 5180);
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
};

createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0] ?? '/');
    const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
    const target = normalize(join(ROOT, rel));
    if (!target.startsWith(ROOT)) {
      res.writeHead(403).end('forbidden');
      return;
    }
    const body = await readFile(target);
    res.writeHead(200, {
      'content-type': MIME[extname(target)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('not found');
  }
}).listen(PORT, () => console.log(`dev server: http://127.0.0.1:${PORT}/`));
```

- [ ] **Step 6: 创建 `tools/check-boundaries.mjs`**

```js
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const CORE = join(ROOT, 'src', 'core');
const RULES = [
  { name: 'core 不得依赖 render', re: /from\s+['"][^'"]*\/render\// },
  { name: 'core 不得依赖 platform', re: /from\s+['"][^'"]*\/platform\// },
  { name: 'core 不得依赖 app', re: /from\s+['"][^'"]*\/app\// },
  { name: 'core 不得依赖 ui', re: /from\s+['"][^'"]*\/ui\// },
];

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.name.endsWith('.ts')) yield full;
  }
}

let violations = 0;
for await (const file of walk(CORE)) {
  const src = await readFile(file, 'utf8');
  for (const rule of RULES) {
    if (rule.re.test(src)) {
      console.error(`[boundary] ${relative(ROOT, file)} -> ${rule.name}`);
      violations++;
    }
  }
}
if (violations > 0) {
  console.error(`\n边界检查失败：${violations} 处违规`);
  process.exit(1);
}
console.log('边界检查通过');
```

- [ ] **Step 7: 安装依赖**

Run: `npm install`
Expected: 安装成功，`node_modules/typescript` 与 `node_modules/@types/node` 存在

- [ ] **Step 8: 验证编译器可用**

Run: `npx tsc --version`
Expected: 输出版本号。**若输出 `This is not the tsc command you are looking for`，说明 `typescript` 未装上，回到 Step 7 排查，不要继续。**
**若 TypeScript 7 在本项目上报未知编译错误，回退方案**：把 `package.json` 里的 `typescript` 改为 `^5.7.2`，重装后重跑 Step 8。

- [ ] **Step 9: 验证边界检查能抓到违规**

先临时制造一个违规文件：

```bash
printf "import type {} from '../render/benchTypes.js';\n" > src/core/__violation.ts
npm run check:boundaries
```

Expected: 退出码 1，输出 `[boundary] src/core/__violation.ts -> core 不得依赖 render`

确认后删除该文件：

```bash
rm src/core/__violation.ts
npm run check:boundaries
```

Expected: 退出码 0，输出 `边界检查通过`

- [ ] **Step 10: 提交**

```bash
git add package.json tsconfig.json index.html .gitignore tools/
git commit -m "chore: 搭建零依赖 TypeScript 工程骨架与依赖边界检查"
```

---

### Task 1: 基础类型与确定性随机

**Files:**
- Create: `src/core/types.ts`, `src/core/rng.ts`, `src/core/types.test.ts`

- [ ] **Step 1: 写失败的测试**

`src/core/types.test.ts`：

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { vec, length, distSq, clamp } from './types.js';
import { mulberry32 } from './rng.js';

test('vec 默认归零，length 与 distSq 正确', () => {
  assert.deepEqual(vec(), { x: 0, y: 0 });
  assert.equal(length(vec(3, 4)), 5);
  assert.equal(distSq(vec(0, 0), vec(3, 4)), 25);
});

test('clamp 夹紧到区间', () => {
  assert.equal(clamp(-5, 0, 10), 0);
  assert.equal(clamp(15, 0, 10), 10);
  assert.equal(clamp(5, 0, 10), 5);
});

test('mulberry32 同种子产出完全相同的序列', () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  const seqA = [a.next(), a.next(), a.next(), a.next()];
  const seqB = [b.next(), b.next(), b.next(), b.next()];
  assert.deepEqual(seqA, seqB);
});

test('mulberry32 不同种子产出不同序列', () => {
  const a = mulberry32(1);
  const b = mulberry32(2);
  assert.notEqual(a.next(), b.next());
});

test('mulberry32 输出落在 [0,1)', () => {
  const r = mulberry32(7);
  for (let i = 0; i < 2000; i++) {
    const v = r.next();
    assert.ok(v >= 0 && v < 1, `越界: ${v}`);
  }
});

test('range 与 int 落在闭区间内', () => {
  const r = mulberry32(99);
  for (let i = 0; i < 500; i++) {
    const f = r.range(2, 5);
    assert.ok(f >= 2 && f < 5, `range 越界: ${f}`);
    const n = r.int(1, 3);
    assert.ok(Number.isInteger(n) && n >= 1 && n <= 3, `int 越界: ${n}`);
  }
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test`
Expected: 编译失败，报找不到模块 `./types.js` 与 `./rng.js`

- [ ] **Step 3: 实现 `src/core/types.ts`**

```ts
export interface Vec2 {
  x: number;
  y: number;
}

export interface Size {
  w: number;
  h: number;
}

export function vec(x = 0, y = 0): Vec2 {
  return { x, y };
}

export function setVec(out: Vec2, x: number, y: number): Vec2 {
  out.x = x;
  out.y = y;
  return out;
}

export function length(a: Vec2): number {
  return Math.hypot(a.x, a.y);
}

export function distSq(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function clamp(value: number, lo: number, hi: number): number {
  if (value < lo) return lo;
  if (value > hi) return hi;
  return value;
}
```

- [ ] **Step 4: 实现 `src/core/rng.ts`**

```ts
export interface Rng {
  next(): number;
  range(lo: number, hi: number): number;
  int(lo: number, hi: number): number;
  pick<T>(items: readonly T[]): T;
}

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;

  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const range = (lo: number, hi: number): number => lo + next() * (hi - lo);

  const int = (lo: number, hi: number): number => Math.floor(range(lo, hi + 1 - Number.EPSILON));

  const pick = <T,>(items: readonly T[]): T => {
    if (items.length === 0) throw new Error('pick 收到空数组');
    const idx = Math.floor(next() * items.length);
    return items[Math.min(idx, items.length - 1)] as T;
  };

  return { next, range, int, pick };
}
```

- [ ] **Step 5: 运行测试确认通过**

Run: `npm test`
Expected: `# pass 6`，`# fail 0`

- [ ] **Step 6: 提交**

```bash
git add src/core/types.ts src/core/rng.ts src/core/types.test.ts
git commit -m "feat: 新增基础向量类型与确定性随机数发生器"
```

---

### Task 2: 基准数据与帧统计

**Files:**
- Create: `src/render/benchTypes.ts`, `src/render/spriteData.ts`, `src/render/stats.ts`, `src/render/stats.test.ts`

- [ ] **Step 1: 写失败的测试**

`src/render/stats.test.ts`：

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { FrameStats } from './stats.js';

test('样本不足时汇总返回空值标记', () => {
  const s = new FrameStats();
  const r = s.summary();
  assert.equal(r.frames, 0);
  assert.equal(r.avgFps, 0);
});

test('帧时间换算 FPS 正确', () => {
  const s = new FrameStats();
  for (let i = 0; i < 100; i++) s.push(16.6667);
  const r = s.summary();
  assert.equal(r.frames, 100);
  assert.ok(Math.abs(r.avgFps - 60) < 0.1, `avgFps=${r.avgFps}`);
  assert.ok(Math.abs(r.p95Ms - 16.6667) < 0.001);
  assert.ok(Math.abs(r.maxMs - 16.6667) < 0.001);
});

test('p95 取到接近最大值的位置', () => {
  const s = new FrameStats();
  for (let i = 0; i < 95; i++) s.push(10);
  for (let i = 0; i < 5; i++) s.push(50);
  const r = s.summary();
  assert.equal(r.p95Ms, 50);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test`
Expected: 编译失败，报找不到模块 `./stats.js`

- [ ] **Step 3: 实现 `src/render/stats.ts`**

```ts
export interface StatsSummary {
  frames: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
  avgFps: number;
}

export class FrameStats {
  private readonly samples: number[] = [];

  push(frameMs: number): void {
    this.samples.push(frameMs);
  }

  reset(): void {
    this.samples.length = 0;
  }

  summary(): StatsSummary {
    const n = this.samples.length;
    if (n === 0) {
      return { frames: 0, avgMs: 0, p50Ms: 0, p95Ms: 0, maxMs: 0, avgFps: 0 };
    }
    const sorted = [...this.samples].sort((a, b) => a - b);
    const at = (q: number): number => {
      const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1));
      return sorted[idx] as number;
    };
    let total = 0;
    for (const v of sorted) total += v;
    const avgMs = total / n;
    return {
      frames: n,
      avgMs,
      p50Ms: at(0.5),
      p95Ms: at(0.95),
      maxMs: sorted[sorted.length - 1] as number,
      avgFps: avgMs > 0 ? 1000 / avgMs : 0,
    };
  }
}
```

- [ ] **Step 4: 实现 `src/render/benchTypes.ts`**

```ts
export interface SpriteData {
  /** 归一化初始位置，取值 [0,1) */
  x: number;
  y: number;
  /** 速度，单位 px/s（基于 750 逻辑宽） */
  vx: number;
  vy: number;
  /** 图集格子索引 0..3 */
  cell: number;
  /** 绘制边长（逻辑 px） */
  size: number;
}

export interface AtlasSource {
  /** 图集位图，浏览器里是 HTMLCanvasElement / ImageBitmap */
  image: CanvasImageSource;
  /** 格子边长（px） */
  cell: number;
  /** 每行格子数 */
  cols: number;
}

export interface BenchBackend {
  readonly name: string;
  /** 每帧开始前调用，返回本帧 drawcall 数（不适用时为 -1） */
  beginFrame(): void;
  drawSprite(atlas: AtlasSource, sprite: SpriteData, px: number, py: number): void;
  endFrame(): number;
  dispose(): void;
}
```

- [ ] **Step 5: 实现 `src/render/spriteData.ts`**

```ts
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

/** 把精灵按 dt 推进，并在竞技场边界内反弹，返回是否发生了反弹（用于验证逻辑） */
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

/** 程序化生成 2x2 图集（4 个圆形），256x256，不需要任何美术资源 */
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
```

- [ ] **Step 6: 运行测试确认通过**

Run: `npm test`
Expected: `# pass 9`，`# fail 0`

- [ ] **Step 7: 提交**

```bash
git add src/render/benchTypes.ts src/render/spriteData.ts src/render/stats.ts src/render/stats.test.ts
git commit -m "feat: 新增基准精灵数据、图集生成与帧统计"
```

---

### Task 3: Canvas 2D 后端

**Files:**
- Create: `src/render/backends/canvas2d.ts`

- [ ] **Step 1: 实现 `src/render/backends/canvas2d.ts`**

```ts
import type { AtlasSource, BenchBackend, SpriteData } from '../benchTypes.js';

export class Canvas2DBackend implements BenchBackend {
  readonly name = 'Canvas2D';
  private readonly ctx: CanvasRenderingContext2D;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('无法获取 2d 上下文');
    this.ctx = ctx;
  }

  beginFrame(): void {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.fillStyle = '#101014';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawSprite(atlas: AtlasSource, sprite: SpriteData, px: number, py: number): void {
    const sx = (sprite.cell % atlas.cols) * atlas.cell;
    const sy = Math.floor(sprite.cell / atlas.cols) * atlas.cell;
    const half = sprite.size / 2;
    this.ctx.drawImage(
      atlas.image,
      sx, sy, atlas.cell, atlas.cell,
      px - half, py - half, sprite.size, sprite.size,
    );
  }

  endFrame(): number {
    return -1;
  }

  dispose(): void {
    // Canvas 2D 无需释放资源
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add src/render/backends/canvas2d.ts
git commit -m "feat: 新增 Canvas2D 基准渲染后端"
```

---

### Task 4: WebGL 批处理后端

**Files:**
- Create: `src/render/backends/webgl.ts`

- [ ] **Step 1: 实现 `src/render/backends/webgl.ts`**

```ts
import type { AtlasSource, BenchBackend, SpriteData } from '../benchTypes.js';

const VERT = `
attribute vec2 a_pos;
attribute vec2 a_uv;
uniform vec2 u_res;
varying vec2 v_uv;
void main() {
  vec2 clip = (a_pos / u_res) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  v_uv = a_uv;
}`;

const FRAG = `
precision mediump float;
uniform sampler2D u_tex;
varying vec2 v_uv;
void main() {
  gl_FragColor = texture2D(u_tex, v_uv);
}`;

/** 每个精灵 6 个顶点，每顶点 4 个 float（x, y, u, v） */
const FLOATS_PER_VERTEX = 4;
const VERTICES_PER_SPRITE = 6;

export class WebGLBackend implements BenchBackend {
  readonly name = 'WebGL';
  private readonly gl: WebGLRenderingContext;
  private readonly program: WebGLProgram;
  private readonly buffer: WebGLBuffer;
  private readonly texture: WebGLTexture;
  private readonly aPos: number;
  private readonly aUv: number;
  private readonly uRes: WebGLUniformLocation;
  private readonly uTex: WebGLUniformLocation;
  private readonly data: Float32Array;
  private cursor = 0;
  private atlas: AtlasSource | null = null;

  constructor(private readonly canvas: HTMLCanvasElement, maxSprites: number) {
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: false });
    if (!gl) throw new Error('无法获取 webgl 上下文');
    this.gl = gl;

    this.program = this.compile(VERT, FRAG);
    this.aPos = gl.getAttribLocation(this.program, 'a_pos');
    this.aUv = gl.getAttribLocation(this.program, 'a_uv');
    this.uRes = gl.getUniformLocation(this.program, 'u_res') as WebGLUniformLocation;
    this.uTex = gl.getUniformLocation(this.program, 'u_tex') as WebGLUniformLocation;

    const buffer = gl.createBuffer();
    if (!buffer) throw new Error('无法创建顶点缓冲');
    this.buffer = buffer;
    this.data = new Float32Array(maxSprites * VERTICES_PER_SPRITE * FLOATS_PER_VERTEX);

    const texture = gl.createTexture();
    if (!texture) throw new Error('无法创建纹理');
    this.texture = texture;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  private compile(vs: string, fs: string): WebGLProgram {
    const gl = this.gl;
    const make = (type: number, src: string): WebGLShader => {
      const sh = gl.createShader(type);
      if (!sh) throw new Error('无法创建 shader');
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        throw new Error(`shader 编译失败: ${gl.getShaderInfoLog(sh) ?? ''}`);
      }
      return sh;
    };
    const program = gl.createProgram();
    if (!program) throw new Error('无法创建 program');
    gl.attachShader(program, make(gl.VERTEX_SHADER, vs));
    gl.attachShader(program, make(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`program 链接失败: ${gl.getProgramInfoLog(program) ?? ''}`);
    }
    return program;
  }

  beginFrame(): void {
    const gl = this.gl;
    this.cursor = 0;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0.063, 0.063, 0.078, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (this.atlas) {
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.atlas.image as TexImageSource);
    }
  }

  drawSprite(atlas: AtlasSource, sprite: SpriteData, px: number, py: number): void {
    this.atlas = atlas;
    const half = sprite.size / 2;
    const x0 = px - half;
    const y0 = py - half;
    const x1 = px + half;
    const y1 = py + half;
    const u0 = ((sprite.cell % atlas.cols) * atlas.cell) / (atlas.cols * atlas.cell);
    const v0 = Math.floor(sprite.cell / atlas.cols) / atlas.cols;
    const u1 = u0 + 1 / atlas.cols;
    const v1 = v0 + 1 / atlas.cols;

    const d = this.data;
    let o = this.cursor;
    const put = (x: number, y: number, u: number, v: number): void => {
      d[o++] = x; d[o++] = y; d[o++] = u; d[o++] = v;
    };
    put(x0, y0, u0, v0);
    put(x1, y0, u1, v0);
    put(x1, y1, u1, v1);
    put(x0, y0, u0, v0);
    put(x1, y1, u1, v1);
    put(x0, y1, u0, v1);
    this.cursor = o;
  }

  endFrame(): number {
    const gl = this.gl;
    if (this.cursor === 0) return 0;
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.data.subarray(0, this.cursor), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(this.aPos);
    gl.vertexAttribPointer(this.aPos, 2, gl.FLOAT, false, FLOATS_PER_VERTEX * 4, 0);
    gl.enableVertexAttribArray(this.aUv);
    gl.vertexAttribPointer(this.aUv, 2, gl.FLOAT, false, FLOATS_PER_VERTEX * 4, 2 * 4);
    gl.uniform2f(this.uRes, this.canvas.width, this.canvas.height);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(this.uTex, 0);
    gl.drawArrays(gl.TRIANGLES, 0, this.cursor / FLOATS_PER_VERTEX);
    return 1;
  }

  dispose(): void {
    const gl = this.gl;
    gl.deleteBuffer(this.buffer);
    gl.deleteTexture(this.texture);
    gl.deleteProgram(this.program);
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add src/render/backends/webgl.ts
git commit -m "feat: 新增 WebGL 批处理基准渲染后端"
```

---

### Task 5: 基准驱动与报告输出

**Files:**
- Create: `src/render/bench.ts`

- [ ] **Step 1: 实现 `src/render/bench.ts`**

```ts
import { Canvas2DBackend } from './backends/canvas2d.js';
import { WebGLBackend } from './backends/webgl.js';
import type { AtlasSource, BenchBackend } from './benchTypes.js';
import { ARENA_H, ARENA_W, makeAtlasCanvas, makeSprites, stepSprites } from './spriteData.js';
import { FrameStats } from './stats.js';

const SPRITE_COUNT = 500;
const SEED = 20261022;
const WARMUP_FRAMES = 60;
const MEASURE_FRAMES = 600;

interface BenchResult {
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

function measure(backend: BenchBackend, atlas: AtlasSource, canvas: HTMLCanvasElement): BenchResult {
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

    if (frame === WARMUP_FRAMES) stats.reset();
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

function run(canvas: HTMLCanvasElement, make: () => BenchBackend): BenchResult {
  let backend: BenchBackend | null = null;
  try {
    backend = make();
  } catch (err) {
    return {
      backend: 'n/a',
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
  const atlasCanvas = makeAtlasCanvas(128);
  const atlas: AtlasSource = { image: atlasCanvas, cell: 128, cols: 2 };
  const result = measure(backend, atlas, canvas);
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
  run(canvas, () => new Canvas2DBackend(canvas)),
  run(canvas, () => new WebGLBackend(canvas, SPRITE_COUNT)),
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
```

- [ ] **Step 2: 编译并确认无类型错误**

Run: `npm run build`
Expected: 退出码 0，`dist/render/bench.js` 存在

- [ ] **Step 3: 在浏览器里跑基准**

Run: `npm run watch`（一个终端）与 `npm run serve`（另一个终端），然后浏览器打开 `http://127.0.0.1:5180/`
Expected: 画布上出现 500 个运动的彩色圆形，左上角浮层显示两个后端的 fps / p95 / drawcall，控制台有 `console.table` 输出

- [ ] **Step 4: 把实测结果写进决策文档**

新建 `docs/superpowers/plans/m0-result.md`，填入实际测得的数字（**必须是真跑出来的，不许填估计值**）：

```markdown
# M0 渲染基准实测结果

- 测试日期：
- 运行环境（浏览器与版本 / 操作系统 / 设备）：
- 精灵数：500，种子：20261022

| 后端 | 平均 FPS | p50 帧时(ms) | p95 帧时(ms) | 最大帧时(ms) | drawcall |
|---|---|---|---|---|---|
| Canvas 2D |  |  |  |  | -1 |
| WebGL |  |  |  |  | 1 |

## 决策

（在此写明选定哪个后端，以及依据。判定标准：p95 帧时是否 <= 16.7ms。）
```

- [ ] **Step 5: 提交**

```bash
git add src/render/bench.ts docs/superpowers/plans/m0-result.md
git commit -m "feat: 新增渲染基准驱动并记录 M0 实测结果"
```

---

### Task 6: 收尾校验

- [ ] **Step 1: 全量测试**

Run: `npm test`
Expected: `# fail 0`

- [ ] **Step 2: 边界检查**

Run: `npm run check:boundaries`
Expected: 输出 `边界检查通过`

- [ ] **Step 3: 确认 `core/` 没有任何渲染或平台依赖**

Run: `git grep -n "render/\|platform/" -- src/core`
Expected: 无输出（退出码 1 表示没有匹配，属正常）

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "chore: M0 收尾校验通过"
```

---

## 自审记录

**1. Spec 覆盖度**

| Spec 条目 | 对应任务 |
|---|---|
| 5.1 目录结构（`core/`、`render/`、`platform/`、`content/`、`ui/`、`app/`、`tools/`） | 本计划只建立 `core/`、`render/`、`tools/`；`content/`、`platform/`、`ui/`、`app/` 属 M1 计划 |
| 5.2 平台五接口 | M1 计划 |
| 5.3 硬性原则 4（`core/` 禁止依赖 `render/`、`platform/`） | Task 0 Step 6/9 已落地并验证 |
| 5.3 硬性原则 5（数值进 `content/`） | M1 计划 |
| 5.5 渲染性能测量 | Task 5 全部 |
| 4.6 性能预算（drawcall < 30） | Task 5 实测 drawcall，作为预算依据 |
| 7. 未决项"Canvas 2D vs WebGL" | Task 5 Step 4 产出决策 |
| 8. 里程碑 M0 | 本计划全部 |

**2. 占位符扫描**

无 `TBD`、无 `TODO`、无"稍后补充"。`m0-result.md` 的表格留空是**刻意的**：它必须由 Step 3 的真实测量填入，模板里已注明"必须是真跑出来的"。

**3. 类型一致性**

- `BenchBackend` 的 `beginFrame()/drawSprite()/endFrame()/dispose()` 在 Task 3、Task 4 的两个实现与 Task 5 的调用处签名一致。
- `AtlasSource` 字段 `image/cell/cols` 在 `spriteData.ts` 的构造处、两个后端的使用处一致。
- `FrameStats.push/reset/summary` 在 Task 2 的定义与 Task 5 的调用一致。
- `Rng` 的 `next/range/int/pick` 在 Task 1 定义，`pick` 在 M1 计划中才会被用到。
- 所有相对 import 一律带 `.js` 后缀（`module: nodenext` 要求），两个后端与 `bench.ts` 均遵守。
