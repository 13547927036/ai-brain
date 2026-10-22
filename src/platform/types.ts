/**
 * 平台层接口。core/ 只依赖这里的类型，永远不直接碰 document / wx。
 * 将来上微信小游戏时，新写一个 platform/wechat/ 实现即可，core 与 render 不动。
 */

export interface Tap {
  /** 逻辑像素坐标 */
  x: number;
  y: number;
}

export interface PointerState {
  active: boolean;
  /** 按下点（浮动摇杆的圆心） */
  originX: number;
  originY: number;
  x: number;
  y: number;
  /** 归一化方向，长度 <= 1 */
  dirX: number;
  dirY: number;
  /** 摇杆可视半径 */
  radius: number;
}

export interface InputSource {
  readonly pointer: PointerState;
  /** 键盘方向（桌面调试用） */
  readonly keys: { x: number; y: number };
  /** 取走本帧的点击，消费后清空 */
  takeTaps(): Tap[];
  /** UI 消费掉一次按下时，撤销摇杆 */
  cancelPointer(): void;
}

export interface KeyValueStore {
  load(key: string): string | null;
  save(key: string, value: string): void;
  remove(key: string): void;
}

export type SoundId =
  | 'fire' | 'hit' | 'crit' | 'kill' | 'hurt' | 'dodge'
  | 'pickup' | 'levelUp' | 'waveStart' | 'waveEnd'
  | 'buy' | 'click' | 'reroll' | 'lose' | 'win';

export interface AudioSink {
  readonly muted: boolean;
  /** 浏览器要求首次用户交互后才能出声 */
  unlock(): void;
  play(id: SoundId): void;
  setMuted(muted: boolean): void;
}

export interface View {
  /** 逻辑宽度（750 基准） */
  width: number;
  /** 逻辑高度 */
  height: number;
  /** 设备像素比 */
  dpr: number;
  /** CSS 像素尺寸 */
  cssWidth: number;
  cssHeight: number;
}

export interface Platform {
  /**
   * 加载图片资源。失败或不支持时返回 null，调用方回退到几何图形。
   * 用 CanvasImageSource 而不是 HTMLImageElement，微信侧才能复用同一签名。
   */
  loadImage?(src: string): Promise<CanvasImageSource | null>;
  readonly canvas: HTMLCanvasElement;
  readonly view: View;
  readonly input: InputSource;
  readonly storage: KeyValueStore;
  readonly audio: AudioSink;
  /** 每帧开始时的钩子 */
  beginFrame(): void;
  /**
   * 切到后台。浏览器走 visibilitychange，微信用 wx.onHide。
   * 上层据此暂停 + 落盘，避免玩家接个电话回来一局白打。
   */
  onHide?(cb: () => void): void;
  dispose(): void;
}
