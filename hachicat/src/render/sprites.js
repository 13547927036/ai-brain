/**
 * 程序化美术：每个 kind 一个绘制函数。
 * 这里只读 sprite 定义里的 palette，不读任何游戏数值。
 * 想换图片素材时，在 drawSprite 里加一个 `kind: 'image'` 分支即可。
 */
import { resolveSprite } from '../content/assets.js';
import { getCharImage } from './char-images.js';

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

/* ---------------- 玩家猫 ---------------- */

export function drawCat(ctx, x, y, size, palette, opts = {}) {
  const s = size / 44;
  const facing = opts.facing ?? 1;
  const bob = opts.bob ?? 0;
  const t = opts.t ?? 0;

  ctx.save();
  ctx.translate(x, y + bob * 0.6);
  ctx.scale(facing * s, s);

  // 尾巴（在身后摇摆）
  ctx.strokeStyle = palette.furDark;
  ctx.lineWidth = 4.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-11, 1);
  ctx.quadraticCurveTo(-19, 1 + Math.sin(t * 7) * 3, -17 + Math.sin(t * 5) * 2, -8 + Math.cos(t * 7) * 3);
  ctx.stroke();

  // 身体
  ctx.fillStyle = palette.fur;
  ellipse(ctx, -1, 3, 12.5, 10.5);
  ctx.fill();
  ctx.fillStyle = palette.belly;
  ellipse(ctx, 1, 7, 7.5, 6);
  ctx.fill();

  // 背部条纹
  ctx.strokeStyle = palette.stripe;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-7, -4.5);
  ctx.quadraticCurveTo(-6, -1, -8, 2);
  ctx.moveTo(-11, -3);
  ctx.quadraticCurveTo(-10, 0.5, -12, 3);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // 腿
  ctx.fillStyle = palette.furDark;
  rr(ctx, 1, 10, 5, 6, 2.4);
  ctx.fill();
  rr(ctx, -7, 10, 5, 6, 2.4);
  ctx.fill();

  // 头
  ctx.save();
  ctx.translate(6, -5);
  const headTilt = (opts.tilt ?? 0) * 0.3;
  ctx.rotate(headTilt);

  // 耳朵
  ctx.fillStyle = palette.fur;
  triangle(ctx, -7, -7, -3.2, -15, 0.5, -7.5);
  ctx.fill();
  triangle(ctx, 4, -8, 8.5, -14.5, 11, -6.5);
  ctx.fill();
  ctx.fillStyle = palette.earInner;
  triangle(ctx, -5.4, -7.4, -3.2, -12.4, -1, -7.6);
  ctx.fill();
  triangle(ctx, 5.6, -8, 8.2, -12.2, 9.4, -7.4);
  ctx.fill();

  // 脸
  ctx.fillStyle = palette.fur;
  ellipse(ctx, 2, -2, 11.5, 10);
  ctx.fill();
  // 脸颊浅色
  ctx.fillStyle = palette.belly;
  ctx.globalAlpha = 0.55;
  ellipse(ctx, 4, 2.2, 6.4, 4.2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // 眼睛
  const blink = opts.blink ? 0.15 : 1;
  ctx.fillStyle = palette.eye;
  ellipse(ctx, 6.4, -3.2, 2.5, 2.9 * blink);
  ctx.fill();
  ellipse(ctx, -0.4, -3.6, 2.2, 2.7 * blink);
  ctx.fill();
  if (!opts.blink) {
    ctx.fillStyle = palette.pupil;
    ellipse(ctx, 6.9, -3.0, 1.2, 1.9);
    ctx.fill();
    ellipse(ctx, 0.1, -3.4, 1.1, 1.8);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(7.6, -4.2, 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0.8, -4.5, 0.7, 0, Math.PI * 2);
    ctx.fill();
  }

  // 鼻子 / 嘴
  ctx.fillStyle = palette.nose;
  triangle(ctx, 3.2, 0.4, 5.4, 0.4, 4.3, 1.9);
  ctx.fill();
  ctx.strokeStyle = palette.nose;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(4.3, 1.9);
  ctx.quadraticCurveTo(3.2, 3.4, 2.1, 2.4);
  ctx.moveTo(4.3, 1.9);
  ctx.quadraticCurveTo(5.4, 3.4, 6.5, 2.4);
  ctx.stroke();

  // 胡须
  ctx.strokeStyle = palette.belly;
  ctx.globalAlpha = 0.75;
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(8, 1);
  ctx.lineTo(14, -0.5);
  ctx.moveTo(8, 2.2);
  ctx.lineTo(14.2, 3);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // 围巾
  if (palette.scarf) {
    ctx.fillStyle = palette.scarf;
    ctx.beginPath();
    ctx.moveTo(-5, 4.5);
    ctx.quadraticCurveTo(2, 7.5, 8, 3.5);
    ctx.quadraticCurveTo(2, 5.6, -5, 2.4);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-5, 3.4);
    ctx.quadraticCurveTo(-11, 5 - Math.sin(t * 6) * 1.5, -12.5, 1.4 - Math.sin(t * 6) * 2);
    ctx.quadraticCurveTo(-7.5, 2.6, -5, 1.6);
    ctx.closePath();
    ctx.fill();
  }

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

/* ---------------- 敌人：扫地机 ---------------- */

function drawSweeper(ctx, x, y, size, p, t) {
  const s = size / 34;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  shadow(ctx, 0, 15, 13, 5, 'rgba(0,0,0,0.35)');

  // 轮子
  ctx.fillStyle = p.bodyDark;
  rr(ctx, -11, 8, 8, 7, 3);
  ctx.fill();
  rr(ctx, 3, 8, 8, 7, 3);
  ctx.fill();

  // 刷子（旋转）
  ctx.save();
  ctx.translate(0, 12);
  ctx.rotate(t * 9);
  ctx.strokeStyle = p.brush;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * 8, Math.sin(a) * 3);
    ctx.stroke();
  }
  ctx.restore();

  // 主体
  ctx.fillStyle = p.body;
  rr(ctx, -13, -9, 26, 19, 8);
  ctx.fill();
  ctx.fillStyle = p.bodyDark;
  rr(ctx, -13, 3, 26, 7, 4);
  ctx.fill();

  // 顶盖
  ctx.fillStyle = p.body;
  rr(ctx, -10, -14, 20, 8, 4);
  ctx.fill();

  // 传感器
  ctx.fillStyle = p.eye;
  ellipse(ctx, 0, -10.5, 3.4, 2.4);
  ctx.fill();
  ctx.globalAlpha = 0.35;
  ellipse(ctx, 0, -10.5, 6, 4.4);
  ctx.fill();
  ctx.globalAlpha = 1;

  // 天线
  ctx.strokeStyle = p.bodyDark;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(6, -13);
  ctx.lineTo(9, -20);
  ctx.stroke();
  ctx.fillStyle = p.glow;
  ctx.beginPath();
  ctx.arc(9.5, -21, 2.2 + Math.sin(t * 5) * 0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/* ---------------- 敌人：无人机 ---------------- */

function drawDrone(ctx, x, y, size, p, t) {
  const s = size / 30;
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 6) * 1.6);
  ctx.scale(s, s);
  shadow(ctx, 0, 20, 10, 3.6, 'rgba(0,0,0,0.3)');

  // 旋翼
  ctx.strokeStyle = p.rotor;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.85;
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(dir * 5, -4);
    ctx.lineTo(dir * 15, -9);
    ctx.stroke();
    ctx.save();
    ctx.translate(dir * 15, -9);
    ctx.rotate(t * 22 * dir);
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(6, 0);
    ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  // 机身
  ctx.fillStyle = p.body;
  ellipse(ctx, 0, 1, 9.5, 8);
  ctx.fill();
  ctx.fillStyle = p.bodyDark;
  ellipse(ctx, 0, 4, 6.5, 4);
  ctx.fill();

  // 眼睛
  ctx.fillStyle = p.eye;
  ellipse(ctx, 0, -1, 3.6, 3);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ellipse(ctx, -1, -2, 1, 0.9);
  ctx.fill();

  // 指示灯
  ctx.fillStyle = p.glow;
  ctx.globalAlpha = 0.5 + Math.sin(t * 8) * 0.35;
  ctx.beginPath();
  ctx.arc(0, 7, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.restore();
}

/* ---------------- 敌人：喷水壶 ---------------- */

function drawSpitter(ctx, x, y, size, p, t) {
  const s = size / 36;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  shadow(ctx, 0, 17, 12, 4.6, 'rgba(0,0,0,0.32)');

  // 水箱
  ctx.fillStyle = p.bodyDark;
  rr(ctx, -12, -2, 24, 16, 7);
  ctx.fill();
  ctx.fillStyle = p.body;
  rr(ctx, -10, 0, 20, 12, 6);
  ctx.fill();
  ctx.fillStyle = p.water;
  ctx.globalAlpha = 0.5;
  rr(ctx, -8, 5, 16, 5, 3);
  ctx.fill();
  ctx.globalAlpha = 1;

  // 喷嘴（朝右）
  ctx.fillStyle = p.bodyDark;
  rr(ctx, 8, -6, 12, 5, 2.5);
  ctx.fill();
  ctx.fillStyle = p.glow;
  ctx.beginPath();
  ctx.arc(20.5, -3.5, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // 壶盖
  ctx.fillStyle = p.body;
  rr(ctx, -7, -11, 14, 8, 4);
  ctx.fill();
  ctx.fillStyle = p.eye;
  ellipse(ctx, -2.5, -7.2, 2.2, 2);
  ctx.fill();
  ellipse(ctx, 3.5, -7.2, 2.2, 2);
  ctx.fill();

  // 水滴
  ctx.fillStyle = p.water;
  ctx.globalAlpha = 0.55;
  for (let i = 0; i < 3; i++) {
    const a = t * 3 + i * 2;
    ctx.beginPath();
    ctx.arc(22 + Math.cos(a) * 2, -3.5 + Math.sin(a) * 4, 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.restore();
}

/* ---------------- 敌人：垃圾桶怪 ---------------- */

function drawBrute(ctx, x, y, size, p, t) {
  const s = size / 52;
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 3) * 0.8);
  ctx.scale(s, s);
  shadow(ctx, 0, 25, 19, 7, 'rgba(0,0,0,0.36)');

  // 身体
  ctx.fillStyle = p.body;
  rr(ctx, -17, -18, 34, 40, 8);
  ctx.fill();
  ctx.fillStyle = p.bodyDark;
  rr(ctx, -17, 8, 34, 14, 6);
  ctx.fill();

  // 桶身竖纹
  ctx.strokeStyle = p.bodyDark;
  ctx.lineWidth = 1.6;
  ctx.globalAlpha = 0.7;
  for (const gx of [-9, 0, 9]) {
    ctx.beginPath();
    ctx.moveTo(gx, -14);
    ctx.lineTo(gx, 9);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // 盖子
  ctx.fillStyle = p.lid;
  rr(ctx, -20, -25, 40, 10, 5);
  ctx.fill();
  ctx.fillStyle = p.bodyDark;
  rr(ctx, -4, -31, 8, 7, 3);
  ctx.fill();

  // 眼睛
  ctx.fillStyle = p.eye;
  ctx.globalAlpha = 0.85;
  ellipse(ctx, -7, -6, 3.4, 2.6);
  ctx.fill();
  ellipse(ctx, 7, -6, 3.4, 2.6);
  ctx.fill();
  ctx.globalAlpha = 1;

  // 手臂
  ctx.strokeStyle = p.bodyDark;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-17, 0);
  ctx.lineTo(-24, 6 + Math.sin(t * 4) * 2);
  ctx.moveTo(17, 0);
  ctx.lineTo(24, 6 + Math.cos(t * 4) * 2);
  ctx.stroke();

  // 核心
  ctx.fillStyle = p.glow;
  ctx.globalAlpha = 0.5 + Math.sin(t * 5) * 0.25;
  ctx.beginPath();
  ctx.arc(0, 18, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.restore();
}

/* ---------------- Boss：铁肺 ---------------- */

function drawBoss(ctx, x, y, size, p, t, phase = 1) {
  const s = size / 104;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  shadow(ctx, 0, 44, 38, 13, 'rgba(0,0,0,0.42)');

  // 吸管
  ctx.strokeStyle = p.bodyDark;
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-26, -6);
  ctx.bezierCurveTo(-46, -30 + Math.sin(t * 2) * 5, -20, -52, -4, -44);
  ctx.stroke();
  ctx.strokeStyle = p.body;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-26, -6);
  ctx.bezierCurveTo(-46, -30 + Math.sin(t * 2) * 5, -20, -52, -4, -44);
  ctx.stroke();

  // 轮子
  ctx.fillStyle = p.bodyDark;
  rr(ctx, -30, 28, 20, 14, 7);
  ctx.fill();
  rr(ctx, 10, 28, 20, 14, 7);
  ctx.fill();

  // 机身
  ctx.fillStyle = p.body;
  rr(ctx, -34, -30, 68, 62, 18);
  ctx.fill();
  ctx.fillStyle = p.bodyDark;
  rr(ctx, -34, 10, 68, 22, 14);
  ctx.fill();

  // 面板
  ctx.fillStyle = p.bodyDark;
  rr(ctx, -20, -20, 40, 22, 8);
  ctx.fill();

  // 吸口
  ctx.fillStyle = '#140a10';
  ellipse(ctx, 0, 10, 20, 14);
  ctx.fill();
  ctx.strokeStyle = p.glow;
  ctx.lineWidth = 2.5;
  ctx.globalAlpha = 0.8 + Math.sin(t * 6) * 0.2;
  ellipse(ctx, 0, 10, 20, 14);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // 核心
  const pulse = 0.6 + Math.sin(t * (phase >= 3 ? 12 : 6)) * 0.3;
  ctx.fillStyle = p.core;
  ctx.globalAlpha = pulse;
  ellipse(ctx, 0, -9, 10, 8);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = p.eye;
  ellipse(ctx, -7, -9, 3, 2.4);
  ctx.fill();
  ellipse(ctx, 7, -9, 3, 2.4);
  ctx.fill();

  // 排气
  ctx.fillStyle = p.bodyDark;
  for (let i = 0; i < 4; i++) {
    rr(ctx, 22, -24 + i * 8, 9, 4, 2);
    ctx.fill();
  }

  // 指示灯
  ctx.fillStyle = p.glow;
  for (let i = 0; i < 3; i++) {
    const on = Math.sin(t * 4 + i * 1.4) > 0;
    ctx.globalAlpha = on ? 0.9 : 0.2;
    ctx.beginPath();
    ctx.arc(-26 + i * 6, 30, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
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
  ctx.fillStyle = p.metalDark;
  rr(ctx, -11, -8, 22, 16, 6);
  ctx.fill();
  ctx.fillStyle = p.metal;
  rr(ctx, -9, -6, 18, 12, 5);
  ctx.fill();

  // 齿
  ctx.fillStyle = p.metalDark;
  for (let i = 0; i < 5; i++) {
    triangle(ctx, -9 + i * 4.2, -6, -7 + i * 4.2, -1, -5 + i * 4.2, -6);
    ctx.fill();
    triangle(ctx, -9 + i * 4.2, 6, -7 + i * 4.2, 1, -5 + i * 4.2, 6);
    ctx.fill();
  }
  if (armed) {
    ctx.strokeStyle = p.glow;
    ctx.lineWidth = 1.6;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
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

  if (glyph === 'hairball') {
    ctx.fillStyle = p.a;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = p.c;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 7, Math.sin(a) * 7);
      ctx.lineTo(Math.cos(a) * 11, Math.sin(a) * 11);
      ctx.stroke();
    }
    ctx.fillStyle = p.b;
    ctx.beginPath();
    ctx.arc(-2, -2, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (glyph === 'claw') {
    ctx.strokeStyle = p.a;
    ctx.lineWidth = 4.2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-9 + i * 7, 8);
      ctx.quadraticCurveTo(-6 + i * 7, -2, 2 + i * 5, -9);
      ctx.stroke();
    }
  } else if (glyph === 'hiss') {
    ctx.fillStyle = p.a;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(-5 + i * 5, -2 + i * 2, 5 - i, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = p.b;
    ctx.lineWidth = 2.4;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-3 + i * 4, 4);
      ctx.quadraticCurveTo(0 + i * 4, 8, 4 + i * 4, 6);
      ctx.stroke();
    }
  } else if (glyph === 'laser') {
    ctx.strokeStyle = p.a;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-10, 8);
    ctx.lineTo(9, -8);
    ctx.stroke();
    ctx.fillStyle = p.b;
    ctx.beginPath();
    ctx.arc(9, -8, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.a;
    ctx.beginPath();
    ctx.arc(-10, 8, 2.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (glyph === 'tail') {
    ctx.strokeStyle = p.a;
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0.4, Math.PI * 1.75);
    ctx.stroke();
    ctx.fillStyle = p.b;
    ctx.beginPath();
    ctx.arc(7.6, 3.6, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (glyph === 'trap') {
    ctx.strokeStyle = p.a;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = p.c;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      triangle(
        ctx,
        Math.cos(a) * 8,
        Math.sin(a) * 8,
        Math.cos(a + 0.3) * 3.5,
        Math.sin(a + 0.3) * 3.5,
        Math.cos(a - 0.3) * 3.5,
        Math.sin(a - 0.3) * 3.5
      );
      ctx.fill();
    }
  } else {
    // paw
    ctx.fillStyle = p.a;
    ellipse(ctx, 0, 3, 5.5, 5);
    ctx.fill();
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(-5 + i * 5, -5, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
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
    case 'cat':
      return drawCat(ctx, x, y, size, p, { ...opts, t });
    case 'sweeper':
      return drawSweeper(ctx, x, y, size, p, t);
    case 'drone':
      return drawDrone(ctx, x, y, size, p, t);
    case 'spitter':
      return drawSpitter(ctx, x, y, size, p, t);
    case 'brute':
      return drawBrute(ctx, x, y, size, p, t);
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
 * 的判定直径相当）；脚底与程序化猫对齐在 y + size * 16 / 44，正好落在渲染器
 * 画好的投影椭圆上。
 *
 * 素材是正面视角（左右对称度 74%~85%），因此不随 facing 做水平镜像：
 * 镜像对正面像没有方向意义，反而会翻掉角色自身的特征。
 */
const IMAGE_CONTENT_W = 192;
const IMAGE_SIZE_RATIO = 0.7;
const IMAGE_FOOT_RATIO = 16 / 44;

function drawCharImage(ctx, x, y, size, sprite, opts) {
  const entry = getCharImage(sprite.image);
  // 图片尚未就绪或环境不支持（如微信小游戏）：退回程序化猫，永远画得出东西
  if (!entry || !entry.ready) return drawCat(ctx, x, y, size, sprite.palette, opts);

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

  // 受击闪白与程序化猫完全一致，保证打击反馈不变
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