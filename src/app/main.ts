import { CHARACTERS } from '../content/characters.js';
import { CHIIKAWA_PLACEHOLDER } from '../content/theme.js';
import { advance, beginWave, chooseUpgrade, createRun, startNextWave, type Run } from '../core/run.js';
import { buySlot, rerollShop, toggleLock } from '../core/shop.js';
import { createBrowserPlatform } from '../platform/browser/index.js';
import type { SoundId } from '../platform/types.js';
import { Renderer } from '../render/renderer.js';
import { drawCharacterSelect, drawEnd, drawLevelUp, drawShop } from '../render/screens.js';
import { drawHud, UI } from '../render/ui.js';

type Screen = 'select' | 'run';

const platform = createBrowserPlatform();
const theme = CHIIKAWA_PLACEHOLDER;
const renderer = new Renderer(platform.canvas);
const ui = new UI(platform.canvas);

let screen: Screen = 'select';
let run: Run | null = null;
let lastTime = 0;

/** 把平台输入写进 player：摇杆优先，其次键盘（桌面调试） */
function applyInput(r: Run): void {
  const { pointer, keys } = platform.input;
  const p = r.world.player;
  if (pointer.active) {
    p.inputX = pointer.dirX;
    p.inputY = pointer.dirY;
  } else if (keys.x !== 0 || keys.y !== 0) {
    const len = Math.hypot(keys.x, keys.y) || 1;
    p.inputX = keys.x / len;
    p.inputY = keys.y / len;
  } else {
    p.inputX = 0;
    p.inputY = 0;
  }
}

const EVENT_SOUND: Record<string, SoundId> = {
  fire: 'fire', hit: 'hit', kill: 'kill', hurt: 'hurt',
  dodge: 'dodge', pickup: 'pickup', levelUp: 'levelUp',
  waveStart: 'waveStart', waveEnd: 'waveEnd',
};

function playEvents(world: Run['world']): void {
  for (const e of world.events) {
    if (e.type === 'hit' && e.crit) { platform.audio.play('crit'); continue; }
    const id = EVENT_SOUND[e.type];
    if (id) platform.audio.play(id);
  }
}

function handleTap(id: string): void {
  if (screen === 'select') {
    if (id.startsWith('char:')) {
      const characterId = id.slice(5);
      if (!CHARACTERS.some((c) => c.id === characterId)) return;
      run = createRun({ characterId, seed: Date.now() & 0x7fffffff });
      beginWave(run, 1);
      screen = 'run';
      platform.audio.play('waveStart');
    }
    return;
  }

  if (!run) return;
  const r = run;

  if (id.startsWith('pick:')) {
    const idx = Number(id.slice(5));
    if (r.phase !== 'levelUp') return;
    chooseUpgrade(r, idx);
    platform.audio.play('click');
    return;
  }

  if (r.phase === 'shop' && r.shop) {
    const shop = r.shop;
    if (id.startsWith('buy:')) {
      const idx = Number(id.slice(4));
      if (buySlot(r.world, shop, idx)) platform.audio.play('buy');
      return;
    }
    if (id.startsWith('lock:')) {
      toggleLock(shop, Number(id.slice(5)));
      platform.audio.play('click');
      return;
    }
    if (id === 'reroll') {
      const cost = 1 + shop.wave + shop.rerolls;
      if (r.world.player.materials >= cost) {
        r.world.player.materials -= cost;
        rerollShop(r.world, shop);
        platform.audio.play('reroll');
      }
      return;
    }
    if (id === 'nextWave') {
      if (startNextWave(r)) platform.audio.play('waveStart');
      return;
    }
  }

  if (id === 'restart') {
    screen = 'select';
    run = null;
    platform.audio.play('click');
  }
}

function publishDebug(): void {
  const el = document.body;
  if (!el) return;
  const ds = el.dataset;
  ds.screen = screen;
  ds.phase = run ? run.phase : '-';
  ds.wave = run ? String(run.world.wave.index) : '-';
  ds.frame = run ? String(run.world.frame) : '-';
  ds.hp = run ? String(Math.round(run.world.player.hp)) : '-';
  ds.enemies = run ? String(run.world.enemies.length) : '-';
  ds.weapons = run ? `${run.world.player.weapons.length}/${run.world.player.weaponSlots}` : '-';
  ds.materials = run ? String(Math.floor(run.world.player.materials)) : '-';
  ds.level = run ? String(run.world.player.level) : '-';
}

function frame(now: number): void {
  const dt = lastTime === 0 ? 1 / 60 : Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;

  // 1. 处理上一帧登记下来的按钮点击
  platform.beginFrame();
  const taps = platform.input.takeTaps();
  if (taps.length > 0) {
    for (const tap of taps) {
      const id = ui.hitTest(tap.x, tap.y);
      if (id) {
        handleTap(id);
        platform.input.cancelPointer();
        break;
      }
    }
  }

  // 2. 推进逻辑
  if (screen === 'run' && run) {
    if (run.phase === 'battle') {
      applyInput(run);
      advance(run, dt);
      playEvents(run.world);
    }
    if (run.phase === 'defeat') platform.audio.play('lose');
    if (run.phase === 'victory') platform.audio.play('win');
  }

  // 3. 绘制
  const { width, height } = platform.view;
  if (screen === 'select') {
    renderer.drawWorld(emptyWorldForBackdrop(), theme, platform.input.pointer, false);
    ui.begin(width);
    drawCharacterSelect(ui, theme);
  } else if (run) {
    const showJoystick = run.phase === 'battle';
    renderer.drawWorld(run.world, theme, platform.input.pointer, showJoystick);
    ui.begin(width);
    if (run.phase === 'battle') {
      drawHud(ui, run.world, theme);
    } else if (run.phase === 'levelUp') {
      drawLevelUp(ui, run, theme);
    } else if (run.phase === 'shop') {
      drawShop(ui, run, theme);
    } else {
      drawEnd(ui, run, theme, run.phase === 'victory');
    }
  }
  void height;

  publishDebug();
  requestAnimationFrame(frame);
}

/**
 * 选角界面的背景：借用一个空世界来画竞技场底图。
 * 不这么做的话选角界面会压在一块纯黑上，看着像崩了。
 */
function emptyWorldForBackdrop(): Run['world'] {
  if (!backdropWorld) {
    backdropWorld = createRun({ characterId: 'hachiware', seed: 1 }).world;
  }
  return backdropWorld;
}
let backdropWorld: Run['world'] | null = null;

requestAnimationFrame(frame);

// ---- 调试钩子（仅开发期使用）----
// tick() 用于绕过 Chrome 对后台标签页 requestAnimationFrame 的节流：
// 标签页不在前台时 rAF 一帧都不会触发，自动化验证必须手动推进。
const debugHandle = {
  get screen(): string { return screen; },
  get run(): Run | null { return run; },
  handleTap,
  tick(count = 1): number {
    for (let i = 0; i < count; i++) frame(performance.now());
    return count;
  },
};
(window as unknown as { __game: unknown }).__game = debugHandle;

// 开发便利：?char=chiikawa 直接开局，跳过选角
{
  const wanted = new URLSearchParams(location.search).get('char');
  const match = wanted ? CHARACTERS.find((c) => c.id === wanted) : undefined;
  if (match) {
    run = createRun({ characterId: match.id, seed: 20261022 });
    beginWave(run, 1);
    screen = 'run';
  }
}
// 修正版 tick：等时推进 + 临时屏蔽 rAF（避免一次 tick(2400) 堆出 2400 个回调）
{
  const dbg = (window as unknown as { __game: { tick?: (n?: number) => number } }).__game;
  dbg.tick = (count = 1): number => {
    let t = lastTime === 0 ? performance.now() : lastTime;
    const origRaf = window.requestAnimationFrame;
    window.requestAnimationFrame = (() => 0) as unknown as typeof window.requestAnimationFrame;
    try {
      for (let i = 0; i < count; i++) {
        t += 1000 / 60;
        frame(t);
      }
    } finally {
      window.requestAnimationFrame = origRaf;
    }
    return count;
  };
}