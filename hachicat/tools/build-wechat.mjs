/**
 * 构建微信小游戏包：
 *   1. vite 打包 src/wechat/main.js → wechat-dist/game.js（IIFE 单文件）
 *   2. 复制 wechat/ 下的 game.json / project.config.json
 *
 * 产物 wechat-dist/ 可直接用微信开发者工具「导入项目」打开（测试号 appid）。
 */
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';

function run(cmd) {
  execSync(cmd, { stdio: 'inherit' });
}

run('npx vite build --config vite.wechat.config.js');

for (const file of ['game.json', 'project.config.json']) {
  const from = `wechat/${file}`;
  const to = `wechat-dist/${file}`;
  if (!existsSync(from)) {
    console.error(`缺少 ${from}`);
    process.exit(1);
  }
  copyFileSync(from, to);
}

if (!existsSync('wechat-dist/game.js')) {
  console.error('构建失败：没有生成 wechat-dist/game.js');
  process.exit(1);
}

console.log('\n✓ 微信小游戏包已生成：wechat-dist/');
console.log('  用微信开发者工具导入该目录即可（appid 可先选测试号）。');
console.log('  界面为 Canvas 版，逻辑/渲染与网页版共用同一套源码。');