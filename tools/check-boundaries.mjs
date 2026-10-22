import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const CORE = join(ROOT, 'src', 'core');
const RULES = [
  { name: 'core 不得依赖 render', re: /from\s+['"][^'"]*\/render\// },
  { name: 'core 不得依赖 platform', re: /from\s+['"][^'"]*\/platform\// },
  { name: 'core 不得依赖 app', re: /from\s+['"][^'"]*\/app\// },
  { name: 'core 不得依赖 ui', re: /from\s+['"][^'"]*\/ui\// },
];

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.name.endsWith('.ts')) yield full;
  }
}

if (!existsSync(CORE)) {
  console.log('边界检查通过（src/core 尚不存在）');
  process.exit(0);
}

let violations = 0;
for await (const file of walk(CORE)) {
  const src = await readFile(file, 'utf8');
  for (const rule of RULES) {
    if (rule.re.test(src)) {
      console.error(`[boundary] ${relative(ROOT, file)} -> ${rule.name}`);
      violations++;
    }
  }
}
if (violations > 0) {
  console.error(`\n边界检查失败：${violations} 处违规`);
  process.exit(1);
}
console.log('边界检查通过');
