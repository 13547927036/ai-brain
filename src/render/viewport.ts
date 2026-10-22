/**
 * 逻辑坐标 → 设备像素的等比缩放 + 居中留边。
 *
 * 浏览器的画布尺寸本来就是按 750:1334 等比设置的，留边量恒为 0；
 * 微信小游戏的主画布铺满整块屏幕，比例通常不是 750:1334，
 * 此时必须按短边等比缩放并居中，否则画面会被拉伸变形。
 *
 * Renderer 与 UI 共用这一个函数，避免两处算法漂移导致 HUD 错位。
 */
export interface Viewport {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export function computeViewport(
  canvasW: number,
  canvasH: number,
  logicalW: number,
  logicalH: number,
): Viewport {
  const safeW = Math.max(1, canvasW);
  const safeH = Math.max(1, canvasH);
  const scale = Math.min(safeW / logicalW, safeH / logicalH);
  return {
    scale,
    offsetX: (safeW - logicalW * scale) / 2,
    offsetY: (safeH - logicalH * scale) / 2,
  };
}

/** 应用视口变换，并用底色填满整块画布（含留边） */
export function applyViewport(
  ctx: CanvasRenderingContext2D,
  view: Viewport,
  canvasW: number,
  canvasH: number,
  bg: string,
): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvasW, canvasH);
  ctx.setTransform(view.scale, 0, 0, view.scale, view.offsetX, view.offsetY);
}
