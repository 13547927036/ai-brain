import test from 'node:test';
import assert from 'node:assert/strict';
import { CHIIKAWA_PLACEHOLDER } from '../content/theme.js';
import { beginWave, chooseUpgrade, createRun, runWaveToCompletion } from '../core/run.js';
import { Renderer } from './renderer.js';
import { drawCharacterSelect, drawEnd, drawLevelUp, drawShop } from './screens.js';
import { drawHud, UI } from './ui.js';

/**
 * 渲染层的冒烟测试。
 *
 * 为什么需要：渲染代码只在浏览器里跑，而浏览器自动化的观测通道不可靠
 * （隔离 JS 世界里读不到页面全局）。用桩 canvas 在 Node 里跑一遍绘制路径，
 * 任何「属性写错 / 除零 / undefined 访问」都会立刻变成可读的堆栈。
 */

export interface StubCanvas {
  width: number;
  height: number;
  getContext: (id: string) => unknown;
  calls: string[];
}

function makeCanvas(width = 750, height = 1334): StubCanvas {
  const calls: string[] = [];
  const store: Record<string, unknown> = {};
  const canvas: StubCanvas = {
    width,
    height,
    calls,
    getContext: () => ctx,
  };
  const ctx: Record<string, unknown> = new Proxy(store, {
    get(target, key: string) {
      if (key === 'canvas') return canvas;
      if (key === 'measureText') return () => ({ width: 10 });
      if (key in target) return target[key];
      return (...args: unknown[]) => {
        calls.push(key);
        void args;
      };
    },
    set(target, key: string, value) {
      target[key] = value;
      return true;
    },
  }) as unknown as Record<string, unknown>;
  return canvas;
}

function asCanvas(c: StubCanvas): HTMLCanvasElement {
  return c as unknown as HTMLCanvasElement;
}

test('Renderer 能画出空世界（选角背景）', () => {
  const c = makeCanvas();
  const r = new Renderer(asCanvas(c));
  const world = createRun({ characterId: 'hachiware', seed: 1 }).world;
  assert.doesNotThrow(() => {
    r.drawWorld(world, CHIIKAWA_PLACEHOLDER, { active: false, originX: 0, originY: 0, x: 0, y: 0, dirX: 0, dirY: 0, radius: 90 }, false);
  });
  assert.ok(c.calls.includes('fillRect'), '应该发生过填充');
});

test('Renderer 能画出战斗中的世界', () => {
  const c = makeCanvas();
  const r = new Renderer(asCanvas(c));
  const run = createRun({ characterId: 'chiikawa', seed: 7 });
  beginWave(run, 1);
  const stepper = run.stepper;
  for (let i = 0; i < 600; i++) stepper.step(run.world, 1 / 60);
  assert.ok(run.world.enemies.length > 0, '应有敌人');
  assert.doesNotThrow(() => {
    r.drawWorld(run.world, CHIIKAWA_PLACEHOLDER, { active: true, originX: 100, originY: 100, x: 150, y: 120, dirX: 0.6, dirY: 0.3, radius: 90 }, true);
  });
});

test('UI 能画出战斗 HUD', () => {
  const c = makeCanvas();
  const ui = new UI(asCanvas(c));
  const run = createRun({ characterId: 'usagi', seed: 3 });
  beginWave(run, 1);
  ui.begin(750);
  assert.doesNotThrow(() => drawHud(ui, run.world, CHIIKAWA_PLACEHOLDER));
});

test('UI 能画出选角界面，并登记角色按钮', () => {
  const c = makeCanvas();
  const ui = new UI(asCanvas(c));
  ui.begin(750);
  assert.doesNotThrow(() => drawCharacterSelect(ui, CHIIKAWA_PLACEHOLDER));
  assert.ok(ui.buttons.has('char:chiikawa'), '应登记吉伊卡哇按钮');
  assert.ok(ui.buttons.has('char:hachiware'));
  assert.ok(ui.buttons.has('char:usagi'));
});

test('UI 能画出商店界面，并登记购买/锁定/重掷/下一波', () => {
  const c = makeCanvas();
  const ui = new UI(asCanvas(c));
  const run = createRun({ characterId: 'hachiware', seed: 11 });
  beginWave(run, 1);
  ui.begin(750);
  drawCharacterSelect(ui, CHIIKAWA_PLACEHOLDER);
  const charBtn = ui.buttons.get('char:hachiware');
  assert.ok(charBtn);
  runWaveToCompletion(run);
  while (run.phase === 'levelUp') chooseUpgrade(run, 0);
  assert.equal(run.phase, 'shop');

  ui.begin(750);
  assert.doesNotThrow(() => drawShop(ui, run, CHIIKAWA_PLACEHOLDER));
  assert.ok(ui.buttons.has('nextWave'), '应有下一波按钮');
  assert.ok(ui.buttons.has('reroll'), '应有重掷按钮');
  assert.ok(ui.buttons.has('buy:0'), '应有购买按钮');
});

test('UI 能画出升级界面', () => {
  const c = makeCanvas();
  const ui = new UI(asCanvas(c));
  const run = createRun({ characterId: 'chiikawa', seed: 5 });
  beginWave(run, 1);
  runWaveToCompletion(run);
  if (run.phase !== 'levelUp') {
    // 没升级就跳过，不强行构造
    assert.ok(run.phase === 'shop');
    return;
  }
  ui.begin(750);
  assert.doesNotThrow(() => drawLevelUp(ui, run, CHIIKAWA_PLACEHOLDER));
  assert.ok(ui.buttons.has('pick:0'));
});

test('UI 能画出结算界面', () => {
  const c = makeCanvas();
  const ui = new UI(asCanvas(c));
  const run = createRun({ characterId: 'chiikawa', seed: 5 });
  beginWave(run, 1);
  ui.begin(750);
  assert.doesNotThrow(() => drawEnd(ui, run, CHIIKAWA_PLACEHOLDER, false));
  assert.ok(ui.buttons.has('restart'));
});

test('按钮命中判定：点中返回 id，点空返回 null', () => {
  const c = makeCanvas();
  const ui = new UI(asCanvas(c));
  ui.begin(750);
  drawCharacterSelect(ui, CHIIKAWA_PLACEHOLDER);
  const btn = ui.buttons.get('char:chiikawa');
  assert.ok(btn);
  assert.equal(ui.hitTest(btn.x + 5, btn.y + 5), 'char:chiikawa');
  assert.equal(ui.hitTest(-100, -100), null);
});
