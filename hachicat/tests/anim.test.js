import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SPRITES, animSheetUrl } from '../src/content/assets.js';
import { faceDirFor, FACE_DIR_DEADBAND } from '../src/game/systems/movement.js';
import {
  createAnimState,
  resetAnimState,
  stepAnimState,
  animFrame,
  STOP_DELAY,
} from '../src/render/animation.js';

const ANIM = SPRITES['char.hachiware'].anim;

function publicUrl(url) {
  return new URL('../public/' + url.replace(/^\.\//, ''), import.meta.url);
}

/** 读 PNG 的 IHDR：宽高、颜色类型（6 = RGBA）。 */
function readPngHeader(url) {
  const buf = readFileSync(publicUrl(url));
  assert.equal(buf.toString('ascii', 12, 16), 'IHDR');
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
    colorType: buf[25],
  };
}

/* ---------------- 方向判定 ---------------- */

test('四方向判定：主轴分量明显时按主轴取方向', () => {
  assert.equal(faceDirFor(1, 0, 'down'), 'right');
  assert.equal(faceDirFor(-1, 0, 'down'), 'left');
  assert.equal(faceDirFor(0, 1, 'up'), 'down');
  assert.equal(faceDirFor(0, -1, 'down'), 'up');
  assert.equal(faceDirFor(0.8, 0.5, 'down'), 'right');
  assert.equal(faceDirFor(0.5, 0.8, 'right'), 'down');
  assert.equal(faceDirFor(-0.8, 0.4, 'down'), 'left');
  assert.equal(faceDirFor(0.4, -0.8, 'down'), 'up');
});

test('斜向与静止：两轴差值在死区内保持上一朝向', () => {
  assert.equal(faceDirFor(0.6, 0.6, 'left'), 'left');
  assert.equal(faceDirFor(0.1, 0, 'up'), 'up');
  assert.equal(faceDirFor(0, 0, 'right'), 'right');
  assert.equal(faceDirFor(undefined, undefined, 'down'), 'down');
  // 正好卡在死区边界时不该翻向
  const edge = FACE_DIR_DEADBAND / 2;
  assert.equal(faceDirFor(edge, 0, 'down'), 'down');
  assert.equal(faceDirFor(0, edge, 'up'), 'up');
});

test('faceDir 默认值是 down', () => {
  assert.equal(faceDirFor(0, 0), 'down');
});

/* ---------------- 待机 / 走路状态机 ---------------- */

test('移动立刻进走路，停下满 STOP_DELAY 才回待机', () => {
  const a = createAnimState();
  assert.equal(a.state, 'idle');

  stepAnimState(a, 0.05, true, 'right');
  assert.equal(a.state, 'walk');
  assert.equal(a.dir, 'right');

  stepAnimState(a, 0.05, false, null);
  assert.equal(a.state, 'walk', '刚松手要保留走路姿势');

  stepAnimState(a, 0.05, false, null);
  assert.equal(a.state, 'walk', `${STOP_DELAY}s 内不能提前切待机`);

  stepAnimState(a, 0.05, false, null);
  assert.equal(a.state, 'idle');
});

test('状态切换时帧计时归零，避免从半帧处接上', () => {
  const a = createAnimState();
  stepAnimState(a, 0.2, true, 'down');   // 进走路，这一帧是 walk 0
  stepAnimState(a, 0.2, true, null);
  assert.ok(a.elapsed > 0.15);

  // 松手切待机 → elapsed 归零，从 idle 0 开始
  stepAnimState(a, 0.2, false, null);
  assert.equal(a.state, 'idle');
  assert.equal(a.elapsed, 0);

  // 再次起步 → walk 0 开始
  stepAnimState(a, 0.2, true, 'down');
  assert.equal(a.state, 'walk');
  assert.equal(a.elapsed, 0);
});

test('朝向只在移动时更新，静止保留最后方向', () => {
  const a = createAnimState();
  stepAnimState(a, 0.1, true, 'left');
  assert.equal(a.dir, 'left');
  stepAnimState(a, 0.1, true, null);
  assert.equal(a.dir, 'left', '不传方向时沿用上一帧');
});

test('重置会把状态、朝向、计时一起清掉', () => {
  const a = createAnimState();
  stepAnimState(a, 0.3, true, 'up');
  resetAnimState(a);
  assert.deepEqual(a, { state: 'idle', dir: 'down', elapsed: 0, stoppedFor: STOP_DELAY });
});

/* ---------------- 帧索引 ---------------- */

test('帧索引按 fps 循环并取模，不会越界', () => {
  assert.equal(animFrame(0, 10, 6), 0);
  assert.equal(animFrame(0.09, 10, 6), 0);
  assert.equal(animFrame(0.11, 10, 6), 1);
  assert.equal(animFrame(0.61, 10, 6), 0, '走完一圈回到第 0 帧');
  assert.equal(animFrame(5, 6, 4), 2);
  assert.equal(animFrame(1e6, 10, 6) < 6, true);
});

test('非法参数退化成第 0 帧', () => {
  assert.equal(animFrame(1, 0, 6), 0);
  assert.equal(animFrame(1, 10, 0), 0);
  assert.equal(animFrame(-1, 10, 6), 0);
  assert.equal(animFrame(NaN, 10, 6), 0);
});

/* ---------------- 图集地址与素材 ---------------- */

test('图集地址 = base/prefix_dir_state.png，缺方向退回 fallbackDir', () => {
  assert.equal(animSheetUrl(ANIM, 'down', 'idle'), './chars/anim/hachiware_down_idle.png');
  assert.equal(animSheetUrl(ANIM, 'down', 'walk'), './chars/anim/hachiware_down_walk.png');
  // 目前只交付了 down，其他方向先回退，不能因为缺图就不画
  assert.equal(animSheetUrl(ANIM, 'left', 'walk'), './chars/anim/hachiware_down_walk.png');
  assert.equal(animSheetUrl(ANIM, 'up', 'idle'), './chars/anim/hachiware_down_idle.png');
  assert.equal(animSheetUrl(null, 'down', 'idle'), '');
});

test('只有小八挂了图集，其他角色仍是静态立绘', () => {
  assert.ok(ANIM, '小八需要 anim 配置');
  assert.equal(SPRITES['char.chiikawa'].anim, undefined);
  assert.equal(SPRITES['char.usagi'].anim, undefined);
  assert.ok(SPRITES['char.hachiware'].image, '静态图仍保留，作为回退和 UI 图标');
});

test('图集尺寸符合规范：4×256 / 6×256，PNG-32', () => {
  const idle = readPngHeader(animSheetUrl(ANIM, 'down', 'idle'));
  assert.deepEqual([idle.width, idle.height], [ANIM.cell * ANIM.frames.idle, ANIM.cell]);
  assert.equal(idle.colorType, 6, 'idle 必须是 RGBA');

  const walk = readPngHeader(animSheetUrl(ANIM, 'down', 'walk'));
  assert.deepEqual([walk.width, walk.height], [ANIM.cell * ANIM.frames.walk, ANIM.cell]);
  assert.equal(walk.colorType, 6, 'walk 必须是 RGBA');
});

test('锚点与规范一致：cell 256 / 中心 128 / 脚底 224', () => {
  assert.equal(ANIM.cell, 256);
  assert.deepEqual(ANIM.anchor, { x: 128, y: 224 });
  assert.equal(ANIM.frames.idle, 4);
  assert.equal(ANIM.frames.walk, 6);
  assert.ok(ANIM.fps.idle > 0 && ANIM.fps.walk > ANIM.fps.idle, '走路频率应高于待机');
});
