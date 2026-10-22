/**
 * 生成 Cloudflare Pages 上传目录。
 *
 * 不能直接上传仓库根：那里有 src/、node_modules/、.git/、docs/，
 * 传出去等于公开源码和依赖。这里只挑静态站真正需要的两个部分：
 *   index.html        入口（引用 /dist/app/main.js，绝对路径）
 *   dist/             编译产物
 * 并剔除 sourcemap 以减小体积。角色贴图在 assets/ 下，一并带上。
 */
import { cp, mkdir, rm, stat, readdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const stage = join(root, '.deploy', 'cf');

const tsc = spawnSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit', shell: true });
if (tsc.status !== 0) {
  console.error('构建失败，中止');
  process.exit(tsc.status ?? 1);
}

await rm(stage, { recursive: true, force: true });
await mkdir(stage, { recursive: true });
await cp(join(root, 'index.html'), join(stage, 'index.html'));
await cp(join(root, 'dist'), join(stage, 'dist'), { recursive: true });
// 角色贴图：相对路径引用（assets/chars/*.png），必须一起上传
await cp(join(root, 'assets'), join(stage, 'assets'), { recursive: true });

// Cloudflare Pages 默认给所有资源发 max-age=0, must-revalidate，
// 等于每次打开都要重新下载全部 JS 和贴图。这里覆盖掉：
//   assets/  文件名带 ?v= 版本号（见 src/content/sprites.ts），可以放心长缓存
//   dist/    文件名不带 hash，用 stale-while-revalidate 兼顾「秒开」和「能更新」
//   其余     index.html 保持强校验，保证外壳能及时更新
const headers = [
  '/assets/*',
  '  Cache-Control: public, max-age=31536000, immutable',
  '',
  '/dist/*',
  '  Cache-Control: public, max-age=60, stale-while-revalidate=86400',
  '',
].join('\n');
await writeFile(join(stage, '_headers'), headers, 'utf8');

// 剔除 sourcemap
async function stripMaps(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) await stripMaps(p);
    else if (e.name.endsWith('.map')) await rm(p, { force: true });
  }
}
await stripMaps(stage);

const mainJs = join(stage, 'dist', 'app', 'main.js');
if (!(await stat(mainJs).catch(() => null))) {
  console.error('产物缺少 dist/app/main.js');
  process.exit(1);
}

const files = [];
async function walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) await walk(p);
    else files.push(p);
  }
}
await walk(stage);

const total = (await Promise.all(files.map(async (f) => (await stat(f)).size))).reduce((a, b) => a + b, 0);
console.log(`上传目录: ${stage}`);
console.log(`文件 ${files.length} 个，${(total / 1024).toFixed(1)} KB`);
