/**
 * 逐帧动画的纯逻辑：状态机 + 帧索引。
 *
 * 这里不碰 Canvas、不碰图片，只把「这一帧该用待机还是走路、第几帧」算清楚，
 * 方便单测，也让渲染器保持逐帧零分配（状态对象只创建一次，之后原地更新）。
 */

/** 松手后保持走路姿势的时长：避免急停急起时在待机/走路之间闪烁。 */
export const STOP_DELAY = 0.13;

export function createAnimState() {
  return { state: 'idle', dir: 'down', elapsed: 0, stoppedFor: STOP_DELAY };
}

export function resetAnimState(a) {
  a.state = 'idle';
  a.dir = 'down';
  a.elapsed = 0;
  a.stoppedFor = STOP_DELAY;
  return a;
}

/**
 * 推进一帧。
 * @param {{state:string,dir:string,elapsed:number,stoppedFor:number}} a 原地更新
 * @param {number} dt 世界时间差（暂停时调用方不推进，动画自然冻结）
 * @param {boolean} moving 玩家是否在移动
 * @param {string} [dir] 当前朝向；缺省沿用上一帧
 */
export function stepAnimState(a, dt, moving, dir) {
  const step = dt > 0 ? dt : 0;
  if (dir) a.dir = dir;
  let switched = false;

  if (moving) {
    a.stoppedFor = 0;
    if (a.state !== 'walk') {
      a.state = 'walk';
      switched = true;
    }
  } else {
    a.stoppedFor += step;
    if (a.state === 'walk' && a.stoppedFor >= STOP_DELAY) {
      a.state = 'idle';
      switched = true;
    }
  }

  // 刚切换的这一帧从第 0 帧开始，不把切帧当帧的时长算进去
  a.elapsed = switched ? 0 : a.elapsed + step;
  return a;
}

/** 帧索引：按 fps 循环，越界参数退化成第 0 帧。 */
export function animFrame(elapsed, fps, frameCount) {
  if (!(fps > 0) || !(frameCount > 0)) return 0;
  const t = elapsed > 0 ? elapsed : 0;
  return Math.floor(t * fps) % frameCount;
}
