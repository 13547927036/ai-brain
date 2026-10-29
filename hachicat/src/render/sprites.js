/**
 * 程序化美术：每个 kind 一个绘制函数。
 * 这里只读 sprite 定义里的 palette，不读任何游戏数值。
 * 想换图片素材时，在 drawSprite 里加一个 `kind: 'image'` 分支即可。
 */
import { resolveSprite, animSheetUrl } from '../content/assets.js';
import { getCharImage, getCharSheet } from './char-images.js';
import { animFrame } from './animation.js';

/* ---------------- 基础工具 ---------------- */

function rr(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
}

function triangle(ctx, x1, y1, x2, y2, x3, y3) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.closePath();
}

function shadow(ctx, x, y, rx, ry, color) {
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = color;
  ellipse(ctx, x, y, rx, ry);
  ctx.fill();
  ctx.restore();
}

/* ---------------- 玩家角色兜底 ---------------- */

/**
 * 图片加载失败或微信小游戏没有 HTMLImageElement 时使用的程序化兜底。
 * 只保留三个角色的大致轮廓（小八尖耳、吉伊圆耳、乌萨奇长耳），
 * 不复刻 PNG 立绘，也不会影响网页版已加载的图片素材。
 */
export function drawCritter(ctx, x, y, size, sprite, opts = {}) {
  const p = sprite.palette || {};
  const variant = sprite.variant || 'chiikawa';
  const s = size / 44;
  const facing = opts.facing ?? 1;
  const bob = opts.bob ?? 0;
  const t = opts.t ?? 0;

  ctx.save();
  ctx.translate(x, y + bob * 0.6);
  ctx.scale(facing * s, s);
  shadow(ctx, 0, 18, 12, 4, 'rgba(0,0,0,0.28)');

  // 小尾巴
  ctx.fillStyle = p.bodyDark;
  ellipse(ctx, -13, 4, 4.5, 4.2);
  ctx.fill();

  // 脚
  ctx.fillStyle = p.bodyDark;
  rr(ctx, -8, 10, 6, 6, 3);
  ctx.fill();
  rr(ctx, 2, 10, 6, 6, 3);
  ctx.fill();

  // 身体
  ctx.fillStyle = p.body;
  ellipse(ctx, -1, 3, 12.5, 10.5);
  ctx.fill();
  ctx.fillStyle = p.belly;
  ellipse(ctx, 1, 7, 7.5, 5.6);
  ctx.fill();

  // 围巾
  if (p.scarf) {
    ctx.fillStyle = p.scarf;
    ctx.beginPath();
    ctx.moveTo(-6, 4);
    ctx.quadraticCurveTo(1, 8, 8, 4);
    ctx.quadraticCurveTo(1, 6, -6, 2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-5, 4);
    ctx.quadraticCurveTo(-11, 7 - Math.sin(t * 6) * 1.4, -12.5, 3);
    ctx.quadraticCurveTo(-8, 4.4, -5, 2.2);
    ctx.closePath();
    ctx.fill();
  }

  // 头部
  ctx.save();
  ctx.translate(6, -6);
  ctx.rotate((opts.tilt ?? 0) * 0.3);

  if (variant === 'usagi') {
    for (const [ex, rot] of [[-3, -0.16], [6, 0.12]]) {
      ctx.save();
      ctx.translate(ex, -9);
      ctx.rotate(rot);
      ctx.fillStyle = p.body;
      rr(ctx, -4, -24, 8, 27, 4);
      ctx.fill();
      ctx.fillStyle = p.earInner;
      ctx.globalAlpha = 0.7;
      rr(ctx, -2, -21, 4, 20, 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  } else if (variant === 'hachiware') {
    ctx.fillStyle = p.body;
    triangle(ctx, -9, -6, -3, -19, 1, -7);
    ctx.fill();
    triangle(ctx, 3, -8, 9, -18, 12, -6);
    ctx.fill();
    ctx.fillStyle = p.earInner;
    triangle(ctx, -7, -7, -3.5, -15, -1, -7);
    ctx.fill();
    triangle(ctx, 5, -8, 8.5, -15, 10, -7);
    ctx.fill();
  } else {
    ctx.fillStyle = p.body;
    ctx.beginPath();
    ctx.arc(-6, -10, 6, 0, Math.PI * 2);
    ctx.arc(8, -10, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.earInner;
    ctx.globalAlpha = 0.65;
    ctx.beginPath();
    ctx.arc(-6, -10, 3.4, 0, Math.PI * 2);
    ctx.arc(8, -10, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // 脸
  ctx.fillStyle = p.body;
  ellipse(ctx, 1, 0, 11.5, 10);
  ctx.fill();

  // 腮红
  ctx.fillStyle = p.earInner;
  ctx.globalAlpha = 0.35;
  ellipse(ctx, -3.5, 3.4, 3.2, 2.2);
  ctx.fill();
  ellipse(ctx, 6.5, 3.4, 3.2, 2.2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // 眼睛
  const blink = opts.blink ? 0.14 : 1;
  ctx.fillStyle = p.eye;
  ellipse(ctx, -2.4, -1.2, 2.5, 2.9 * blink);
  ctx.fill();
  ellipse(ctx, 5.4, -1.2, 2.5, 2.9 * blink);
  ctx.fill();
  if (!opts.blink) {
    ctx.fillStyle = p.pupil;
    ellipse(ctx, -2.2, -0.9, 1.2, 1.7);
    ctx.fill();
    ellipse(ctx, 5.6, -0.9, 1.2, 1.7);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(-1.4, -2, 0.8, 0, Math.PI * 2);
    ctx.arc(6.4, -2, 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // 鼻子和嘴
  ctx.fillStyle = p.nose;
  ellipse(ctx, 1.4, 2.4, 1.1, 0.8);
  ctx.fill();
  ctx.strokeStyle = p.eye;
  ctx.lineWidth = 0.8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(1.4, 3.2);
  ctx.quadraticCurveTo(0.2, 4.6, -0.8, 3.6);
  ctx.moveTo(1.4, 3.2);
  ctx.quadraticCurveTo(2.6, 4.6, 3.6, 3.6);
  ctx.stroke();

  ctx.restore();
  ctx.restore();

  if (opts.flash > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(0.8, opts.flash * 4);
    ctx.fillStyle = '#fff';
    ellipse(ctx, x, y, size * 0.42, size * 0.42);
    ctx.fill();
    ctx.restore();
  }
}

/* ---------------- 敌人：蓬蓬兽 ---------------- */

function drawFluff(ctx, x, y, size, p, t) {
  const s = size / 34;
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 5) * 0.9);
  ctx.scale(s, s);
  shadow(ctx, 0, 15, 12, 4, 'rgba(0,0,0,0.3)');

  // 短脚
  ctx.fillStyle = p.bodyDark;
  ellipse(ctx, -6, 10, 4.6, 3.4);
  ctx.fill();
  ellipse(ctx, 6, 10, 4.6, 3.4);
  ctx.fill();

  // 毛团身体
  ctx.fillStyle = p.body;
  ellipse(ctx, 0, 1, 13, 11);
  ctx.fill();
  ctx.fillStyle = p.tuft;
  for (const [tx, ty, r] of [[-7, -9, 4.2], [0, -12, 4.8], [7, -9, 4.2]]) {
    ctx.beginPath();
    ctx.arc(tx, ty, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ellipse(ctx, -4, 3, 5, 3.6);
  ctx.fill();

  // 眼睛
  ctx.fillStyle = p.eye;
  ellipse(ctx, -4, -1, 2.2, 2.6);
  ctx.fill();
  ellipse(ctx, 4, -1, 2.2, 2.6);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-3.2, -1.8, 0.7, 0, Math.PI * 2);
  ctx.arc(4.8, -1.8, 0.7, 0, Math.PI * 2);
  ctx.fill();

  // 生气的眉毛和嘴
  ctx.strokeStyle = p.bodyDark;
  ctx.lineWidth = 1.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-7, -6);
  ctx.lineTo(-2, -4.4);
  ctx.moveTo(7, -6);
  ctx.lineTo(2, -4.4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-2, 4);
  ctx.quadraticCurveTo(0, 5.4, 2, 4);
  ctx.stroke();

  ctx.restore();
}

/* ---------------- 敌人：飘飘鸟 ---------------- */

function drawFlutter(ctx, x, y, size, p, t) {
  const s = size / 30;
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 6) * 2.2);
  ctx.scale(s, s);
  shadow(ctx, 0, 19, 9, 3, 'rgba(0,0,0,0.25)');

  // 尾巴
  ctx.fillStyle = p.bodyDark;
  triangle(ctx, -7, 2, -16, 6, -7, 7);
  ctx.fill();

  // 翅膀
  const flap = Math.sin(t * 12) * 0.35;
  for (const dir of [-1, 1]) {
    ctx.save();
    ctx.translate(dir * 7, -1);
    ctx.rotate(dir * flap);
    ctx.fillStyle = p.wing;
    ellipse(ctx, dir * 4, 0, 8, 4.4);
    ctx.fill();
    ctx.restore();
  }

  // 身体
  ctx.fillStyle = p.body;
  ellipse(ctx, 0, 1, 9.5, 8.5);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ellipse(ctx, -2, 3.4, 5, 3);
  ctx.fill();

  // 喙
  ctx.fillStyle = p.beak;
  triangle(ctx, 8, 0, 14, 2, 8, 4);
  ctx.fill();

  // 眼睛
  ctx.fillStyle = p.eye;
  ellipse(ctx, 3.2, -2.2, 2, 2.4);
  ctx.fill();
  ellipse(ctx, -2.4, -2.2, 2, 2.4);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(3.9, -2.9, 0.65, 0, Math.PI * 2);
  ctx.arc(-1.7, -2.9, 0.65, 0, Math.PI * 2);
  ctx.fill();

  // 飘浮的小光点
  ctx.fillStyle = p.glow;
  ctx.globalAlpha = 0.45 + Math.sin(t * 4) * 0.2;
  ctx.beginPath();
  ctx.arc(-12, -9, 1.4, 0, Math.PI * 2);
  ctx.arc(12, 8, 1.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.restore();
}

/* ---------------- 敌人：喷籽花 ---------------- */

function drawSpitter(ctx, x, y, size, p, t) {
  const s = size / 36;
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 2.5) * 0.7);
  ctx.scale(s, s);
  shadow(ctx, 0, 17, 12, 4.6, 'rgba(0,0,0,0.3)');

  // 叶子
  ctx.fillStyle = p.leaf;
  ellipse(ctx, -10, 8, 7, 3.4, -0.5);
  ctx.fill();
  ellipse(ctx, 9, 9, 6, 3, 0.55);
  ctx.fill();

  // 茎
  ctx.fillStyle = p.bodyDark;
  rr(ctx, -2, 3, 4, 13, 2);
  ctx.fill();

  // 花苞身体
  ctx.fillStyle = p.body;
  ellipse(ctx, 0, -2, 12, 12);
  ctx.fill();
  ctx.fillStyle = p.bodyDark;
  ctx.globalAlpha = 0.35;
  ellipse(ctx, -4, 2, 5, 6);
  ctx.fill();
  ctx.globalAlpha = 1;

  // 花瓣
  ctx.fillStyle = p.glow;
  ctx.globalAlpha = 0.85;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ellipse(ctx, Math.cos(a) * 9, -10 + Math.sin(a) * 6, 5, 3, a);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // 吐种子的花管
  ctx.fillStyle = p.bodyDark;
  rr(ctx, 8, -6, 14, 7, 3.5);
  ctx.fill();
  ctx.fillStyle = p.seed;
  ctx.beginPath();
  ctx.arc(22, -2.5, 3, 0, Math.PI * 2);
  ctx.fill();

  // 眼睛
  ctx.fillStyle = p.eye;
  ellipse(ctx, -2.5, -3, 2, 2.3);
  ctx.fill();
  ellipse(ctx, 3.5, -3, 2, 2.3);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-1.9, -3.7, 0.6, 0, Math.PI * 2);
  ctx.arc(4.1, -3.7, 0.6, 0, Math.PI * 2);
  ctx.fill();

  // 飘出的种子
  ctx.fillStyle = p.seed;
  for (let i = 0; i < 3; i++) {
    const a = t * 3 + i * 2.2;
    ctx.globalAlpha = 0.5;
    ellipse(ctx, 25 + Math.cos(a) * 3, -2 + Math.sin(a) * 4, 1.6, 2.2, a);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.restore();
}

/* ---------------- 敌人：壳壳兽 ---------------- */

function drawBrute(ctx, x, y, size, p, t) {
  const s = size / 52;
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 2.4) * 0.8);
  ctx.scale(s, s);
  shadow(ctx, 0, 25, 20, 7, 'rgba(0,0,0,0.34)');

  // 四条短腿
  ctx.fillStyle = p.bodyDark;
  for (const [lx, ly] of [[-13, 15], [-5, 17], [6, 17], [14, 15]]) {
    rr(ctx, lx - 3.5, ly, 7, 8, 3.5);
    ctx.fill();
  }

  // 壳
  ctx.fillStyle = p.shell;
  ellipse(ctx, 0, -3, 24, 19);
  ctx.fill();
  ctx.strokeStyle = p.bodyDark;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.arc(0, -3, 18, Math.PI * 1.12, Math.PI * 1.88);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -3, 12, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // 苔藓
  ctx.fillStyle = p.moss;
  ctx.globalAlpha = 0.75;
  ellipse(ctx, -10, -9, 5, 3.2, -0.4);
  ctx.fill();
  ellipse(ctx, 8, -5, 4, 2.6, 0.3);
  ctx.fill();
  ctx.globalAlpha = 1;

  // 头
  ctx.fillStyle = p.body;
  ellipse(ctx, 0, -20, 10, 8.5);
  ctx.fill();
  ctx.fillStyle = p.bodyDark;
  ellipse(ctx, -7, -25, 3, 3.6);
  ctx.fill();
  ellipse(ctx, 7, -25, 3, 3.6);
  ctx.fill();
  ctx.fillStyle = p.eye;
  ellipse(ctx, -3.5, -21, 2, 2.2);
  ctx.fill();
  ellipse(ctx, 3.5, -21, 2, 2.2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-3, -21.6, 0.6, 0, Math.PI * 2);
  ctx.arc(4, -21.6, 0.6, 0, Math.PI * 2);
  ctx.fill();

  // 小嘴
  ctx.strokeStyle = p.bodyDark;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-2, -16.5);
  ctx.quadraticCurveTo(0, -15, 2, -16.5);
  ctx.stroke();

  ctx.restore();
}

/* ---------------- 敌人：冲撞兽 ---------------- */

function drawDart(ctx, x, y, size, p, t, opts = {}) {
  const s = size / 30;
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 8) * 0.6);
  ctx.scale(s, s);
  shadow(ctx, 0, 12, 11, 4, 'rgba(0,0,0,0.3)');

  // 跑动扬起的尘土
  ctx.fillStyle = p.bodyDark;
  ctx.globalAlpha = 0.18;
  ellipse(ctx, -17, 8, 4.5, 2.4);
  ctx.fill();
  ellipse(ctx, -22, 5, 3, 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // 尾巴
  ctx.strokeStyle = p.bodyDark;
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-12, -1);
  ctx.quadraticCurveTo(-18, -5, -17, 1);
  ctx.stroke();

  // 腿
  ctx.fillStyle = p.hoof;
  rr(ctx, -8, 7, 5, 5, 2);
  ctx.fill();
  rr(ctx, 4, 7, 5, 5, 2);
  ctx.fill();

  // 身体
  ctx.fillStyle = p.body;
  ellipse(ctx, 0, 0, 13, 9);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ellipse(ctx, -3, -3, 7, 4);
  ctx.fill();

  // 头
  ctx.fillStyle = p.body;
  ellipse(ctx, 11, -4, 8, 7);
  ctx.fill();
  ctx.fillStyle = p.bodyDark;
  ellipse(ctx, 17, -1, 5.5, 3.6);
  ctx.fill();
  ctx.fillStyle = p.eye;
  ctx.beginPath();
  ctx.arc(18.2, -1.8, 1, 0, Math.PI * 2);
  ctx.fill();

  // 角
  ctx.fillStyle = p.horn;
  triangle(ctx, 9, -10, 20, -15, 15, -5);
  ctx.fill();

  // 耳朵
  ctx.fillStyle = p.bodyDark;
  triangle(ctx, 5, -10, 2, -16, 10, -11);
  ctx.fill();

  // 眼睛
  ctx.fillStyle = p.eye;
  ellipse(ctx, 10, -6, 1.8, 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(10.5, -6.6, 0.55, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/* ---------------- 敌人：铁甲虫 ---------------- */

function drawGuard(ctx, x, y, size, p, t) {
  const s = size / 46;
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 2.2) * 0.6);
  ctx.scale(s, s);
  shadow(ctx, 0, 21, 18, 6, 'rgba(0,0,0,0.3)');

  // 六条腿
  ctx.strokeStyle = p.bodyDark;
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  for (const [sx, sy, ex, ey] of [
    [-7, 7, -18, 15], [-2, 9, -10, 19], [4, 9, 10, 19],
    [9, 7, 19, 15],
  ]) {
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
  }

  // 身体
  ctx.fillStyle = p.body;
  ellipse(ctx, -1, 1, 17, 13);
  ctx.fill();

  // 背甲
  ctx.fillStyle = p.plate;
  ellipse(ctx, -4, -1, 16, 13);
  ctx.fill();
  ctx.strokeStyle = p.bodyDark;
  ctx.lineWidth = 1.6;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.moveTo(-18, -1);
  ctx.lineTo(9, -1);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // 正面盾壳
  ctx.fillStyle = p.plate;
  rr(ctx, -26, -12, 12, 24, 6);
  ctx.fill();
  ctx.strokeStyle = p.rivet;
  ctx.lineWidth = 1.8;
  ctx.globalAlpha = 0.75;
  ctx.strokeRect(-23, -8, 6, 16);
  ctx.globalAlpha = 1;
  ctx.fillStyle = p.rivet;
  for (const ry of [-7, 0, 7]) {
    ctx.beginPath();
    ctx.arc(-19, ry, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // 头
  ctx.fillStyle = p.body;
  ellipse(ctx, 13, -4, 7, 7);
  ctx.fill();
  ctx.strokeStyle = p.bodyDark;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(15, -10);
  ctx.quadraticCurveTo(20, -16, 23, -12);
  ctx.moveTo(11, -10);
  ctx.quadraticCurveTo(10, -17, 15, -17);
  ctx.stroke();
  ctx.fillStyle = p.eye;
  ellipse(ctx, 13, -5, 2, 2.3);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(13.6, -5.7, 0.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/* ---------------- 敌人：噗噗果 ---------------- */

function drawBomber(ctx, x, y, size, p, t, opts = {}) {
  const s = size / 30;
  const fuse = Math.max(0, Math.min(1, opts.fuse || 0));
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 8) * 0.8);
  ctx.scale(s * (1 + fuse * 0.06), s * (1 + fuse * 0.06));
  shadow(ctx, 0, 14, 9, 3.4, 'rgba(0,0,0,0.3)');

  // 小脚
  ctx.fillStyle = p.bodyDark;
  ellipse(ctx, -5, 11, 3.4, 2.6);
  ctx.fill();
  ellipse(ctx, 5, 11, 3.4, 2.6);
  ctx.fill();

  // 果实身体
  ctx.fillStyle = p.body;
  ellipse(ctx, 0, 1, 12, 11.5);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.24)';
  ellipse(ctx, -4, -4, 5, 4);
  ctx.fill();

  // 顶上的叶子
  ctx.fillStyle = p.leaf;
  ellipse(ctx, 4, -12, 6, 3.4, -0.5);
  ctx.fill();
  ellipse(ctx, -2, -12, 4.6, 2.8, 0.4);
  ctx.fill();

  // 引信
  ctx.strokeStyle = p.bodyDark;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, -11);
  ctx.quadraticCurveTo(2, -18, 6, -19);
  ctx.stroke();

  // 引信火花
  const blink = fuse > 0 ? 0.4 + Math.abs(Math.sin(t * 24)) * 0.6 : 0.35 + Math.sin(t * 4) * 0.15;
  ctx.fillStyle = p.spark;
  ctx.globalAlpha = blink;
  ctx.beginPath();
  ctx.arc(6, -19, 2.2 + fuse * 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  if (fuse > 0) {
    ctx.fillStyle = p.spark;
    for (let i = 0; i < 3; i++) {
      const a = t * 18 + i * 2.1;
      ctx.beginPath();
      ctx.arc(6 + Math.cos(a) * 5, -19 + Math.sin(a) * 3, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 眼睛
  ctx.fillStyle = p.eye;
  ellipse(ctx, -3.5, -1, 2, 2.2);
  ctx.fill();
  ellipse(ctx, 3.5, -1, 2, 2.2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-3, -1.7, 0.6, 0, Math.PI * 2);
  ctx.arc(4, -1.7, 0.6, 0, Math.PI * 2);
  ctx.fill();

  // 鼓起的嘴
  ctx.strokeStyle = p.bodyDark;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-2, 4);
  ctx.quadraticCurveTo(0, 5.6, 2, 4);
  ctx.stroke();

  // 核心微光
  ctx.fillStyle = p.core;
  ctx.globalAlpha = 0.25 + fuse * 0.4;
  ellipse(ctx, 0, 4, 4, 3);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.restore();
}

/* ---------------- 敌人：巢巢兽 ---------------- */

function drawNester(ctx, x, y, size, p, t) {
  const s = size / 42;
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 2.4) * 0.8);
  ctx.scale(s, s);
  shadow(ctx, 0, 20, 19, 5.6, 'rgba(0,0,0,0.32)');

  // 鸟尾
  ctx.fillStyle = p.bodyDark;
  triangle(ctx, -10, 4, -22, 10, -10, 12);
  ctx.fill();

  // 身体
  ctx.fillStyle = p.body;
  ellipse(ctx, 0, 1, 14, 12);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ellipse(ctx, 1, 5, 8, 5);
  ctx.fill();

  // 翅膀
  ctx.fillStyle = p.bodyDark;
  ellipse(ctx, -11, 3, 6, 9, 0.2);
  ctx.fill();

  // 头
  ctx.fillStyle = p.body;
  ellipse(ctx, 8, -10, 8, 7.5);
  ctx.fill();
  ctx.fillStyle = p.eye;
  ellipse(ctx, 10, -11, 1.8, 2.1);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(10.5, -11.7, 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.nest;
  triangle(ctx, 15, -10, 21, -8, 15, -6);
  ctx.fill();

  // 巢
  ctx.fillStyle = p.nest;
  ellipse(ctx, 0, 14, 20, 7);
  ctx.fill();
  ctx.strokeStyle = p.bodyDark;
  ctx.lineWidth = 1.2;
  ctx.globalAlpha = 0.55;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.arc(i * 6, 14, 5, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // 巢里的蛋
  ctx.fillStyle = p.egg;
  ellipse(ctx, -7, 10, 4, 5, -0.2);
  ctx.fill();
  ellipse(ctx, 1, 9, 4, 5, 0.15);
  ctx.fill();

  // 巢的前沿
  ctx.fillStyle = p.nest;
  ctx.beginPath();
  ctx.ellipse(0, 14, 20, 8, 0, 0, Math.PI);
  ctx.fill();

  ctx.restore();
}

/* ---------------- 敌人：荧光菇 ---------------- */

function drawGlowcap(ctx, x, y, size, p, t) {
  const s = size / 34;
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 2) * 0.7);
  ctx.scale(s, s);
  shadow(ctx, 0, 17, 10, 4, 'rgba(0,0,0,0.28)');

  // 柔光
  ctx.fillStyle = p.light;
  ctx.globalAlpha = 0.15 + Math.sin(t * 3) * 0.05;
  ctx.beginPath();
  ctx.arc(0, -3, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // 菌柄
  ctx.fillStyle = p.body;
  rr(ctx, -4, 0, 8, 14, 4);
  ctx.fill();

  // 菌盖
  ctx.fillStyle = p.bodyDark;
  ellipse(ctx, 0, -5, 15, 10);
  ctx.fill();
  ctx.fillStyle = p.body;
  ellipse(ctx, 0, -7, 14, 9);
  ctx.fill();
  ctx.fillStyle = p.spot;
  ctx.globalAlpha = 0.75;
  for (const [sx, sy, r] of [[-7, -8, 2.4], [2, -11, 2], [8, -6, 1.8], [-1, -4, 1.5]]) {
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // 菌褶
  ctx.strokeStyle = p.bodyDark;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.5;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 4, -2);
    ctx.lineTo(i * 3, 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // 眼睛
  ctx.fillStyle = p.eye;
  ellipse(ctx, -1.8, 6, 1.6, 1.9);
  ctx.fill();
  ellipse(ctx, 2.2, 6, 1.6, 1.9);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-1.3, 5.4, 0.5, 0, Math.PI * 2);
  ctx.arc(2.7, 5.4, 0.5, 0, Math.PI * 2);
  ctx.fill();

  // 飘散的孢子
  ctx.fillStyle = p.light;
  for (let i = 0; i < 3; i++) {
    const a = t * 2 + i * 2.1;
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * 14, -8 + Math.sin(a) * 5, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.restore();
}

/* ---------------- 召唤物：小绒球 ---------------- */

function drawMite(ctx, x, y, size, p, t) {
  const s = size / 18;
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 9) * 0.8);
  ctx.scale(s, s);
  shadow(ctx, 0, 9, 6, 2.2, 'rgba(0,0,0,0.25)');

  ctx.fillStyle = p.body;
  ellipse(ctx, 0, 0, 8, 7.5);
  ctx.fill();
  ctx.fillStyle = p.spark;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.arc(-5, -6, 1.6, 0, Math.PI * 2);
  ctx.arc(5, -6, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // 小脚
  ctx.fillStyle = p.bodyDark;
  ellipse(ctx, -3, 7, 2, 1.6);
  ctx.fill();
  ellipse(ctx, 3, 7, 2, 1.6);
  ctx.fill();

  // 眼睛
  ctx.fillStyle = p.eye;
  ellipse(ctx, -2.4, -1, 1.2, 1.5);
  ctx.fill();
  ellipse(ctx, 2.4, -1, 1.2, 1.5);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-2, -1.5, 0.4, 0, Math.PI * 2);
  ctx.arc(2.8, -1.5, 0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/* ---------------- Boss：暴走巨兽「隆隆」 ---------------- */

function drawBoss(ctx, x, y, size, p, t, phase = 1) {
  const s = size / 104;
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 2.2) * 1.4);
  ctx.scale(s, s);
  shadow(ctx, 0, 50, 38, 12, 'rgba(0,0,0,0.4)');

  // 双脚
  ctx.fillStyle = p.bodyDark;
  rr(ctx, -27, 32, 20, 18, 9);
  ctx.fill();
  rr(ctx, 7, 32, 20, 18, 9);
  ctx.fill();

  // 手臂
  ctx.fillStyle = p.bodyDark;
  ellipse(ctx, -37, 8, 10, 21, -0.18);
  ctx.fill();
  ellipse(ctx, 37, 8, 10, 21, 0.18);
  ctx.fill();
  ctx.strokeStyle = p.horn;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (const dir of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(dir * 40, 20 + i * 4);
      ctx.lineTo(dir * 48, 24 + i * 5);
      ctx.stroke();
    }
  }

  // 身体
  ctx.fillStyle = p.body;
  ellipse(ctx, 0, 10, 40, 34);
  ctx.fill();
  ctx.fillStyle = p.bodyDark;
  ctx.globalAlpha = 0.45;
  ellipse(ctx, 0, 18, 26, 22);
  ctx.fill();
  ctx.globalAlpha = 1;

  // 鬃毛
  ctx.fillStyle = p.bodyDark;
  for (let i = 0; i < 9; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * 30, -18 + Math.sin(a) * 22, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // 头
  ctx.fillStyle = p.body;
  ellipse(ctx, 0, -30, 27, 24);
  ctx.fill();

  // 角
  ctx.fillStyle = p.horn;
  triangle(ctx, -18, -48, -34, -62, -10, -55);
  ctx.fill();
  triangle(ctx, 18, -48, 34, -62, 10, -55);
  ctx.fill();

  // 耳朵
  ctx.fillStyle = p.bodyDark;
  ellipse(ctx, -27, -32, 7, 10, -0.3);
  ctx.fill();
  ellipse(ctx, 27, -32, 7, 10, 0.3);
  ctx.fill();

  // 眼睛
  const pulse = phase >= 3 ? 0.6 + Math.sin(t * 12) * 0.3 : 0.7 + Math.sin(t * 5) * 0.18;
  ctx.fillStyle = p.eye;
  ctx.globalAlpha = pulse;
  ellipse(ctx, -10, -34, 6, 5);
  ctx.fill();
  ellipse(ctx, 10, -34, 6, 5);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-8.4, -35.4, 1.6, 0, Math.PI * 2);
  ctx.arc(11.6, -35.4, 1.6, 0, Math.PI * 2);
  ctx.fill();

  // 眉毛
  ctx.strokeStyle = p.bodyDark;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-18, -43);
  ctx.lineTo(-6, -40);
  ctx.moveTo(18, -43);
  ctx.lineTo(6, -40);
  ctx.stroke();

  // 嘴
  ctx.fillStyle = p.bodyDark;
  ellipse(ctx, 0, -19, 11, 6);
  ctx.fill();
  ctx.fillStyle = p.horn;
  for (const fx of [-6, 0, 6]) {
    triangle(ctx, fx - 2, -22, fx, -17, fx + 2, -22);
    ctx.fill();
  }

  // 胸口的光
  ctx.fillStyle = p.core;
  ctx.globalAlpha = 0.3 + Math.sin(t * 4) * 0.15;
  ellipse(ctx, 0, 12, 9, 7);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.restore();
}

/* ---------------- 投射物 / 掉落 / 陷阱 ---------------- */

function drawOrb(ctx, x, y, size, p, theme, t = 0) {
  const r = size / 2;
  ctx.save();
  ctx.translate(x, y);
  if (theme.glow) {
    ctx.shadowColor = p.glow;
    ctx.shadowBlur = 10;
  }
  ctx.fillStyle = p.glow;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = p.core;
  ctx.beginPath();
  ctx.arc(-r * 0.15, -r * 0.15, r * 0.58, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = p.edge;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawCoin(ctx, x, y, size, p, t) {
  const r = size / 2;
  ctx.save();
  ctx.translate(x, y);
  const squash = Math.abs(Math.cos(t * 3));
  ctx.fillStyle = p.glow;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * (0.45 + squash * 0.55), r, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.core;
  ctx.beginPath();
  ctx.ellipse(-r * 0.1, -r * 0.1, r * 0.3 * (0.4 + squash * 0.6), r * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawTrap(ctx, x, y, size, p, armed) {
  const s = size / 26;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);

  // 绳圈
  ctx.strokeStyle = p.metalDark;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.ellipse(0, 0, 11, 8, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = p.metal;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(0, 0, 8.4, 5.8, 0, 0, Math.PI * 2);
  ctx.stroke();

  // 绳结和木桩
  ctx.fillStyle = p.metalDark;
  ctx.beginPath();
  ctx.arc(9, 4, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = p.metalDark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(11, 6);
  ctx.lineTo(15, 11);
  ctx.stroke();

  if (armed) {
    ctx.strokeStyle = p.glow;
    ctx.lineWidth = 1.6;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawGlyph(ctx, x, y, size, p, glyph, t) {
  const s = size / 28;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (glyph === 'yarn') {
    ctx.fillStyle = p.a;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = p.c;
    ctx.lineWidth = 1.8;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, 8 - i * 2.2, -0.4, Math.PI * 1.2);
      ctx.stroke();
    }
    ctx.strokeStyle = p.b;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(8, 3);
    ctx.quadraticCurveTo(13, 7, 10, 11);
    ctx.stroke();
  } else if (glyph === 'mallet') {
    ctx.strokeStyle = p.c;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-7, 9);
    ctx.lineTo(3, -3);
    ctx.stroke();
    ctx.save();
    ctx.translate(4, -5);
    ctx.rotate(-0.7);
    ctx.fillStyle = p.a;
    rr(ctx, -8, -5, 16, 10, 3);
    ctx.fill();
    ctx.fillStyle = p.b;
    rr(ctx, -6, -3, 4, 6, 1.5);
    ctx.fill();
    ctx.restore();
  } else if (glyph === 'horn') {
    ctx.fillStyle = p.a;
    ctx.beginPath();
    ctx.moveTo(-10, -7);
    ctx.lineTo(5, -10);
    ctx.lineTo(9, 0);
    ctx.lineTo(5, 10);
    ctx.lineTo(-10, 7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = p.c;
    triangle(ctx, 8, -2, 14, -5, 14, 5);
    ctx.fill();
    ctx.strokeStyle = p.b;
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(-11 - i * 4, 0, 6 + i * 2, -0.7, 0.7);
      ctx.stroke();
    }
  } else if (glyph === 'flashlight') {
    ctx.fillStyle = p.a;
    rr(ctx, -11, -5, 12, 10, 3);
    ctx.fill();
    ctx.fillStyle = p.b;
    triangle(ctx, 1, -7, 12, -11, 12, 11);
    ctx.fill();
    ctx.fillStyle = p.c;
    rr(ctx, -13, -4, 3, 8, 1.5);
    ctx.fill();
    ctx.strokeStyle = p.b;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(12, -7);
    ctx.lineTo(17, -9);
    ctx.moveTo(12, 7);
    ctx.lineTo(17, 9);
    ctx.stroke();
  } else if (glyph === 'pinwheel') {
    ctx.fillStyle = p.a;
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + 0.3;
      ctx.save();
      ctx.rotate(a);
      triangle(ctx, 0, 0, 10, -4, 4, 4);
      ctx.fill();
      ctx.restore();
    }
    ctx.strokeStyle = p.c;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 12);
    ctx.stroke();
    ctx.fillStyle = p.b;
    ctx.beginPath();
    ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (glyph === 'snare') {
    ctx.strokeStyle = p.a;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = p.c;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0.4, Math.PI * 1.7);
    ctx.stroke();
    ctx.fillStyle = p.b;
    ctx.beginPath();
    ctx.arc(7, 6, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = p.b;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(7, 7);
    ctx.lineTo(12, 12);
    ctx.stroke();
  } else if (glyph === 'scarf') {
    ctx.strokeStyle = p.a;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-10, -5);
    ctx.bezierCurveTo(-4, -12, 3, 2, 10, -4);
    ctx.stroke();
    ctx.fillStyle = p.c;
    ctx.beginPath();
    ctx.arc(1, -1, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.a;
    triangle(ctx, 2, 1, 9, 10, 4, 12);
    ctx.fill();
    triangle(ctx, 1, 1, -4, 11, 1, 12);
    ctx.fill();
  } else if (glyph === 'glove') {
    ctx.fillStyle = p.a;
    ctx.beginPath();
    ctx.moveTo(-7, 8);
    ctx.lineTo(-8, -2);
    ctx.quadraticCurveTo(-8, -9, -1, -9);
    ctx.quadraticCurveTo(5, -9, 5, -3);
    ctx.lineTo(6, 2);
    ctx.quadraticCurveTo(8, 8, 2, 9);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-8, 2, 4, 3, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.b;
    rr(ctx, -9, 8, 16, 4, 2);
    ctx.fill();
    ctx.strokeStyle = p.c;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-3, 8);
    ctx.lineTo(-3, 12);
    ctx.moveTo(2, 8);
    ctx.lineTo(2, 12);
    ctx.stroke();
  } else if (glyph === 'band') {
    ctx.strokeStyle = p.a;
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.ellipse(0, 1, 10, 7, -0.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = p.b;
    ctx.beginPath();
    ctx.arc(9, -6, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.c;
    triangle(ctx, 9, -3, 13, 1, 8, 2);
    ctx.fill();
    triangle(ctx, 9, -3, 5, 1, 10, 2);
    ctx.fill();
  } else if (glyph === 'pouch') {
    ctx.fillStyle = p.a;
    ctx.beginPath();
    ctx.moveTo(-9, -2);
    ctx.quadraticCurveTo(-11, 9, 0, 10);
    ctx.quadraticCurveTo(11, 9, 9, -2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = p.c;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-9, -2);
    ctx.quadraticCurveTo(0, 4, 9, -2);
    ctx.stroke();
    ctx.fillStyle = p.b;
    ctx.beginPath();
    ctx.arc(-3, -4, 2, 0, Math.PI * 2);
    ctx.arc(3, -4, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (glyph === 'candy') {
    ctx.fillStyle = p.a;
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.c;
    triangle(ctx, -6, -4, -13, -7, -13, 5);
    ctx.fill();
    triangle(ctx, 6, -4, 13, -7, 13, 5);
    ctx.fill();
    ctx.strokeStyle = p.b;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, -0.9, 1.3);
    ctx.arc(0, 0, 2, 1.6, 3.4);
    ctx.stroke();
  } else if (glyph === 'box') {
    ctx.fillStyle = p.a;
    rr(ctx, -9, -4, 18, 13, 3);
    ctx.fill();
    ctx.fillStyle = p.b;
    rr(ctx, -10, -8, 20, 5, 2);
    ctx.fill();
    ctx.strokeStyle = p.c;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -8, 4, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = p.c;
    rr(ctx, -2, 1, 4, 4, 1);
    ctx.fill();
  } else if (glyph === 'soup') {
    ctx.fillStyle = p.a;
    rr(ctx, -7, -4, 14, 14, 3);
    ctx.fill();
    ctx.fillStyle = p.b;
    ctx.beginPath();
    ctx.ellipse(0, -4, 7, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = p.c;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-8, -6);
    ctx.quadraticCurveTo(-10, -11, -6, -13);
    ctx.moveTo(0, -6);
    ctx.quadraticCurveTo(-2, -12, 2, -14);
    ctx.moveTo(7, -6);
    ctx.quadraticCurveTo(5, -11, 9, -12);
    ctx.stroke();
  } else if (glyph === 'bell') {
    ctx.fillStyle = p.a;
    ctx.beginPath();
    ctx.moveTo(-9, 5);
    ctx.quadraticCurveTo(-8, -8, 0, -9);
    ctx.quadraticCurveTo(8, -8, 9, 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = p.c;
    rr(ctx, -10, 5, 20, 3, 1.5);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 9, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = p.b;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -9, 3, Math.PI, Math.PI * 2);
    ctx.stroke();
  } else if (glyph === 'scope') {
    ctx.save();
    ctx.rotate(-0.35);
    ctx.fillStyle = p.a;
    rr(ctx, -10, -4, 14, 8, 3);
    ctx.fill();
    ctx.fillStyle = p.c;
    rr(ctx, 2, -5, 9, 10, 3);
    ctx.fill();
    ctx.fillStyle = p.b;
    ctx.beginPath();
    ctx.ellipse(11, 0, 2.4, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = p.b;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-8, -4);
    ctx.lineTo(-8, 4);
    ctx.moveTo(-4, -4);
    ctx.lineTo(-4, 4);
    ctx.stroke();
    ctx.restore();
  } else {
    // heart
    ctx.fillStyle = p.a;
    ctx.beginPath();
    ctx.moveTo(0, 9);
    ctx.bezierCurveTo(-14, 0, -9, -11, 0, -4);
    ctx.bezierCurveTo(9, -11, 14, 0, 0, 9);
    ctx.fill();
    ctx.fillStyle = p.b;
    ctx.beginPath();
    ctx.arc(-4, -1, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/* ---------------- 统一入口 ---------------- */

export function drawSprite(ctx, spriteId, x, y, opts = {}) {
  const theme = opts.theme;
  const sprite = resolveSprite(spriteId, theme.id);
  const t = opts.t ?? 0;
  const p = sprite.palette;
  const size = opts.size ?? sprite.size ?? 30;

  switch (sprite.kind) {
    case 'fluff':
      return drawFluff(ctx, x, y, size, p, t);
    case 'flutter':
      return drawFlutter(ctx, x, y, size, p, t);
    case 'spitter':
      return drawSpitter(ctx, x, y, size, p, t);
    case 'brute':
      return drawBrute(ctx, x, y, size, p, t);
    case 'dart':
      return drawDart(ctx, x, y, size, p, t, opts);
    case 'guard':
      return drawGuard(ctx, x, y, size, p, t);
    case 'bomber':
      return drawBomber(ctx, x, y, size, p, t, opts);
    case 'nester':
      return drawNester(ctx, x, y, size, p, t);
    case 'glowcap':
      return drawGlowcap(ctx, x, y, size, p, t);
    case 'mite':
      return drawMite(ctx, x, y, size, p, t);
    case 'boss':
      return drawBoss(ctx, x, y, size, p, t, opts.phase ?? 1);
    case 'orb':
      return drawOrb(ctx, x, y, size, p, theme, t);
    case 'xp':
      return drawXp(ctx, x, y, size, p, t);
    case 'coin':
      return drawCoin(ctx, x, y, size, p, t);
    case 'trap':
      return drawTrap(ctx, x, y, size, p, opts.armed !== false);
    case 'glyph':
      return drawGlyph(ctx, x, y, size, p, sprite.glyph, t);
    case 'image':
      return drawCharImage(ctx, x, y, size, sprite, opts);
    default:
      return null;
  }
}

function drawXp(ctx, x, y, size, p, t) {
  const r = size / 2;
  const pulse = 1 + Math.sin(t * 5 + x * 0.05) * 0.12;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = p.glow;
  ctx.beginPath();
  ctx.moveTo(0, -r * 1.25);
  ctx.lineTo(r * 1.05, 0);
  ctx.lineTo(0, r * 1.25);
  ctx.lineTo(-r * 1.05, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = p.core;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.62);
  ctx.lineTo(r * 0.52, 0);
  ctx.lineTo(0, r * 0.62);
  ctx.lineTo(-r * 0.52, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** React 里用的小图标：把同一套绘制画到离屏 canvas。 */
export function drawSpriteIcon(canvas, spriteId, theme, size = 40) {
  const dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
  canvas.width = Math.round(size * dpr);
  canvas.height = Math.round(size * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);
  drawSprite(ctx, spriteId, size / 2, size / 2, { theme, size: size * 0.78, t: 0.6 });
}
/* ---------------- 图片素材角色 ---------------- */

/**
 * 素材统一按"内容宽度 192px、四边贴合内容"导出（见 content/assets.js 的说明），
 * 所以这里只按同一系数缩放即可，三个角色的相对比例天然保持一致。
 *
 * 屏上内容宽度 = size * 0.70（玩家 size=46 时约 32px，与 PLAYER_RADIUS*2 = 30px
 * 的判定直径相当）；脚底与程序化小动物对齐在 y + size * 16 / 44，正好落在渲染器
 * 画好的投影椭圆上。
 *
 * 素材是正面视角（左右对称度 74%~85%），因此不随 facing 做水平镜像：
 * 镜像对正面像没有方向意义，反而会翻掉角色自身的特征。
 */
const IMAGE_CONTENT_W = 192;
const IMAGE_SIZE_RATIO = 0.7;
const IMAGE_FOOT_RATIO = 16 / 44;

/**
 * 图集单帧：与静态立绘共用同一条屏幕基线和内容宽度。
 * scale 由 192 的内容宽度推出，所以每一格 256 都在同一比例下画，
 * 脚底落在 anchor.y，水平中心落在 anchor.x，和渲染器画的投影对齐。
 */
function drawAnimFrame(ctx, x, y, size, cfg, img, anim) {
  const scale = (size * IMAGE_SIZE_RATIO) / IMAGE_CONTENT_W;
  const cell = cfg.cell * scale;
  const frame = animFrame(anim.elapsed, cfg.fps[anim.state], cfg.frames[anim.state]);
  const footY = y + size * IMAGE_FOOT_RATIO;

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    img,
    frame * cfg.cell, 0, cfg.cell, cfg.cell,
    x - cfg.anchor.x * scale, footY - cfg.anchor.y * scale, cell, cell,
  );
  ctx.restore();
}

/** 受击闪白：图片角色与程序化小动物完全一致，保证打击反馈不变。 */
function drawFlash(ctx, x, y, size, flash) {
  if (!(flash > 0)) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.min(0.8, flash * 4);
  ctx.fillStyle = '#fff';
  ellipse(ctx, x, y, size * 0.42, size * 0.42);
  ctx.fill();
  ctx.restore();
}

function drawCharImage(ctx, x, y, size, sprite, opts) {
  // 1) 有图集且已加载 → 画当前帧（帧内已含呼吸/步态，不能再叠 bob/sway，否则双重运动）
  const anim = opts.anim;
  if (anim && sprite.anim) {
    const sheet = getCharSheet(animSheetUrl(sprite.anim, anim.dir, anim.state));
    if (sheet && sheet.ready) {
      drawAnimFrame(ctx, x, y, size, sprite.anim, sheet.img, anim);
      drawFlash(ctx, x, y, size, opts.flash);
      return;
    }
  }

  // 2) 图集缺失 → 现有静态立绘；3) 静态图也没有 → 程序化小动物
  const entry = getCharImage(sprite.image);
  // 图片尚未就绪或环境不支持（如微信小游戏）：退回程序化小动物，永远画得出东西
  if (!entry || !entry.ready) return drawCritter(ctx, x, y, size, sprite, opts);

  const img = entry.img;
  const k = (size * IMAGE_SIZE_RATIO) / IMAGE_CONTENT_W;
  const w = (img.width || IMAGE_CONTENT_W) * k;
  const h = (img.height || IMAGE_CONTENT_W) * k;
  const bob = opts.bob ?? 0;
  // 旋转只做整体姿态：摆动 + 前倾 + 起伏微倾，不做缩放，保持立绘比例
  const rot = (opts.tilt ?? 0) * 0.3 + (opts.sway ?? 0) + (opts.lean ?? 0);

  ctx.save();
  ctx.translate(x, y + bob * 0.6);
  if (rot) ctx.rotate(rot);
  ctx.imageSmoothingEnabled = true;
  if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, -w / 2, size * IMAGE_FOOT_RATIO - h, w, h);
  ctx.restore();

  drawFlash(ctx, x, y, size, opts.flash);
}