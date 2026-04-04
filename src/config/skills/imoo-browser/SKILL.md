---
name: imoo-browser
description: 浏览器自动化控制工具 - 通过 WebSocket + CDP 控制用户已登录的 Chrome 浏览器。TRIGGER: 用户提到飞书/语雀/Notion/GitHub 等需要登录的网站、提供 feishu.cn/yuque.com/notion.so/github.com 等 URL、或需要浏览器自动化/截图/提取数据时。DO NOT TRIGGER: 公开网页且不需要登录态时可用 WebFetch。
---

# imoo-browser - 浏览器自动化控制

通过 Chrome DevTools Protocol (CDP) 控制用户已登录的浏览器，保留认证状态，无需重新登录或处理验证码。

## 核心优势

- ✅ **保留登录态** - 控制用户已登录的浏览器，无需重新登录、处理验证码
- ✅ **完整 CDP 能力** - 截图、PDF、Cookie 管理、网络拦截等
- ✅ **Puppeteer API 兼容** - 提供标准 Puppeteer API，学习成本低
- ✅ **实时监听** - 自动捕获 console、network、error 事件
- ✅ **零配置** - 用户无需特殊启动浏览器

## 架构

```
┌─────────────────────┐
│  Puppeteer API      │  标准 API（page.click(), page.screenshot()）
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  WebSocket CLI      │  命令转发和事件监听
└──────────┬──────────┘
           │
┌──────────▼──────────┘
│  Chrome Extension   │  CDP 执行（chrome.debugger API）
│  + DevTools Protocol│  保留用户认证状态
└─────────────────────┘
```

## 使用场景

### 场景 1：访问需要登录的网站

传统 Puppeteer 需要重新登录、处理验证码、传递 Cookie：

```javascript
// ❌ 麻烦：需要登录流程
const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.goto('https://github.com/login');
await page.type('#login_field', 'username');
await page.type('#password', 'password');
await page.click('[name="commit"]');
```

imoo-browser 直接使用已登录的浏览器：

```javascript
// ✅ 简单：自动使用登录态
const browser = await connect();
const page = (await browser.pages())[0];
await page.goto('https://github.com/settings/profile');
// 已经登录了！
```

### 场景 2：网页截图/PDF

```javascript
import { connect } from '/Users/imoo/work/data/project/ai-config/config/tools/imoo-browser/cli/src/puppeteer-wrapper.js';

const browser = await connect();
const page = (await browser.pages())[0];

await page.goto('https://example.com');

// 截图
await page.screenshot({ path: 'screenshot.png' });

// 全页截图
await page.screenshot({ path: 'full.png', fullPage: true });

// PDF
await page.pdf({ path: 'page.pdf', format: 'A4' });

await browser.close();
```

### 场景 3：提取页面数据

```javascript
// 获取页面 HTML
const html = await page.content();

// 获取页面标题
const title = await page.title();

// 获取元素文本
const text = await page.$eval('h1', el => el.textContent);

// 获取多个元素
const items = await page.$$eval('.item', els => els.map(e => e.textContent));
```

### 场景 4：Cookie 管理

```javascript
// 获取所有 Cookie
const cookies = await page.cookies();

// 设置 Cookie
await page.setCookie({
  name: 'token',
  value: 'abc123',
  domain: '.example.com',
  path: '/',
  httpOnly: true,
  secure: true
});

// 删除 Cookie
await page.deleteCookie({ name: 'token' });
```

### 场景 5：表单操作

```javascript
// 输入文本
await page.type('input[name="username"]', 'admin');

// 点击按钮
await page.click('button[type="submit"]');

// 选择下拉框
await page.select('select[name="country"]', 'US');

// 聚焦元素
await page.focus('input[name="email"]');
```

## 快速开始

### 前提条件

1. **安装扩展** (一次即可):
   - 打开 Chrome，访问 `chrome://extensions/`
   - 开启「开发者模式」
   - 点击「加载已解压的扩展程序」，选择 `extension` 目录

2. **启动 Server** (每次使用前，必须先启动):
   ```bash
   cd /Users/imoo/work/data/project/ai-config/config/tools/imoo-browser
   ./start.sh
   ```
   或手动：
   ```bash
   pnpm cli:server
   ```

3. **在 Chrome 中打开目标网页** (保持标签页活动)

**注意**：服务未启动时，所有请求会失败。使用前请确认 server 已运行。

### 执行代码

```javascript
import { connect } from '/Users/imoo/work/data/project/ai-config/config/tools/imoo-browser/cli/src/puppeteer-wrapper.js';

const browser = await connect();
const page = (await browser.pages())[0];

// 导航
await page.goto('https://example.com');

// 等待元素
await page.waitForSelector('h1');

// 获取标题
const title = await page.title();
console.log('Page title:', title);

// 截图
await page.screenshot({ path: 'screenshot.png' });

await browser.close();
```

## 完整 API 支持

### 导航
```javascript
await page.goto(url, options)
await page.waitForNavigation(options)
await page.reload(options)
await page.goBack()
await page.goForward()
```

### 选择器
```javascript
const element = await page.$(selector)        // 单个元素
const elements = await page.$$(selector)      // 多个元素
await page.$eval(selector, fn, ...args)       // 在元素上执行函数
await page.$$eval(selector, fn, ...args)      // 在多个元素上执行函数
await page.waitForSelector(selector, options) // 等待元素出现
```

### 操作
```javascript
await page.click(selector)
await page.type(selector, text)
await page.select(selector, ...values)
await page.focus(selector)
await page.hover(selector)  // 鼠标悬停
```

### JavaScript 执行
```javascript
const result = await page.evaluate(pageFunction, ...args)
const handle = await page.evaluateHandle(pageFunction, ...args)
```

### 内容
```javascript
const html = await page.content()
const title = await page.title()
const url = await page.url()
```

### 截图 & PDF
```javascript
// 截图
await page.screenshot({ path: 'screenshot.png' })
await page.screenshot({ path: 'full.png', fullPage: true })
const buffer = await page.screenshot({ encoding: 'base64' })

// PDF
await page.pdf({ path: 'page.pdf', format: 'A4' })
```

### 视口
```javascript
await page.setViewport({ width: 1920, height: 1080 })
const viewport = await page.viewport()
```

### 等待
```javascript
await page.waitForTimeout(1000)
await page.waitForFunction(() => document.querySelector('.loaded'))
```

## 命令行模式

也可以通过命令行直接执行操作：

```bash
# 启动 server
pnpm cli:server

# 单命令
node cli/bin/cli.js --command "navigate https://example.com"
node cli/bin/cli.js --command "screenshot"
node cli/bin/cli.js --command "click h1"
node cli/bin/cli.js --command "type input[name=q] hello"
```

可用命令：

| 命令 | 说明 |
|------|------|
| `navigate <url>` | 导航到 URL |
| `click <selector>` | 点击元素 |
| `type <selector> <text>` | 输入文本 |
| `evaluate <expression>` | 执行 JS |
| `screenshot` | 截图 |
| `snapshot` | 获取页面 HTML 和文本 |
| `extract <selector>` | 提取元素数据 |
| `gethtml <selector>` | 获取元素 HTML |
| `gettext <selector>` | 获取元素文本 |

## 注意事项

- Extension 无法在 `chrome://`、`edge://` 等系统页面运行
- 使用 CDP 时浏览器标签页会显示「正在调试」提示
- 同一时间只能有一个 debugger 连接到标签页
- 不支持 `browser.newPage()` - 当前仅支持单页面模式
- 某些高级功能未实现：`page.coverage`、`page.tracing`

## 错误处理

```javascript
try {
  await page.goto('https://example.com');
  await page.waitForSelector('.content', { timeout: 5000 });
} catch (err) {
  if (err.message.includes('timeout')) {
    console.error('Element not found within timeout');
  } else if (err.message.includes('Connection')) {
    console.error('Extension not connected');
  } else {
    throw err;
  }
}
```

常见错误：
- `Connection timeout` - Extension 未连接或 server 未运行
- `Element not found` - 选择器错误或元素不存在
- `Timeout` - 操作超时
- `Debugger detached` - CDP 连接断开

## 最佳实践

1. **使用 server 模式** - 后台运行 WebSocket 服务，避免频繁重连
2. **合理设置超时** - 根据网络情况调整 timeout
3. **错误处理** - 始终使用 try-catch 处理可能的异常
4. **选择器优先级** - ID > data-* > class > tag
5. **等待机制** - 优先使用 `waitForSelector` 而非固定 `waitForTimeout`

## 示例代码

```javascript
// 完整示例：访问 GitHub 并提取数据
import { connect } from '/Users/imoo/work/data/project/ai-config/config/tools/imoo-browser/cli/src/puppeteer-wrapper.js';

const browser = await connect();
const page = (await browser.pages())[0];

// 导航到 GitHub（已登录状态）
await page.goto('https://github.com');

// 等待搜索框加载
await page.waitForSelector('input[name="q"]');

// 输入搜索内容
await page.type('input[name="q"]', 'imoo-browser');

// 等待搜索结果
await page.waitForSelector('[role="search"]', { timeout: 5000 });

// 获取页面标题
const title = await page.title();
console.log('Title:', title);

// 截图
await page.screenshot({ path: 'github.png', fullPage: true });

// 获取 Cookie
const cookies = await page.cookies();
console.log(`Found ${cookies.length} cookies`);

// 获取页面内容
const html = await page.content();
console.log(`HTML length: ${html.length} chars`);

await browser.close();
console.log('Done!');
```
