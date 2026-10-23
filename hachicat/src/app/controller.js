import { Game } from '../game/game.js';
import { THEMES, getTheme } from '../content/theme.js';
import { createRenderer } from '../render/renderer.js';
import { createJoystick } from '../input/joystick.js';
import { STORAGE_KEYS } from '../platform/types.js';

/**
 * 应用控制器：把平台、游戏、渲染、输入粘在一起，并向 React 暴露快照。
 * React 不直接碰世界对象，只读快照 + 调方法。
 */
export class GameController {
  constructor(platform) {
    this.platform = platform;
    this.meta = this.readJson(STORAGE_KEYS.meta, { bestWave: 0, runs: 0, wins: 0 });
    this.settings = this.readJson(STORAGE_KEYS.settings, { theme: 'neon', muted: false });

    this.themeId = THEMES[this.settings.theme] ? this.settings.theme : 'neon';
    this.muted = !!this.settings.muted;
    this.platform.audio.setMuted(this.muted);

    this.screen = 'menu';
    this.game = new Game({ seed: 20260101 });
    this.canvas = null;
    this.renderer = null;
    this.joystick = null;
    this.raf = 0;
    this.running = false;
    this.lastTime = 0;
    this.lastPublish = 0;
    this.lastMode = '';
    this.hidden = false;
    this.lastHurtAt = 0;
    this.listeners = new Set();
    this.snapshot = this.buildSnapshot();
    this.applyTheme();
  }

  /* ---------------- 订阅（给 useSyncExternalStore 用） ---------------- */

  subscribe = (cb) => {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  };

  getSnapshot = () => this.snapshot;

  publish() {
    this.snapshot = this.buildSnapshot();
    for (const cb of this.listeners) cb();
  }

  buildSnapshot() {
    const game = this.game ? this.game.getSnapshot() : {};
    return {
      ...game,
      screen: this.screen,
      themeId: this.themeId,
      themeDef: getTheme(this.themeId),
      muted: this.muted,
      bestWave: this.meta.bestWave || 0,
      runs: this.meta.runs || 0,
      wins: this.meta.wins || 0,
      shadowUnlocked: (this.meta.bestWave || 0) >= 8,
      platform: this.platform.name,
    };
  }

  /* ---------------- 画布与主循环 ---------------- */

  attachCanvas(canvas) {
    this.canvas = canvas;
    this.renderer = createRenderer(canvas);
    this.joystick = createJoystick(canvas, this.platform);
    this.resize();
    this.platform.audio.unlock?.();
    this.disposeResize = this.platform.bindResize(() => this.resize());
    this.disposeVisibility = this.platform.bindVisibility((hidden) => {
      this.hidden = hidden;
      if (hidden && this.game.mode === 'battle') {
        this.game.pause();
        this.publish();
      }
    });
    this.startLoop();
  }

  detachCanvas() {
    this.stopLoop();
    if (this.joystick) this.joystick.destroy();
    this.joystick = null;
    this.renderer = null;
    this.canvas = null;
    this.disposeResize?.();
    this.disposeVisibility?.();
    this.disposeResize = null;
    this.disposeVisibility = null;
  }

  resize() {
    if (!this.canvas || !this.renderer) return;
    const parent = this.canvas.parentElement;
    let w = parent ? parent.clientWidth : 0;
    let h = parent ? parent.clientHeight : 0;
    if (!w || !h) {
      const vp = this.platform.getViewport();
      w = vp.width;
      h = vp.height;
    }
    this.renderer.resize(w, h);
    this.game.setViewport(w, h);
    this.joystick.setRadius(Math.max(46, Math.min(72, w * 0.16)));
    this.publish();
  }

  startLoop() {
    if (this.running) return;
    this.running = true;
    this.lastTime = this.platform.now();
    const tick = (now) => {
      if (!this.running) return;
      this.raf = this.platform.requestFrame(tick);
      this.frame(now);
    };
    this.raf = this.platform.requestFrame(tick);
  }

  stopLoop() {
    this.running = false;
    if (this.raf) this.platform.cancelFrame(this.raf);
    this.raf = 0;
  }

  frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - this.lastTime) / 1000));
    this.lastTime = now;

    if (!this.game || this.screen !== 'game') return;

    if (!this.hidden) {
      const w = this.game.world;
      if (w && this.game.mode === 'battle' && this.joystick) {
        const dir = this.joystick.getDirection();
        w.player.moveX = dir.x;
        w.player.moveY = dir.y;
      }
      this.game.update(dt);
      this.consumeEvents();
    }

    if (this.renderer && this.game.world) {
      this.renderer.draw(this.game.world, getTheme(this.themeId), this.joystick ? this.joystick.state : null);
    }

    if (this.game.mode !== this.lastMode) {
      this.lastMode = this.game.mode;
      this.setJoystickEnabled(this.game.mode === 'battle');
      this.publish();
    } else if (now - this.lastPublish > 120) {
      this.lastPublish = now;
      this.publish();
    }
  }

  setJoystickEnabled(enabled) {
    this.joystick?.setEnabled(enabled);
  }

  consumeEvents() {
    const events = this.game.drainEvents();
    for (const ev of events) {
      switch (ev.type) {
        case 'waveStart':
          this.platform.audio.play('wave');
          break;
        case 'bossSpawn':
          this.platform.audio.play('boss');
          this.platform.vibrate(40);
          break;
        case 'hurt': {
          const now = this.platform.now();
          if (now - this.lastHurtAt > 140) {
            this.lastHurtAt = now;
            this.platform.audio.play('hurt');
            this.platform.vibrate(14);
          }
          break;
        }
        case 'levelup':
          this.platform.audio.play('levelup');
          break;
        case 'upgradeChosen':
          this.platform.audio.play('click');
          break;
        case 'waveClear':
          this.platform.audio.play('shop');
          break;
        case 'purchase':
          this.platform.audio.play('buy');
          break;
        case 'heal':
          this.platform.audio.play('heal');
          break;
        case 'reroll':
          this.platform.audio.play('click');
          break;
        case 'victory':
          this.platform.audio.play('victory');
          this.recordResult(ev);
          break;
        case 'defeat':
          this.platform.audio.play('defeat');
          this.recordResult(ev);
          break;
        case 'pause':
          this.platform.audio.play('pause');
          break;
        default:
          break;
      }
    }
  }

  recordResult(result) {
    this.meta.runs = (this.meta.runs || 0) + 1;
    this.meta.bestWave = Math.max(this.meta.bestWave || 0, result.wave || 0);
    if (result.victory) this.meta.wins = (this.meta.wins || 0) + 1;
    this.saveJson(STORAGE_KEYS.meta, this.meta);
    this.publish();
  }

  /* ---------------- 界面动作 ---------------- */

  showMenu() {
    this.screen = 'menu';
    this.game.quit();
    this.publish();
  }

  showCharacters() {
    this.screen = 'char';
    this.publish();
  }

  startRun(characterId) {
    this.screen = 'game';
    this.lastMode = '';
    this.game.startRun(characterId);
    this.lastTime = this.platform.now();
    this.publish();
  }

  pause() {
    if (this.game.pause()) this.publish();
  }

  resume() {
    if (this.game.resume()) this.publish();
  }

  chooseUpgrade(index) {
    if (this.game.chooseUpgrade(index)) this.publish();
  }

  buy(index) {
    const res = this.game.buy(index);
    if (res.ok) this.publish();
    return res;
  }

  reroll() {
    const res = this.game.reroll();
    if (res.ok) this.publish();
    return res;
  }

  heal() {
    const res = this.game.heal();
    if (res.ok) this.publish();
    return res;
  }

  synthesize(weaponId) {
    const res = this.game.synthesize(weaponId);
    if (res.ok) this.publish();
    return res;
  }

  nextWave() {
    const ok = this.game.nextWave();
    this.lastMode = '';
    this.publish();
    return ok;
  }

  restart() {
    this.startRun(this.game.characterId || 'ginger');
  }

  quitToMenu() {
    this.showMenu();
  }

  setTheme(id) {
    if (!THEMES[id] || id === this.themeId) return;
    this.themeId = id;
    this.settings.theme = id;
    this.saveJson(STORAGE_KEYS.settings, this.settings);
    this.applyTheme();
    this.publish();
  }

  toggleMute() {
    this.muted = !this.muted;
    this.platform.audio.setMuted(this.muted);
    this.settings.muted = this.muted;
    this.saveJson(STORAGE_KEYS.settings, this.settings);
    this.publish();
  }

  applyTheme() {
    const theme = getTheme(this.themeId);
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = theme.id;
    }
    this.platform.setThemeColor(theme.colors.bgTop);
  }

  readJson(key, fallback) {
    try {
      const raw = this.platform.storage.get(key);
      if (!raw) return { ...fallback };
      const parsed = JSON.parse(raw);
      return { ...fallback, ...parsed };
    } catch {
      return { ...fallback };
    }
  }

  saveJson(key, value) {
    try {
      this.platform.storage.set(key, JSON.stringify(value));
    } catch {
      /* 忽略 */
    }
  }

  /* ---------------- 调试接口（仅开发期） ---------------- */

  debugTick(seconds) {
    if (!this.game.world) return;
    const steps = Math.max(1, Math.round(seconds * 60));
    for (let i = 0; i < steps; i++) {
      if (this.game.mode === 'levelup') {
        this.game.chooseUpgrade(0);
        continue;
      }
      if (this.game.mode === 'shop') {
        this.game.nextWave();
        continue;
      }
      if (this.game.mode === 'result') break;
      this.game.update(1 / 60);
    }
    this.consumeEvents();
    this.publish();
  }

  debugHero() {
    const w = this.game.world;
    if (!w) return null;
    return {
      x: Math.round(w.player.x),
      y: Math.round(w.player.y),
      hp: Math.round(w.player.hp),
      maxHp: Math.round(w.player.stats.maxHp),
      enemies: w.enemies.length,
      bullets: w.bullets.length,
      pickups: w.pickups.length,
      wave: this.game.waveIndex,
      mode: this.game.mode,
      kills: w.stats.kills,
    };
  }
}
