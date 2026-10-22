/**
 * 构建微信小游戏包：编译 TypeScript，并把产物拷进 wechat/dist。
 *
 * 注意：本仓库目前没有微信开发者工具，这个脚本能保证「产物结构正确」，
 * 但真实设备上的运行需要开发者工具打开 wechat/ 目录来验证。
 */
import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const target = join(root, 'wechat', 'dist');

const tsc = spawnSync('npx', ['tsc'], { cwd: root, stdio: 'inherit', shell: true });
if (tsc.status !== 0) {
  console.error('TypeScript 编译失败，构建中止');
  process.exit(tsc.status ?? 1);
}

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(join(root, 'dist'), target, { recursive: true });

const main = join(target, 'app', 'main.js');
const info = await stat(main).catch(() => null);
if (!info) {
  console.error('产物缺少 app/main.js');
  process.exit(1);
}
console.log(`微信小游戏包已生成: ${target}`);
console.log(`入口: wechat/game.js → ${main}`);
