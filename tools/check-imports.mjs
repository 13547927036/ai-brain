import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const entry = process.argv[2] ?? 'dist/app/main.js';
const visited = new Set();
const missing = [];
const edges = [];

function walk(file) {
  if (visited.has(file)) return;
  visited.add(file);
  if (!existsSync(file)) {
    missing.push(file);
    return;
  }
  const code = readFileSync(file, 'utf8');
  const re = /(?:^|[\s;}])(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(code)) !== null) {
    const spec = m[1];
    if (!spec.startsWith('.')) continue;
    const target = resolve(dirname(file), spec);
    edges.push([file, target]);
    walk(target);
  }
}

walk(resolve(entry));

console.log(`入口: ${resolve(entry)}`);
console.log(`模块数: ${visited.size - missing.length}`);
if (missing.length === 0) {
  console.log('所有相对导入均可解析');
  process.exit(0);
}
console.log(`\n缺失 ${missing.length} 个:`);
for (const f of missing) {
  const src = edges.filter(([, t]) => t === f).map(([s]) => s);
  console.log(`  ${f}`);
  for (const s of src) console.log(`    <- 来自 ${s}`);
}
process.exit(1);
