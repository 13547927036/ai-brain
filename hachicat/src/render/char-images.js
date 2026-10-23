/**
 * 角色图片素材的加载与缓存。
 *
 * 为什么放在 render/：分层规则里写明"换皮应该只改 render/ 与 content/"，
 * 且 render/ 允许 Canvas API（但禁止 document、存储与事件监听）。
 * 所以这里只用 Image 与 onload / onerror 属性回调。
 *
 * 取不到图片时（微信小游戏没有 HTMLImageElement、或图片加载失败）返回 null，
 * 调用方会退回程序化绘制的猫，界面与战斗都不会空白。
 */
const entries = new Map();
const listeners = new Set();
let factory;

function imageFactory() {
  if (factory !== undefined) return factory;
  if (typeof Image !== 'undefined') factory = () => new Image();
  else if (typeof wx !== 'undefined' && wx && typeof wx.createImage === 'function') {
    factory = () => wx.createImage();
  } else factory = null;
  return factory;
}

function notify() {
  for (const cb of listeners) {
    try { cb(); } catch { /* 单个订阅者出错不影响其他订阅者 */ }
  }
}

/** 订阅"有素材加载完成"，供 React 界面重绘一次。返回取消订阅函数。 */
export function onCharImageReady(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/**
 * 取某个素材。首次调用即发起加载；加载完成前返回 null。
 * @param {string} url 相对于页面基路径的图片地址
 */
export function getCharImage(url) {
  if (!url) return null;
  let entry = entries.get(url);
  if (!entry) {
    entry = { url, img: null, ready: false, failed: false };
    entries.set(url, entry);
    const make = imageFactory();
    if (!make) {
      entry.failed = true;
      return null;
    }
    const img = make();
    entry.img = img;
    img.onload = () => { entry.ready = true; notify(); };
    img.onerror = () => { entry.failed = true; notify(); };
    img.src = url;
  }
  return entry.ready ? entry : null;
}

/** 启动时预加载，避免第一次进战斗才去拉图。 */
export function preloadCharImages(urls) {
  for (const url of urls) getCharImage(url);
}