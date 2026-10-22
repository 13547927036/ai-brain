import type { ThemeDef } from '../content/theme.js';
import type { Enemy, Floater, Particle, Pickup, World } from '../core/world.js';
import type { PointerState } from '../platform/types.js';

/**
 * Canvas2D 渲染器。用几何图形作为占位美术 —— 换皮时只替换这个文件。
 *
 * 为什么先用 Canvas2D 而不是 M0 选定的 WebGL：
 * M0 的结论是针对**上线目标**（移动端 60fps、drawcall < 30）。
 * 浏览器原型的目的是验证手感，Canvas2D 在 M0 实测 564fps，性能余量巨大，
 * 而且没有着色器/图集打包的调试成本。render/ 是设计上可替换的一层，
 * 上微信前按 m0-result.md 换回 WebGL 即可。
 */

const FONT_STACK = 'ui-monospace, "Cascadia Mono", Consolas, monospace';

export class Renderer {
  private readonly ctx: CanvasRenderingContext2D;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('无法获取 2d 上下文');
    this.ctx = ctx;
  }

  /** 每帧开头调用：把坐标系对齐到逻辑像素 */
  private begin(logicalW: number, logicalH: number, bg: string): void {
    const ctx = this.ctx;
    const s = this.canvas.width / logicalW;
    ctx.setTransform(s, 0, 0, s, 0, 0);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, logicalW, logicalH);
    void logicalH;
  }

  drawWorld(w: World, theme: ThemeDef, joystick: PointerState, showJoystick: boolean): void {
    const ctx = this.ctx;
    const { w: W, h: H } = w.arena;
    const p = theme.palette;

    this.begin(W, H, p.bg);

    // 竞技场边框
    ctx.strokeStyle = p.arenaBorder;
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, W - 4, H - 4);

    // 掉落物
    for (let i = 0; i < w.pickups.length; i++) {
      const k = w.pickups.items[i] as Pickup;
      const isHeal = k.kind === 'heal';
      ctx.fillStyle = isHeal ? p.heal : p.material;
      const r = isHeal ? 9 : 6;
      ctx.beginPath();
      ctx.arc(k.x, k.y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 敌人
    for (let i = 0; i < w.enemies.length; i++) {
      const e = w.enemies.items[i] as Enemy;
      this.drawEnemy(e, theme);
    }

    // 子弹
    for (let i = 0; i < w.bullets.length; i++) {
      const b = w.bullets.items[i];
      if (!b) continue;
      ctx.fillStyle = b.fromPlayer ? p.text : p.danger;
      ctx.beginPath();
      ctx.arc(b.x, b.y, Math.max(3, b.radius * 0.6), 0, Math.PI * 2);
      ctx.fill();
    }

    // 玩家
    const pl = w.player;
    ctx.fillStyle = p.player;
    ctx.beginPath();
    ctx.arc(pl.x, pl.y, 16, 0, Math.PI * 2);
    ctx.fill();
    // 朝向缺口：让「自动开火朝哪打」可见
    ctx.strokeStyle = p.bg;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(pl.x, pl.y);
    ctx.lineTo(pl.x + pl.facingX * 22, pl.y + pl.facingY * 22);
    ctx.stroke();
    // 受击无敌帧闪烁
    if (pl.invuln > 0) {
      ctx.strokeStyle = p.text;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pl.x, pl.y, 20, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 粒子
    for (let i = 0; i < w.particles.length; i++) {
      const pt = w.particles.items[i] as Particle;
      const alpha = Math.max(0, pt.life / pt.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = pt.colorIndex === 3 ? p.boss : p.text;
      ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
    }
    ctx.globalAlpha = 1;

    // 伤害飘字
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < w.floaters.length; i++) {
      const f = w.floaters.items[i] as Floater;
      const alpha = Math.max(0, f.life / f.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = f.crit ? p.danger : p.text;
      ctx.font = `${f.crit ? 'bold 22' : '18'}px ${FONT_STACK}`;
      ctx.fillText(String(f.value), f.x, f.y);
    }
    ctx.globalAlpha = 1;

    // 浮动摇杆
    if (showJoystick && joystick.active) {
      ctx.strokeStyle = p.text;
      ctx.globalAlpha = 0.28;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(joystick.originX, joystick.originY, joystick.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = p.text;
      ctx.beginPath();
      ctx.arc(
        joystick.originX + joystick.dirX * joystick.radius,
        joystick.originY + joystick.dirY * joystick.radius,
        26, 0, Math.PI * 2,
      );
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  private drawEnemy(e: Enemy, theme: ThemeDef): void {
    const ctx = this.ctx;
    const p = theme.palette;
    const flash = e.hitFlash > 0;

    let color = p.enemy;
    if (e.defId === 'runner') color = p.enemyFast;
    else if (e.defId === 'shooter') color = p.enemyRanged;
    else if (e.defId === 'boss') color = p.boss;
    if (flash) color = p.text;

    ctx.fillStyle = color;
    ctx.beginPath();

    if (e.defId === 'runner') {
      // 三角：速度感
      const r = e.radius;
      ctx.moveTo(e.x, e.y - r);
      ctx.lineTo(e.x + r, e.y + r);
      ctx.lineTo(e.x - r, e.y + r);
      ctx.closePath();
    } else if (e.defId === 'shooter') {
      // 菱形：远程
      const r = e.radius;
      ctx.moveTo(e.x, e.y - r);
      ctx.lineTo(e.x + r, e.y);
      ctx.lineTo(e.x, e.y + r);
      ctx.lineTo(e.x - r, e.y);
      ctx.closePath();
    } else {
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
    }
    ctx.fill();

    // Boss 血条
    if (e.defId === 'boss') {
      const wBar = 120;
      const x = e.x - wBar / 2;
      const y = e.y - e.radius - 18;
      ctx.fillStyle = p.bg;
      ctx.fillRect(x, y, wBar, 8);
      ctx.fillStyle = p.danger;
      ctx.fillRect(x, y, wBar * Math.max(0, e.hp / e.maxHp), 8);
    }
  }
}
