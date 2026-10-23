/**
 * 背景与静态道具：只依赖主题配色 + 随机种子，和玩法无关。
 * 换画风时替换本文件的绘制分支即可。
 */
import { createRng } from '../game/rng.js';
import { ARENA } from '../game/constants.js';

const PROP_TYPES = ['puddle', 'stain', 'crate', 'pipe', 'sign'];

export function createProps(themeId, seed) {
  const rng = createRng(seed);
  const props = [];
  const count = 34;
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

  // 网格
  const step = 88;
  const startX = Math.floor(view.left / step) * step;
  const startY = Math.floor(view.top / step) * step;
  ctx.strokeStyle = c.floorLine;
  ctx.lineWidth = 1;
  ctx.globalAlpha = theme.style === 'ink' ? 0.55 : 0.75;
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
  ctx.globalAlpha = 1;

  // 交叉点小亮点
  if (theme.glow) {
    ctx.fillStyle = c.floorGlow;
    for (let x = startX; x < view.right + step; x += step) {
      for (let y = startY; y < view.bottom + step; y += step) {
        ctx.globalAlpha = 0.35;
        ctx.fillRect(x - 1, y - 1, 2, 2);
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
  ctx.globalAlpha = theme.style === 'ink' ? 0.5 : 0.35;
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, ARENA.w, ARENA.h);
  ctx.globalAlpha = 1;
}

function drawProp(ctx, theme, p, time) {
  const c = theme.colors;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);

  if (p.type === 'puddle') {
    ctx.fillStyle = theme.style === 'ink' ? c.floorGlow : c.floorGlow;
    ctx.globalAlpha = theme.style === 'ink' ? 0.5 : 0.35;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.size * 0.9, p.size * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = c.accent;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(-p.size * 0.15, -2, p.size * 0.5, p.size * 0.12, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (p.type === 'stain') {
    ctx.fillStyle = theme.style === 'ink' ? c.propA : c.propB;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    const r = p.size * 0.45;
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const rr = r * (0.75 + ((i * 37 + p.tone * 13) % 10) / 22);
      const x = Math.cos(a) * rr;
      const y = Math.sin(a) * rr * 0.7;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  } else if (p.type === 'crate') {
    ctx.globalAlpha = theme.style === 'ink' ? 0.8 : 0.9;
    ctx.fillStyle = c.propA;
    rr(ctx, -p.size * 0.4, -p.size * 0.4, p.size * 0.8, p.size * 0.8, 6);
    ctx.fill();
    ctx.strokeStyle = c.propB;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-p.size * 0.4, -p.size * 0.4);
    ctx.lineTo(p.size * 0.4, p.size * 0.4);
    ctx.moveTo(p.size * 0.4, -p.size * 0.4);
    ctx.lineTo(-p.size * 0.4, p.size * 0.4);
    ctx.stroke();
    ctx.strokeStyle = c.propB;
    rr(ctx, -p.size * 0.4, -p.size * 0.4, p.size * 0.8, p.size * 0.8, 6);
    ctx.stroke();
  } else if (p.type === 'pipe') {
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = c.propB;
    rr(ctx, -p.size * 0.55, -5, p.size * 1.1, 10, 5);
    ctx.fill();
    ctx.fillStyle = c.propA;
    rr(ctx, -p.size * 0.55, -5, p.size * 0.12, 10, 3);
    ctx.fill();
    ctx.fillStyle = c.propA;
    rr(ctx, p.size * 0.4, -5, p.size * 0.12, 10, 3);
    ctx.fill();
  } else {
    // sign：霓虹招牌 / 便签
    const glow = 0.55 + Math.sin(time * 1.6 + p.x * 0.01) * 0.12;
    ctx.globalAlpha = 1;
    if (theme.style === 'ink') {
      ctx.rotate(-0.06);
      ctx.fillStyle = c.propA;
      ctx.beginPath();
      ctx.rect(-p.size * 0.42, -p.size * 0.3, p.size * 0.84, p.size * 0.6);
      ctx.fill();
      ctx.strokeStyle = c.propB;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-p.size * 0.3, -p.size * 0.12);
      ctx.lineTo(p.size * 0.2, -p.size * 0.1);
      ctx.moveTo(-p.size * 0.3, 0);
      ctx.lineTo(p.size * 0.3, 0.02);
      ctx.moveTo(-p.size * 0.3, p.size * 0.12);
      ctx.lineTo(p.size * 0.1, p.size * 0.14);
      ctx.stroke();
    } else {
      ctx.shadowColor = c.accent;
      ctx.shadowBlur = 16;
      ctx.strokeStyle = c.accent;
      ctx.globalAlpha = glow;
      ctx.lineWidth = 3;
      rr(ctx, -p.size * 0.4, -p.size * 0.24, p.size * 0.8, p.size * 0.48, 8);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = c.accent;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = c.bgTop;
      ctx.shadowBlur = 0;
      ctx.fillStyle = c.accent;
      ctx.globalAlpha = 0.8;
      rr(ctx, -p.size * 0.26, -p.size * 0.06, p.size * 0.2, 4, 2);
      ctx.fill();
      rr(ctx, -p.size * 0.02, -p.size * 0.06, p.size * 0.28, 4, 2);
      ctx.fill();
    }
  }
  ctx.restore();
}