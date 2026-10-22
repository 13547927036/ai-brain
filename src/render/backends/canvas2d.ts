import type { AtlasSource, BenchBackend, SpriteData } from '../benchTypes.js';

export class Canvas2DBackend implements BenchBackend {
  readonly name = 'Canvas2D';
  private readonly ctx: CanvasRenderingContext2D;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('无法获取 2d 上下文');
    this.ctx = ctx;
  }

  beginFrame(): void {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.fillStyle = '#101014';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawSprite(atlas: AtlasSource, sprite: SpriteData, px: number, py: number): void {
    const sx = (sprite.cell % atlas.cols) * atlas.cell;
    const sy = Math.floor(sprite.cell / atlas.cols) * atlas.cell;
    const half = sprite.size / 2;
    this.ctx.drawImage(
      atlas.image,
      sx, sy, atlas.cell, atlas.cell,
      px - half, py - half, sprite.size, sprite.size,
    );
  }

  endFrame(): number {
    return -1;
  }

  dispose(): void {
    // Canvas 2D 无需释放资源
  }
}
