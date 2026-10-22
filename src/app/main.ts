import { CHARACTERS } from '../content/characters.js';
import { getTheme } from '../content/theme.js';
import { advance, beginWave, chooseUpgrade, createRun, startNextWave, type Run } from '../core/run.js';
import { clearRun, loadMeta, loadRun, recordRunEnd, restoreRun, saveRun, type RunSnapshot } from '../core/save.js';
import { buySlot, rerollShop, toggleLock } from '../core/shop.js';
import { createPlatform } from './platform-select.js';
import type { SoundId } from '../platform/types.js';
import { Renderer } from '../render/renderer.js';
import { drawCharacterSelect, drawEnd, drawLevelUp, drawShop } from '../render/screens.js';
import { drawHud, UI } from '../render/ui.js';

type Screen = 'select' | 'run';

const platform = createPlatform();
const theme = getTheme(typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('theme'));
const renderer = new Renderer(platform.canvas);
const ui = new UI(platform.canvas);

// 启动时恢复设置
platform.audio.setMuted(loadMeta(platform.storage).muted);

let screen: Screen = 'select';
let run: Run | null = null;
let lastTime = 0;
/** 上次的流程阶段，用于在阶段切换时持久化 */
let lastPhase = '';
/** 可续玩的存档（启动读一次，之后随阶段变化更新） */
let savedSnapshot: RunSnapshot | null = loadRun(platform.storage);

/**
 * 阶段切换时持久化。
 * 只在「进入新阶段」那一刻执行 —— 放在每帧会重复写盘、重复播音。
 */
function persistPhase(r: Run): void {
  if (r.phase === lastPhase) return;
  if (r.phase === 'shop') {
    // 波末存档：中途退出 / 切后台后可续玩
    saveRun(platform.storage, r);
    savedSnapshot = loadRun(platform.storage);
    platform.audio.play('waveEnd');
  } else if (r.phase === 'defeat') {
    clearRun(platform.storage);
    savedSnapshot = null;
    recordRunEnd(platform.storage, r.world.wave.index, false);
    platform.audio.play('lose');
  } else if (r.phase === 'victory') {
    clearRun(platform.storage);
    savedSnapshot = null;
    recordRunEnd(platform.storage, r.world.wave.index, true);
    platform.audio.play('win');
  }
  lastPhase = r.phase;
}

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
    if (id === 'resume' && savedSnapshot) {
      run = restoreRun(savedSnapshot);
      screen = 'run';
      lastPhase = run.phase;
      platform.audio.play('waveStart');
      return;
    }
    if (id.startsWith('char:')) {
      const characterId = id.slice(5);
      if (!CHARACTERS.some((c) => c.id === characterId)) return;
      run = createRun({ characterId, seed: Date.now() & 0x7fffffff });
      beginWave(run, 1);
      screen = 'run';
      clearRun(platform.storage);
      savedSnapshot = null;
      lastPhase = 'battle';
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
    lastPhase = '';
    // 主动重开视为放弃进度：清掉快照，选角界面不再出现「继续」
    clearRun(platform.storage);
    savedSnapshot = null;
    platform.audio.play('click');
  }
}

function publishDebug(): void {
  // 微信小游戏没有 DOM，调试输出只服务于浏览器
  if (typeof document === 'undefined') return;
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
    persistPhase(run);
  }

  // 3. 绘制
  const { width, height } = platform.view;
  if (screen === 'select') {
    renderer.drawWorld(emptyWorldForBackdrop(), theme, platform.input.pointer, false);
    ui.begin(width);
    drawCharacterSelect(ui, theme, savedSnapshot !== null);
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
(globalThis as unknown as { __game: unknown }).__game = debugHandle;

// 开发便利：?char=chiikawa 直接开局，跳过选角
{
  const wanted =
    typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('char');
  const match = wanted ? CHARACTERS.find((c) => c.id === wanted) : undefined;
  if (match) {
    run = createRun({ characterId: match.id, seed: 20261022 });
    beginWave(run, 1);
    screen = 'run';
  }
}
// 修正版 tick：等时推进 + 临时屏蔽 rAF（避免一次 tick(2400) 堆出 2400 个回调）
{
  const dbg = (globalThis as unknown as { __game: { tick?: (n?: number) => number } }).__game;
  dbg.tick = (count = 1): number => {
    let t = lastTime === 0 ? performance.now() : lastTime;
    const origRaf = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = (() => 0) as unknown as typeof globalThis.requestAnimationFrame;
    try {
      for (let i = 0; i < count; i++) {
        t += 1000 / 60;
        frame(t);
      }
    } finally {
      globalThis.requestAnimationFrame = origRaf;
    }
    return count;
  };
}

// ---------------------------------------------------------------------------
// 追加：真实交互路径。tap 走 hitTest -> handleTap，
// 和玩家点屏幕完全同一条链路，用来做全流程自动通关验证。
{
  const dbg = (globalThis as unknown as {
    __game: {
      tap?: (x: number, y: number) => string | null;
      buttons?: () => Array<{ id: string; x: number; y: number; w: number; h: number }>;
    };
  }).__game;
  dbg.buttons = () => {
    const out: Array<{ id: string; x: number; y: number; w: number; h: number }> = [];
    for (const [id, r] of ui.buttons) out.push({ id, x: r.x, y: r.y, w: r.w, h: r.h });
    return out;
  };
  dbg.tap = (x: number, y: number): string | null => {
    const id = ui.hitTest(x, y);
    if (id) handleTap(id);
    return id;
  };
}
// 生命周期
// ---------------------------------------------------------------------------

/**
 * 切入后台时暂停 + 落盘。
 * rAF 在后台标签页本来就会停，逻辑自然暂停；这里补的是「落盘」——
 * 否则玩家切出去，回来顺手关掉页面，一局就白打了。
 */
platform.onHide?.(() => {
  if (screen !== 'run' || !run) return;
  saveRun(platform.storage, run);
  savedSnapshot = loadRun(platform.storage);
});
