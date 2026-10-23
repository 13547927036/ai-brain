import { drawFloor, createProps } from './background.js';
import { drawSprite } from './sprites.js';

/**
 * Canvas 渲染层：只负责把世界状态画出来。
 * 所有颜色来自主题，所有形状来自素材注册表。
 */
export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d', { alpha: false });
  let width = 0;
  let height = 0;
  let dpr = 1;
  let props = [];
  let propsFor = '';
  let bgGradient = null;
  let bgKey = '';

  function resize(cssWidth, cssHeight, dprOverride) {
    const fallbackDpr =
      typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1;
    dpr = Math.min(2, dprOverride || fallbackDpr || 1);
    width = Math.max(1, Math.floor(cssWidth));
    height = Math.max(1, Math.floor(cssHeight));
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    // 小游戏的 canvas 没有 style，只有浏览器才有
    if (canvas.style) {
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    bgGradient = null;
    return { width, height, dpr };
  }

  function ensureTheme(theme) {
    if (propsFor !== theme.id) {
      props = createProps(theme.id, 20260101);
      propsFor = theme.id;
      bgGradient = null;
    }
    const key = `${theme.id}:${width}x${height}`;
    if (!bgGradient || bgKey !== key) {
      const g = ctx.createLinearGradient(0, 0, 0, height);
      g.addColorStop(0, theme.colors.bgTop);
      g.addColorStop(1, theme.colors.bgBottom);
      bgGradient = g;
      bgKey = key;
    }
  }

  function colorOf(theme, key) {
    return theme.fx[key] || theme.colors[key] || theme.colors.text;
  }

  function draw(world, theme, joystick) {
    ensureTheme(theme);
    const t = world.t;
    const shake = world.shake || 0;
    const sx = Math.sin(t * 61) * shake * 7;
    const sy = Math.cos(t * 47) * shake * 7;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2 - world.camera.x + sx, height / 2 - world.camera.y + sy);

    const margin = 110;
    const view = {
      left: world.camera.x - width / 2 - margin,
      right: world.camera.x + width / 2 + margin,
      top: world.camera.y - height / 2 - margin,
      bottom: world.camera.y + height / 2 + margin,
      w: width,
      h: height,
    };
    const inView = (x, y, extra = 40) =>
      x > view.left - extra && x < view.right + extra && y > view.top - extra && y < view.bottom + extra;

    drawFloor(ctx, theme, view, props, t);

    // 掉落物
    for (const it of world.pickups) {
      if (!inView(it.x, it.y)) continue;
      const bob = Math.sin(t * 4 + it.x * 0.03) * 2;
      const spriteId = it.kind === 'coin' ? 'pickup.coin' : 'pickup.xp';
      drawSprite(ctx, spriteId, it.x, it.y + bob, { theme, t, size: it.kind === 'coin' ? 16 : 15 });
    }

    // 陷阱
    for (const trap of world.traps) {
      if (!inView(trap.x, trap.y)) continue;
      drawSprite(ctx, 'trap.mouse', trap.x, trap.y, { theme, t, size: 30, armed: trap.arm <= 0 });
    }

    // 敌人（按 y 排序，产生前后遮挡）
    const enemies = world.enemies.slice().sort((a, b) => a.y - b.y);
    for (const e of enemies) {
      if (e.dead || !inView(e.x, e.y, 80)) continue;
      const hitTint = e.flash > 0;
      ctx.save();
      if (hitTint) ctx.filter = 'brightness(1.75)';
      drawSprite(ctx, e.sprite, e.x, e.y, { theme, t: e.t, size: undefined });
      ctx.restore();

      if (e.slow > 0) {
        ctx.strokeStyle = theme.colors.accent;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius + 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      if (!e.isBoss && e.hp < e.maxHp && e.radius >= 20) {
        const w = e.radius * 2.2;
        const y = e.y - e.radius - 14;
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(e.x - w / 2, y, w, 4);
        ctx.fillStyle = theme.colors.danger;
        ctx.fillRect(e.x - w / 2, y, (w * Math.max(0, e.hp)) / e.maxHp, 4);
      }
    }

    // 玩家
    const p = world.player;
    if (p.alive) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = theme.colors.shadow;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 16, 15, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const blink = p.invuln > 0 && Math.floor(p.invuln * 14) % 2 === 0;
      if (!blink) {
        drawSprite(ctx, p.sprite, p.x, p.y, {
          theme,
          t,
          size: 46,
          facing: p.facing,
          bob: p.moving ? Math.sin(t * 13) * 1.8 : Math.sin(t * 3) * 0.8,
          tilt: p.moving ? Math.sin(t * 13) * 0.05 : 0,
          flash: p.flash,
        });
      }

      // 环绕武器
      for (const weapon of p.weapons) {
        if (!weapon.orbs) continue;
        for (const orb of weapon.orbs) {
          drawSprite(ctx, 'proj.hairball', orb.x, orb.y, { theme, t, size: 16 });
          ctx.save();
          ctx.globalAlpha = 0.35;
          ctx.strokeStyle = theme.colors.accent;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.hypot(orb.x - p.x, orb.y - p.y), 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    // 子弹
    for (const b of world.bullets) {
      if (!inView(b.x, b.y)) continue;
      drawSprite(ctx, b.sprite, b.x, b.y, { theme, t, size: 16 });
    }
    for (const b of world.enemyBullets) {
      if (!inView(b.x, b.y)) continue;
      drawSprite(ctx, b.sprite, b.x, b.y, { theme, t, size: 15 });
    }

    // 特效
    for (const fx of world.effects) {
      drawEffect(ctx, fx, theme);
    }

    ctx.restore();

    // 屏幕空间：暗角
    drawVignette(theme);

    // 低血量警告
    if (p.alive && p.hp / p.stats.maxHp < 0.3) {
      const a = 0.12 + Math.sin(t * 6) * 0.06;
      ctx.fillStyle = `rgba(255, 40, 70, ${Math.max(0, a)})`;
      ctx.fillRect(0, 0, width, height);
    }
    if (p.flash > 0.1) {
      ctx.fillStyle = `rgba(255, 60, 90, ${p.flash * 0.5})`;
      ctx.fillRect(0, 0, width, height);
    }

    if (joystick) drawJoystick(ctx, joystick, theme, width, height);
  }

  function drawVignette(theme) {
    if (!bgGradient) return;
    const g = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.28, width / 2, height / 2, Math.max(width, height) * 0.72);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, theme.colors.vignette);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
  }

  function drawJoystick(c, joy, theme, w, h) {
    const baseR = joy.radius || 58;
    const isActive = joy.active;
    const ox = isActive ? joy.originX : 78;
    const oy = isActive ? joy.originY : h - 92;
    const knobX = isActive ? joy.originX + joy.dirX * baseR * 0.72 : ox;
    const knobY = isActive ? joy.originY + joy.dirY * baseR * 0.72 : oy;

    c.save();
    c.globalAlpha = isActive ? 0.95 : 0.35;

    c.fillStyle = theme.joystick.base;
    c.beginPath();
    c.arc(ox, oy, baseR, 0, Math.PI * 2);
    c.fill();

    c.strokeStyle = theme.joystick.ring;
    c.lineWidth = 2;
    c.beginPath();
    c.arc(ox, oy, baseR, 0, Math.PI * 2);
    c.stroke();

    if (isActive) {
      c.strokeStyle = theme.joystick.knobEdge;
      c.globalAlpha = 0.5;
      c.beginPath();
      c.arc(ox, oy, baseR * 0.56, 0, Math.PI * 2);
      c.stroke();
      c.globalAlpha = 0.95;
    }

    c.fillStyle = theme.joystick.knob;
    c.beginPath();
    c.arc(knobX, knobY, baseR * 0.42, 0, Math.PI * 2);
    c.fill();

    c.strokeStyle = theme.joystick.knobEdge;
    c.lineWidth = 2;
    c.beginPath();
    c.arc(knobX, knobY, baseR * 0.42, 0, Math.PI * 2);
    c.stroke();

    if (!isActive) {
      c.fillStyle = theme.colors.text;
      c.globalAlpha = 0.5;
      c.font = '600 11px "PingFang SC", system-ui, sans-serif';
      c.textAlign = 'center';
      c.fillText('拖动移动', ox, oy + 4);
    }
    c.restore();
  }

  function drawEffect(c, fx, theme) {
    const lifeRatio = Math.max(0, fx.life / fx.maxLife);
    const color = colorOf(theme, fx.colorKey);

    if (fx.kind === 'text') {
      const alpha = Math.min(1, lifeRatio * 1.6);
      c.save();
      c.globalAlpha = alpha;
      c.font = `800 ${fx.crit ? 21 : 15}px "PingFang SC", system-ui, sans-serif`;
      c.textAlign = 'center';
      c.lineWidth = 3;
      c.strokeStyle = theme.style === 'ink' ? 'rgba(255,250,240,0.85)' : 'rgba(0,0,0,0.65)';
      c.strokeText(fx.text, fx.x, fx.y);
      c.fillStyle = color;
      c.fillText(fx.text, fx.x, fx.y);
      c.restore();
      return;
    }

    if (fx.kind === 'spark') {
      c.save();
      c.globalAlpha = lifeRatio;
      c.fillStyle = color;
      c.beginPath();
      c.arc(fx.x, fx.y, fx.size * lifeRatio, 0, Math.PI * 2);
      c.fill();
      c.restore();
      return;
    }

    if (fx.kind === 'ring') {
      const pr = 1 - lifeRatio;
      c.save();
      c.globalAlpha = lifeRatio;
      c.strokeStyle = color;
      c.lineWidth = fx.width || 3;
      c.beginPath();
      c.arc(fx.x, fx.y, fx.radius * (0.25 + pr * 0.75), 0, Math.PI * 2);
      c.stroke();
      c.restore();
      return;
    }

    if (fx.kind === 'shock') {
      const pr = 1 - lifeRatio;
      c.save();
      c.globalAlpha = lifeRatio * 0.85;
      c.strokeStyle = color;
      c.lineWidth = 4;
      c.beginPath();
      c.arc(fx.x, fx.y, fx.radius * (0.3 + pr * 0.7), 0, Math.PI * 2);
      c.stroke();
      c.globalAlpha = lifeRatio * 0.35;
      c.lineWidth = 10;
      c.beginPath();
      c.arc(fx.x, fx.y, fx.radius * (0.3 + pr * 0.7), 0, Math.PI * 2);
      c.stroke();
      c.restore();
      return;
    }

    if (fx.kind === 'beam') {
      c.save();
      c.globalAlpha = Math.min(1, lifeRatio * 1.4);
      c.strokeStyle = color;
      c.lineCap = 'round';
      c.lineWidth = 5;
      c.beginPath();
      c.moveTo(fx.x1, fx.y1);
      c.lineTo(fx.x2, fx.y2);
      c.stroke();
      c.globalAlpha = lifeRatio;
      c.lineWidth = 14;
      c.strokeStyle = theme.colors.accent;
      c.globalAlpha = lifeRatio * 0.18;
      c.stroke();
      c.restore();
      return;
    }

    if (fx.kind === 'slash') {
      const pr = 1 - lifeRatio;
      c.save();
      c.globalAlpha = Math.min(1, lifeRatio * 1.5);
      c.strokeStyle = color;
      c.lineWidth = 6 * lifeRatio + 1;
      c.lineCap = 'round';
      c.beginPath();
      c.arc(fx.x, fx.y, fx.radius * (0.72 + pr * 0.28), fx.angle - fx.arc / 2, fx.angle + fx.arc / 2);
      c.stroke();
      c.restore();
      return;
    }

    if (fx.kind === 'puff') {
      const pr = 1 - lifeRatio;
      c.save();
      c.globalAlpha = lifeRatio * 0.5;
      c.fillStyle = color;
      c.beginPath();
      c.moveTo(fx.x, fx.y);
      c.arc(fx.x, fx.y, fx.radius * (0.55 + pr * 0.45), fx.angle - fx.arc / 2, fx.angle + fx.arc / 2);
      c.closePath();
      c.fill();
      c.globalAlpha = lifeRatio * 0.8;
      c.strokeStyle = color;
      c.lineWidth = 2;
      c.beginPath();
      c.arc(fx.x, fx.y, fx.radius * (0.55 + pr * 0.45), fx.angle - fx.arc / 2, fx.angle + fx.arc / 2);
      c.stroke();
      c.restore();
    }
  }

  return { resize, draw, get size() { return { width, height, dpr }; } };
}