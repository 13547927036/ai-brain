export interface SpriteData {
  x: number;
  y: number;
  vx: number;
  vy: number;
  cell: number;
  size: number;
}

export interface AtlasSource {
  image: CanvasImageSource;
  cell: number;
  cols: number;
}

export interface BenchBackend {
  readonly name: string;
  beginFrame(): void;
  drawSprite(atlas: AtlasSource, sprite: SpriteData, px: number, py: number): void;
  endFrame(): number;
  dispose(): void;
}
