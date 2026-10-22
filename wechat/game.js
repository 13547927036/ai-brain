// 微信小游戏入口。
// 平台判定在 dist/app/platform-select.js 里完成：检测到全局 wx 就自动走微信实现，
// 因此浏览器与微信共用同一份游戏代码，这里只负责加载。
require('./dist/app/main.js');
