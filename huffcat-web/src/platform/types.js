/**
 * 平台接口约定（JSDoc 仅用于说明，不影响运行）。
 *
 * 游戏逻辑与渲染层只能通过这个接口访问外部能力，
 * 这样浏览器 / 微信小游戏 / 以后的原生壳可以各自实现一份。
 *
 * @typedef {Object} Platform
 * @property {'browser'|'wechat'} name
 * @property {() => number} now                          毫秒时间戳
 * @property {(cb: (t: number) => void) => number} requestFrame
 * @property {(id: number) => void} cancelFrame
 * @property {{ get(key: string): string|null, set(key: string, value: string): void }} storage
 * @property {{ play(name: string): void, setMuted(v: boolean): void, isMuted(): boolean }} audio
 * @property {(ms: number) => void} vibrate
 * @property {() => { width: number, height: number, dpr: number }} getViewport
 * @property {(canvas: any, handlers: { down: Function, move: Function, up: Function }) => () => void} bindPointer
 * @property {(cb: () => void) => () => void} bindResize
 * @property {(cb: (hidden: boolean) => void) => () => void} bindVisibility
 * @property {(color: string) => void} setThemeColor
 * @property {boolean} isTouch
 */

export const STORAGE_KEYS = {
  meta: 'huffcat.meta.v1',
  settings: 'huffcat.settings.v1',
};