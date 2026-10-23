/**
 * 小游戏产物冒烟测试：用假 wx + 假 Canvas 执行 wechat-dist/game.js，
 * 跑若干帧并模拟点击「开始游戏 → 选角色 → 出战」，确认没有运行时异常。
 * 这不是真机验证，但能覆盖入口、界面绘制与主循环。
 */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const code = readFileSync('wechat-dist/game.js', 'utf8');
const calls = { fillRect: 0, fillText: 0, stroke: 0 };

const ctx = new Proxy(
  {},
  {
    get(target, prop) {
      if (prop === 'measureText') return (s) => ({ width: String(s).length * 8 });
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
        return () => ({ addColorStop() {} });
      }
      if (prop === 'fillRect') return () => { calls.fillRect += 1; };
      if (prop === 'fillText') return () => { calls.fillText += 1; };
      if (prop === 'stroke') return () => { calls.stroke += 1; };
      if (prop in target) return target[prop];
      return () => {};
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  }
);

const canvas = {
  width: 390,
  height: 844,
  getContext: () => ctx,
};

let rafCb = null;
const touch = { start: [], move: [], end: [] };

const wx = {
  createCanvas: () => canvas,
  getSystemInfoSync: () => ({ screenWidth: 390, screenHeight: 844, pixelRatio: 2 }),
  requestAnimationFrame: (cb) => {
    rafCb = cb;
    return 1;
  },
  cancelAnimationFrame: () => {},
  onTouchStart: (fn) => touch.start.push(fn),
  onTouchMove: (fn) => touch.move.push(fn),
  onTouchEnd: (fn) => touch.end.push(fn),
  onTouchCancel: (fn) => touch.end.push(fn),
  offTouchStart: () => {},
  offTouchMove: () => {},
  offTouchEnd: () => {},
  onWindowResize: () => {},
  onShow: () => {},
  onHide: () => {},
  getStorageSync: () => '',
  setStorageSync: () => {},
  vibrateShort: () => {},
};

const sandbox = {
  wx,
  console,
  Math,
  Date,
  JSON,
  setTimeout,
  clearTimeout,
  // 小游戏没有 window/document，不定义以模拟真实环境
};
vm.createContext(sandbox);

const errors = [];
try {
  vm.runInContext(code, sandbox, { filename: 'game.js' });
} catch (err) {
  errors.push('启动异常: ' + err.stack);
}

function frames(n) {
  for (let i = 0; i < n; i++) {
    if (!rafCb) break;
    const cb = rafCb;
    rafCb = null;
    try {
      cb(Date.now());
    } catch (err) {
      errors.push('帧异常: ' + err.stack);
      break;
    }
  }
}

function tap(x, y) {
  for (const fn of touch.start) {
    try {
      fn({ touches: [{ clientX: x, clientY: y }] });
    } catch (err) {
      errors.push('touchstart 异常: ' + err.stack);
    }
  }
  for (const fn of touch.end) {
    try {
      fn({ changedTouches: [{ clientX: x, clientY: y }] });
    } catch (err) {
      errors.push('touchend 异常: ' + err.stack);
    }
  }
}

frames(3); // 菜单
tap(195, 517); // 开始游戏
frames(3); // 选角
tap(320, 174); // 第一个角色「出战」
frames(90); // 战斗 1.5 秒

console.log('fillRect calls:', calls.fillRect, 'fillText calls:', calls.fillText, 'stroke:', calls.stroke);
if (errors.length) {
  console.error('FAIL\n' + errors.join('\n\n'));
  process.exit(1);
}
if (calls.fillRect === 0 || calls.fillText === 0) {
  console.error('FAIL: 没有产生绘制调用');
  process.exit(1);
}
console.log('PASS: 小游戏入口可启动，菜单/选角/战斗绘制与主循环无异常');