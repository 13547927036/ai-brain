/**
 * 背景与静态道具：只依赖主题配色 + 随机种子，和玩法无关。
 * 换画风时替换本文件的绘制分支即可。
 */
import { createRng } from '../game/rng.js';
import { ARENA } from '../game/constants.js';

const PROP_TYPES = ['flower', 'grass', 'stone', 'sign', 'bush'];

export function createProps(themeId, seed) {
  const rng = createRng(seed);
  const props = [];
  const count = 46;
  for (let i = 0; i < count; i++) {
    props.push({
      type: rng.pick(PROP_TYPES),
      x: rng.range(60, ARENA.w - 60),
      y: rng.range(60, ARENA.h - 60),
      size: rng.range(26, 86),
      rot: rng.range(-0.35, 0.35),
      tone: rng.int(0, 2),
      flip: rng() > 0.5,
    });
  }
  return props;
}

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

/** 地面：底色 + 网格 + 静态道具。 */
export function drawFloor(ctx, theme, view, props, time) {
  const c = theme.colors;

  // 场地底色
  ctx.fillStyle = c.floor;
  ctx.fillRect(-20, -20, ARENA.w + 40, ARENA.h + 40);

  // 柔和的草地网格，只用来帮助判断距离
  const step = 96;
  const startX = Math.floor(view.left / step) * step;
  const startY = Math.floor(view.top / step) * step;
  ctx.strokeStyle = c.floorLine;
  ctx.lineWidth = 1;
  ctx.globalAlpha = theme.style === 'ink' ? 0.4 : 0.3;
  ctx.setLineDash(theme.style === 'ink' ? [4, 9] : [2, 10]);
  ctx.beginPath();
  for (let x = startX; x < view.right + step; x += step) {
    ctx.moveTo(x, view.top - 40);
    ctx.lineTo(x, view.bottom + 40);
  }
  for (let y = startY; y < view.bottom + step; y += step) {
    ctx.moveTo(view.left - 40, y);
    ctx.lineTo(view.right + 40, y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // 交叉点的小草点
  if (theme.glow) {
    ctx.fillStyle = c.floorGlow;
    for (let x = startX; x < view.right + step; x += step) {
      for (let y = startY; y < view.bottom + step; y += step) {
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(x, y, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  for (const p of props) {
    if (p.x < view.left - 120 || p.x > view.right + 120) continue;
    if (p.y < view.top - 120 || p.y > view.bottom + 120) continue;
    drawProp(ctx, theme, p, time);
  }

  // 场地边界
  ctx.strokeStyle = theme.glow ? c.accent : c.floorGlow;
  ctx.globalAlpha = theme.style === 'ink' ? 0.5 : 0.3;
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, ARENA.w, ARENA.h);
  ctx.globalAlpha = 1;
}

function drawProp(ctx, theme, p, time) {
  const c = theme.colors;
  const ink = theme.style === 'ink';
  const s = p.size;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);

  if (p.type === 'flower') {
    const sway = Math.sin(time * 1.2 + p.x * 0.02) * 0.12;
    ctx.rotate(sway);
    ctx.strokeStyle = c.propB;
    ctx.lineWidth = Math.max(1.4, s * 0.03);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, s * 0.34);
    ctx.quadraticCurveTo(s * 0.05, s * 0.1, 0, -s * 0.08);
    ctx.stroke();
    ctx.fillStyle = c.propB;
    ctx.beginPath();
    ctx.ellipse(-s * 0.1, s * 0.16, s * 0.13, s * 0.05, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(s * 0.1, s * 0.23, s * 0.12, s * 0.045, 0.45, 0, Math.PI * 2);
    ctx.fill();

    const petal = s * 0.11;
    ctx.fillStyle = p.tone === 1 ? c.accent2 : c.accent;
    ctx.globalAlpha = ink ? 0.75 : 0.85;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * petal, -s * 0.1 + Math.sin(a) * petal, petal * 0.9, petal * 0.62, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = c.coin;
    ctx.beginPath();
    ctx.arc(0, -s * 0.1, petal * 0.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.type === 'grass') {
    ctx.strokeStyle = p.tone === 1 ? c.propB : c.accent2;
    ctx.globalAlpha = ink ? 0.6 : 0.5;
    ctx.lineWidth = Math.max(1.2, s * 0.035);
    ctx.lineCap = 'round';
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * s * 0.08, s * 0.22);
      ctx.quadraticCurveTo(i * s * 0.14, 0, i * s * 0.2, -s * 0.2 + Math.abs(i) * s * 0.04);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (p.type === 'stone') {
    ctx.fillStyle = c.propA;
    ctx.globalAlpha = ink ? 0.8 : 0.9;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.26, s * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.propB;
    ctx.globalAlpha = ink ? 0.5 : 0.55;
    ctx.beginPath();
    ctx.ellipse(-s * 0.06, -s * 0.04, s * 0.13, s * 0.08, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.accent2;
    ctx.globalAlpha = ink ? 0.35 : 0.45;
    ctx.beginPath();
    ctx.ellipse(s * 0.1, s * 0.08, s * 0.07, s * 0.035, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  } else if (p.type === 'sign') {
    ctx.globalAlpha = ink ? 0.85 : 0.95;
    // 木桩
    ctx.fillStyle = c.propB;
    rr(ctx, -s * 0.035, -s * 0.02, s * 0.07, s * 0.44, s * 0.03);
    ctx.fill();
    // 木牌
    ctx.fillStyle = c.propA;
    rr(ctx, -s * 0.4, -s * 0.32, s * 0.8, s * 0.32, s * 0.08);
    ctx.fill();
    ctx.strokeStyle = c.propB;
    ctx.lineWidth = Math.max(1.2, s * 0.025);
    rr(ctx, -s * 0.4, -s * 0.32, s * 0.8, s * 0.32, s * 0.08);
    ctx.stroke();
    // 牌面小记号
    ctx.strokeStyle = c.accent;
    ctx.lineWidth = Math.max(1.4, s * 0.03);
    ctx.beginPath();
    ctx.moveTo(-s * 0.18, -s * 0.22);
    ctx.quadraticCurveTo(-s * 0.04, -s * 0.16, s * 0.08, -s * 0.24);
    ctx.moveTo(-s * 0.18, -s * 0.14);
    ctx.lineTo(s * 0.12, -s * 0.14);
    ctx.stroke();
    // 钉子
    ctx.fillStyle = c.coin;
    ctx.beginPath();
    ctx.arc(-s * 0.3, -s * 0.26, s * 0.02, 0, Math.PI * 2);
    ctx.arc(s * 0.3, -s * 0.26, s * 0.02, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  } else {
    // 灌木
    ctx.fillStyle = c.propB;
    ctx.globalAlpha = ink ? 0.55 : 0.7;
    for (const [bx, by, br] of [[-s * 0.18, 0, s * 0.2], [0, -s * 0.08, s * 0.24], [s * 0.2, 0, s * 0.18]]) {
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = c.accent2;
    ctx.globalAlpha = ink ? 0.5 : 0.75;
    for (const [bx, by] of [[-s * 0.2, -s * 0.02], [s * 0.08, -s * 0.16], [s * 0.22, -s * 0.02]]) {
      ctx.beginPath();
      ctx.arc(bx, by, s * 0.035, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
