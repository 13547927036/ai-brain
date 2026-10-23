import React from 'react';
import { createRoot } from 'react-dom/client';
import { createPlatform } from './platform/index.js';
import { GameController } from './app/controller.js';
import App from './ui/App.jsx';
import './styles/theme.css';
import './styles/base.css';
import './styles/ui.css';
import './styles/screens.css';

const platform = createPlatform();
const controller = new GameController(platform);

createRoot(document.getElementById('root')).render(<App controller={controller} />);

// 开发期调试入口：浏览器控制台 / 自动化测试使用
if (import.meta.env.DEV || location.search.includes('debug=1')) {
  window.__hachicat = {
    controller,
    state: () => controller.getSnapshot(),
    hero: () => controller.debugHero(),
    start: (id) => controller.startRun(id),
    tick: (seconds) => controller.debugTick(seconds),
    jumpWave: (n) => {
      controller.game.debugJumpWave(n);
      controller.publish();
    },
    money: (n) => {
      controller.game.debugMoney(n);
      controller.publish();
    },
    addWeapon: (id, level = 1) => {
      controller.game.debugAddWeapon(id, level);
      controller.publish();
    },
    heal: () => {
      controller.game.debugHeal();
      controller.publish();
    },
    killBoss: () => {
      controller.game.debugKillBoss();
      controller.publish();
    },
    win: () => {
      controller.game.debugWin();
      controller.publish();
    },
    lose: () => {
      controller.game.debugLose();
      controller.publish();
    },
    levelUp: () => {
      controller.game.debugLevelUp();
      controller.publish();
    },
    endWave: () => {
      controller.game.endWave();
      controller.publish();
    },
  };
}
