/**
 * 分层边界检查：保证"游戏逻辑 / 渲染 / 平台 / 界面"不会被写成一锅粥。
 *
 * 规则（改代码前先看这里）：
 *   content/  纯数据，只能引用 content/ 内部
 *   game/     纯逻辑，可以引用 content/、game/，禁止 DOM / Canvas / React
 *   render/   Canvas 绘制，可以引用 content/、render/、game 的纯工具（rng/constants）
 *   platform/ 浏览器 / 微信适配，禁止引用游戏内容
 *   ui/       React 界面，可以引用 content/、render/、ui/、react
 *   app/      控制器（胶水层），允许引用以上所有
 *   input/    输入适配，只依赖自身
 *
 * 运行：npm run check:boundaries
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const SRC = 'src';

const IMPORT_RE = /(?:import\s+(?:[\s\S]*?\s+from\s+)?|import\()\s*['"]([^'"]+)['"]/g;

const FORBID = {
  content: [/^\.\.\/(game|render|ui|platform|app|input)\//, /^react/, /^react-dom/],
  game: [/^\.\.\/(render|ui|platform|app|input)\//, /^react/, /^react-dom/],
  render: [/^\.\.\/(ui|platform|app|input)\//, /^react/, /^react-dom/],
  platform: [/^\.\.\/(content|game|render|ui|app|input)\//, /^react/, /^react-dom/],
  ui: [/^\.\.\/(platform|app|input)\//, /^\.\.\/game\/(?!rng|constants)/, /^react-dom\/server/],
  input: [/^\.\.\/(content|game|render|ui|platform|app)\//, /^react/],
  app: [],
};

// 逻辑层绝对不能出现的浏览器对象 / Canvas API
const DOM_TOKENS = [
  'document.',
  'window.',
  'localStorage',
  'sessionStorage',
  'navigator.',
  'requestAnimationFrame(',
  'getContext(',
  'new Image(',
  'HTMLCanvasElement',
  'addEventListener(',
];

// render 层允许出现 Canvas API，但不能碰 DOM 事件 / 存储
const RENDER_FORBIDDEN = ['document.', 'localStorage', 'sessionStorage', 'addEventListener('];

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(js|jsx)$/.test(name)) out.push(p);
  }
  return out;
}

const files = walk(SRC);
const violations = [];
let checked = 0;

for (const file of files) {
  const rel = relative('.', file).split(sep).join('/');
  const layer = rel.split('/')[1];
  const src = readFileSync(file, 'utf8');
  const code = stripComments(src);
  checked += 1;

  const rules = FORBID[layer] || [];
  IMPORT_RE.lastIndex = 0;
  let m;
  while ((m = IMPORT_RE.exec(src))) {
    const spec = m[1];
    for (const rule of rules) {
      if (rule.test(spec)) {
        violations.push(`${rel}: 引用了不允许的模块 "${spec}"（${layer} 层）`);
      }
    }
  }

  if (layer === 'content' || layer === 'game') {
    for (const token of DOM_TOKENS) {
      if (code.includes(token)) {
        violations.push(`${rel}: 逻辑层出现浏览器/Canvas API "${token}"`);
      }
    }
    if (code.includes('fillStyle') || code.includes('strokeStyle') || code.includes('drawImage')) {
      violations.push(`${rel}: 逻辑层出现绘制代码（换皮应该只改 render/ 与 content/）`);
    }
  }

  if (layer === 'render') {
    for (const token of RENDER_FORBIDDEN) {
      if (code.includes(token)) violations.push(`${rel}: 渲染层不应处理 DOM/存储 "${token}"`);
    }
  }
}

console.log(`检查 ${checked} 个源文件的分层依赖…`);
if (violations.length) {
  console.error(`\n发现 ${violations.length} 处越界：`);
  for (const v of violations) console.error('  ✗ ' + v);
  process.exit(1);
}
console.log('✓ 分层边界正常：逻辑层无 DOM / Canvas / React 依赖，界面层不直接引用平台层。');