import type { ThemeDef } from '../content/theme.js';
import { xpForLevel } from '../core/formulas.js';
import type { World } from '../core/world.js';

export const FONT = 'ui-monospace, "Cascadia Mono", Consolas, monospace';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function inside(r: Rect, x: number, y: number): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

/**
 * 立即模式 UI：每帧重画并登记可点击区域，点击时按 id 反查。
 * 好处是不用维护控件树，坏处是「谁画谁登记」，所以所有按钮都必须走 button()。
 */
export class UI {
  readonly buttons = new Map<string, Rect>();
  readonly ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('无法获取 2d 上下文');
    this.ctx = ctx;
  }

  begin(logicalW: number): void {
    const s = this.ctx.canvas.width / logicalW;
    this.ctx.setTransform(s, 0, 0, s, 0, 0);
    this.buttons.clear();
  }

  rect(r: Rect, fill: string, stroke?: string, lineWidth = 2): void {
    const c = this.ctx;
    c.fillStyle = fill;
    c.fillRect(r.x, r.y, r.w, r.h);
    if (stroke) {
      c.strokeStyle = stroke;
      c.lineWidth = lineWidth;
      c.strokeRect(r.x + lineWidth / 2, r.y + lineWidth / 2, r.w - lineWidth, r.h - lineWidth);
    }
  }

  label(
    str: string,
    x: number,
    y: number,
    size: number,
    color: string,
    align: CanvasTextAlign = 'left',
    weight = 'normal',
  ): void {
    const c = this.ctx;
    c.fillStyle = color;
    c.font = `${weight} ${size}px ${FONT}`;
    c.textAlign = align;
    c.textBaseline = 'middle';
    c.fillText(str, x, y);
  }

  /** 画按钮并登记点击区域。enabled=false 时仍登记，但上层可以选择忽略。 */
  button(
    id: string,
    r: Rect,
    text: string,
    opts: { enabled?: boolean; fill?: string; color?: string; size?: number } = {},
  ): void {
    const enabled = opts.enabled ?? true;
    const fill = opts.fill ?? (enabled ? '#2f3542' : '#22252c');
    const color = opts.color ?? (enabled ? '#f1faee' : '#5a5f6b');
    this.rect(r, fill, enabled ? '#4a5160' : '#2a2d34');
    this.label(text, r.x + r.w / 2, r.y + r.h / 2, opts.size ?? 30, color, 'center', 'bold');
    this.buttons.set(id, r);
  }

  hitTest(x: number, y: number): string | null {
    // 后画的在上层，所以倒序命中
    const entries = [...this.buttons.entries()].reverse();
    for (const [id, r] of entries) {
      if (inside(r, x, y)) return id;
    }
    return null;
  }
}

/** 战斗 HUD：血条、波次倒计时、材料、等级、武器槽 */
export function drawHud(ui: UI, w: World, theme: ThemeDef): void {
  const p = theme.palette;
  const pl = w.player;

  // 顶部半透明信息条
  ui.rect({ x: 0, y: 0, w: 750, h: 104 }, 'rgba(12,12,18,0.72)');

  // 血条
  const hpW = 340;
  const ratio = pl.maxHp > 0 ? Math.max(0, pl.hp / pl.maxHp) : 0;
  ui.rect({ x: 20, y: 22, w: hpW, h: 26 }, '#241f24');
  ui.rect({ x: 20, y: 22, w: hpW * ratio, h: 26 }, ratio > 0.3 ? '#06d6a0' : '#ef476f');
  ui.label(`${Math.ceil(pl.hp)} / ${Math.round(pl.maxHp)}`, 20 + hpW / 2, 36, 20, '#f1faee', 'center', 'bold');

  // 波次与倒计时
  ui.label(`第 ${w.wave.index} 波`, 730, 30, 30, p.text, 'right', 'bold');
  ui.label(`${Math.max(0, w.wave.timeLeft).toFixed(1)}s`, 730, 66, 26, w.wave.timeLeft < 5 ? p.danger : p.text, 'right');

  // 材料与等级
  ui.label(`材料 ${Math.floor(pl.materials)}`, 20, 66, 24, p.material, 'left', 'bold');
  ui.label(`Lv.${pl.level}`, 20, 94, 20, p.text, 'left');

  // 经验条
  const need = xpForLevel(pl.level);
  const xpRatio = need > 0 ? Math.min(1, pl.xp / need) : 0;
  ui.rect({ x: 0, y: 100, w: 750, h: 6 }, '#241f24');
  ui.rect({ x: 0, y: 100, w: 750 * xpRatio, h: 6 }, p.xpOrb);

  // 底部武器槽
  const barY = 1334 - 120;
  ui.rect({ x: 0, y: barY, w: 750, h: 120 }, 'rgba(12,12,18,0.72)');
  const slotW = 100;
  const gap = 12;
  const totalW = 6 * slotW + 5 * gap;
  const startX = (750 - totalW) / 2;
  for (let i = 0; i < 6; i++) {
    const x = startX + i * (slotW + gap);
    const unlocked = i < pl.weaponSlots;
    const wpn = pl.weapons[i];
    const r = { x, y: barY + 12, w: slotW, h: 96 };
    ui.rect(r, unlocked ? '#1f2430' : '#15171c', unlocked ? '#3a4150' : '#22252c');
    if (wpn) {
      const def = wpn.defId;
      ui.label(def.slice(0, 7), x + slotW / 2, barY + 46, 15, p.text, 'center');
      ui.label(`T${wpn.quality}`, x + slotW / 2, barY + 74, 17, '#ffd166', 'center', 'bold');
    } else if (!unlocked) {
      ui.label('锁', x + slotW / 2, barY + 60, 22, '#4a5160', 'center');
    }
  }
}
