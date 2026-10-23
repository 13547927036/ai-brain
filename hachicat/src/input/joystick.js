/**
 * 虚拟摇杆：触摸任意位置即出现，拖动控制方向。
 * 桌面端额外支持 WASD / 方向键。
 * 输入本身不碰游戏逻辑，只输出一个方向向量。
 */
export function createJoystick(canvas, platform) {
  const state = {
    active: false,
    originX: 0,
    originY: 0,
    dirX: 0,
    dirY: 0,
    radius: 58,
    kbX: 0,
    kbY: 0,
  };

  let pointerActive = false;
  let enabled = true;
  const keys = new Set();

  function applyPointer(p) {
    const dx = p.x - state.originX;
    const dy = p.y - state.originY;
    const dist = Math.hypot(dx, dy);
    const dead = 7;
    if (dist < dead) {
      state.dirX = 0;
      state.dirY = 0;
      return;
    }
    const max = state.radius;
    const len = Math.min(1, dist / max);
    state.dirX = (dx / dist) * len;
    state.dirY = (dy / dist) * len;
  }

  const disposePointer = platform.bindPointer(canvas, {
    down(p) {
      if (!enabled) return;
      pointerActive = true;
      state.active = true;
      state.originX = p.x;
      state.originY = p.y;
      state.dirX = 0;
      state.dirY = 0;
    },
    move(p) {
      if (!pointerActive || !enabled) return;
      applyPointer(p);
    },
    up() {
      pointerActive = false;
      state.active = false;
      state.dirX = 0;
      state.dirY = 0;
    },
  });

  const KEY_MAP = {
    w: [0, -1], arrowup: [0, -1],
    s: [0, 1], arrowdown: [0, 1],
    a: [-1, 0], arrowleft: [-1, 0],
    d: [1, 0], arrowright: [1, 0],
  };

  function recomputeKeys() {
    let x = 0;
    let y = 0;
    for (const k of keys) {
      const v = KEY_MAP[k];
      if (v) {
        x += v[0];
        y += v[1];
      }
    }
    const len = Math.hypot(x, y);
    if (len > 0) {
      state.kbX = x / len;
      state.kbY = y / len;
    } else {
      state.kbX = 0;
      state.kbY = 0;
    }
  }

  const disposeKeys = platform.bindKeys
    ? platform.bindKeys((key, down) => {
        const k = String(key).toLowerCase();
        if (!KEY_MAP[k]) return;
        if (down) keys.add(k);
        else keys.delete(k);
        recomputeKeys();
      })
    : () => {};

  return {
    state,
    setEnabled(v) {
      enabled = !!v;
      if (!enabled) {
        pointerActive = false;
        state.active = false;
        state.dirX = 0;
        state.dirY = 0;
      }
    },
    setRadius(r) {
      state.radius = r;
    },
    getDirection() {
      if (!enabled) return { x: 0, y: 0 };
      if (state.active) return { x: state.dirX, y: state.dirY };
      if (state.kbX || state.kbY) return { x: state.kbX, y: state.kbY };
      return { x: 0, y: 0 };
    },
    reset() {
      pointerActive = false;
      state.active = false;
      state.dirX = 0;
      state.dirY = 0;
      keys.clear();
      recomputeKeys();
    },
    destroy() {
      disposePointer();
      disposeKeys();
    },
  };
}