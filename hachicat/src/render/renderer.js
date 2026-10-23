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

/**
 * 玩家移动 / 待机动画状态（模块级，逐帧零分配）。
 *
 * 立绘是完整单张 PNG，没有四肢图层，所以只做整体起伏、左右摆动与前倾，
 * 不做腿部交替、也不缩放，避免破坏立绘比例。
 * 时间取世界时间差：暂停时世界时间不推进，动画自然冻结；重开时世界时间回退，状态归零。
 */
const playAnim = { lastT: -1, phase: 0, move: 0, bob: 0, sway: 0, lean: 0, tilt: 0 };

function updatePlayerAnim(t, p) {
  let dt = 0;
  if (playAnim.lastT >= 0 && t >= playAnim.lastT) dt = Math.min(0.05, t - playAnim.lastT);
  if (t < playAnim.lastT) {
    playAnim.phase = 0;
    playAnim.move = 0;
  }
  playAnim.lastT = t;

  // 移动量平滑过渡：松开摇杆不是硬切，而是在几百毫秒内收回待机
  const len = Math.min(1, Math.hypot(p.moveX || 0, p.moveY || 0));
  const target = p.moving ? Math.max(0.4, len) : 0;
  playAnim.move += (target - playAnim.move) * (1 - Math.exp(-dt * 9));

  // 节奏随实际移速变化；三个角色按各自基础移速得到轻微不同的步频
  const speed = (p.stats && p.stats.speed) || 170;
  const speedFactor = Math.min(1.3, Math.max(0.8, speed / 170));
  playAnim.phase += dt * (3.4 + playAnim.move * 13 * speedFactor);

  const m = playAnim.move;
  const ph = playAnim.phase;
  playAnim.bob = Math.sin(ph) * (0.75 + m * 1.35);
  playAnim.sway = Math.sin(ph * 0.5) * (0.004 + m * 0.012);
  playAnim.tilt = Math.sin(ph) * (0.004 + m * 0.03);
  playAnim.lean = ((p.moveX || 0) >= 0 ? 1 : -1) * m * 0.05;
}
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
      drawEnemyAura(ctx, e, theme, t);
      const hitTint = e.flash > 0;
      ctx.save();
      if (hitTint) ctx.filter = 'brightness(1.75)';
      drawSprite(ctx, e.sprite, e.x, e.y, {
        theme,
        t: e.t,
        fuse: e.fuseT > 0 ? 1 - e.fuseT / e.fuseMax : 0,
        angle: e.ai === 'dash' ? e.warnAngle : 0,
      });
      ctx.restore();
      drawEnemyTelegraph(ctx, e, theme, t);

      if (e.slow > 0) {
        ctx.strokeStyle = theme.colors.accent;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius + 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      if (!e.isBoss && e.hp < e.maxHp && (e.elite || e.radius >= 20)) {
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
        updatePlayerAnim(t, p);
        drawSprite(ctx, p.sprite, p.x, p.y, {
          theme,
          t,
          size: 46,
          facing: p.facing,
          bob: playAnim.bob,
          tilt: playAnim.tilt,
          sway: playAnim.sway,
          lean: playAnim.lean,
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

  /** 敌人光环 / 精英标记：让玩家一眼分清处理优先级。 */
  function drawEnemyAura(c, e, theme, t) {
    if (e.ai === 'support') {
      const pulse = e.healPulse > 0 ? 0.11 : 0.04;
      c.save();
      c.fillStyle = theme.fx.heal;
      c.globalAlpha = pulse;
      c.beginPath();
      c.arc(e.x, e.y, e.healRadius, 0, Math.PI * 2);
      c.fill();
      c.globalAlpha = 0.18;
      c.strokeStyle = theme.fx.heal;
      c.lineWidth = 1.2;
      c.beginPath();
      c.arc(e.x, e.y, e.healRadius, 0, Math.PI * 2);
      c.stroke();
      c.restore();
    } else if (e.ai === 'brood') {
      c.save();
      c.globalAlpha = 0.22 + Math.sin(t * 3 + e.seedPhase) * 0.08;
      c.strokeStyle = theme.colors.danger;
      c.lineWidth = 1.4;
      c.setLineDash([5, 7]);
      c.beginPath();
      c.arc(e.x, e.y, e.radius + 14, 0, Math.PI * 2);
      c.stroke();
      c.restore();
    }

    if (e.elite) {
      c.save();
      const r = e.radius + 7;
      c.globalAlpha = 0.75 + Math.sin(t * 4 + e.seedPhase) * 0.15;
      c.strokeStyle = theme.colors.coin;
      c.lineWidth = 2.5;
      c.beginPath();
      c.arc(e.x, e.y, r, 0, Math.PI * 2);
      c.stroke();
      c.globalAlpha = 0.4;
      c.lineWidth = 1.2;
      c.beginPath();
      c.arc(e.x, e.y, r + 4, 0, Math.PI * 2);
      c.stroke();
      // 四角尖刺，远看也能和普通怪区分
      c.fillStyle = theme.colors.coin;
      c.globalAlpha = 0.9;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const px = e.x + Math.cos(a) * (r + 3);
        const py = e.y + Math.sin(a) * (r + 3);
        c.beginPath();
        c.moveTo(px + Math.cos(a) * 6, py + Math.sin(a) * 6);
        c.lineTo(px + Math.cos(a + 2.2) * 3, py + Math.sin(a + 2.2) * 3);
        c.lineTo(px + Math.cos(a - 2.2) * 3, py + Math.sin(a - 2.2) * 3);
        c.closePath();
        c.fill();
      }
      c.restore();
    }
  }

  /** 攻击预警：突进线、自爆圈、首领冲刺 / 环形弹幕。 */
  function drawEnemyTelegraph(c, e, theme, t) {
    if (e.ai === 'dash' && e.warnT > 0) {
      const p = 1 - e.warnT / Math.max(0.001, e.warnMax);
      const len = e.dashSpeed * e.dashTime + 80;
      c.save();
      c.translate(e.x, e.y);
      c.rotate(e.warnAngle);
      c.globalAlpha = 0.35 + p * 0.5;
      c.strokeStyle = theme.colors.danger;
      c.lineWidth = 3;
      c.setLineDash([10, 8]);
      c.beginPath();
      c.moveTo(e.radius, 0);
      c.lineTo(len, 0);
      c.stroke();
      c.setLineDash([]);
      c.beginPath();
      c.arc(len, 0, 9, 0, Math.PI * 2);
      c.stroke();
      c.globalAlpha = 0.5 + p * 0.4;
      c.beginPath();
      c.arc(0, 0, e.radius + 6, 0, Math.PI * 2);
      c.stroke();
      c.restore();
    }

    if (e.fuseT > 0) {
      const p = 1 - e.fuseT / Math.max(0.001, e.fuseMax);
      c.save();
      c.fillStyle = theme.colors.danger;
      c.globalAlpha = 0.08 + p * 0.18;
      c.beginPath();
      c.arc(e.x, e.y, e.blastRadius, 0, Math.PI * 2);
      c.fill();
      c.globalAlpha = 0.55 + p * 0.35;
      c.strokeStyle = theme.colors.danger;
      c.lineWidth = 2;
      c.beginPath();
      c.arc(e.x, e.y, e.blastRadius, 0, Math.PI * 2);
      c.stroke();
      c.restore();
    }

    if (e.isBoss && e.telegraph > 0) {
      const p = 1 - e.telegraph / Math.max(0.001, e.telegraphMax);
      const len = 560;
      c.save();
      c.translate(e.x, e.y);
      c.rotate(e.telegraphAngle);
      c.globalAlpha = 0.3 + p * 0.45;
      c.strokeStyle = theme.colors.danger;
      c.lineWidth = 4;
      c.setLineDash([14, 10]);
      c.beginPath();
      c.moveTo(e.radius, 0);
      c.lineTo(len, 0);
      c.stroke();
      c.setLineDash([]);
      c.beginPath();
      c.arc(0, 0, e.radius + 10, 0, Math.PI * 2);
      c.stroke();
      c.restore();
    }

    if (e.isBoss && e.radialWarn > 0) {
      const p = 1 - e.radialWarn / Math.max(0.001, e.radialWarnMax);
      c.save();
      c.globalAlpha = 0.35 + p * 0.5;
      c.strokeStyle = theme.colors.danger;
      c.lineWidth = 3;
      c.beginPath();
      c.arc(e.x, e.y, e.radius + 18 + p * 44, 0, Math.PI * 2);
      c.stroke();
      c.restore();
    }
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