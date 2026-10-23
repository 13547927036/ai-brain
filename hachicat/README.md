# 哈气猫 · Hachicat

手机竖屏 Roguelite 生存射击。橘猫守巷子，自动开火，撑过 12 波并打败首领「铁肺」。

- 原创角色、原创程序化美术、原创 UI，不含任何第三方 IP 素材。
- 技术栈：React + Vite + JavaScript + HTML5 Canvas。
- 核心逻辑与平台接口分离：同一套 `game/` + `render/` 已接入浏览器与微信小游戏两个入口。
- 线上地址：<https://hachicat.pages.dev/>（Cloudflare Pages，手机浏览器可直接打开）。

---

## 1. 现在能玩到什么

| 内容 | 说明 |
| --- | --- |
| 12 波 | 11 波普通怪 + 第 12 波首领，普通波结束进商店 |
| 4 个角色 | 橘座、煤球、雪团；影丸在第 8 波后解锁 |
| 6 种武器 | 毛球弹、磨爪、哈气、激光笔、尾巴旋风、捕鼠夹；每种 5 级，最多 6 格 |
| 合成 | 同种武器同等级两件合一件，等级 +1，最高 5 级 |
| 5 种敌人 | 扫地机（追击）、吸尘无人机（绕行）、喷水壶（远程）、垃圾桶怪（重装）、首领铁肺（三阶段） |
| 局内成长 | 经验升级三选一（18 种强化）、金币、道具（9 种） |
| 商店 | 每波后 2 武器 + 2 道具 + 治疗 + 刷新 |
| 委托 | 讨伐委托：接单即付底薪 30，胜利加奖金 60，按波次评 S/A/B/C |
| 结算 | 胜利/失败、最佳波次、局数、胜场存档 |
| 主题 | 霓虹夜巷 / 纸片白日，可持久化 |
| 操作 | 拖拽虚拟摇杆移动，武器自动瞄准最近敌人 |

## 2. 本地启动

环境：Node.js 20+（开发时用 Node 24）、npm。

```bash
cd hachicat
npm install
npm run dev
```

- 电脑浏览器：http://127.0.0.1:5190/
- 手机（同一 Wi-Fi）：http://<电脑局域网 IP>:5190/
  - 启动日志里的 `Network:` 一行就是可用地址，例如 `http://192.168.31.212:5190/`
  - 手机打开后建议「添加到主屏幕」，全屏体验更好
- 生产构建：`npm run build`，本地预览 `npm run preview`（http://127.0.0.1:5191/）

> 端口固定 5190（`strictPort`），避免和机器上其它项目（例如 5180 的旧版本）混在一起。

## 3. 手机操作

- **移动**：在屏幕任意位置按下并拖动，出现浮动摇杆；松手停下。
- **攻击**：全自动，武器各自瞄准射程内最近的敌人。
- **升级**：升级时战斗暂停，点一张卡（电脑上也可按 1/2/3）。
- **商店**：点商品购买，可治疗、刷新，然后点「下一波」。
- **暂停**：右上角按钮；切后台会自动暂停。
- 竖屏设计，适配 360×640 到 430×932 的常见手机尺寸。

## 4. 测试与实测结果

先启动 `npm run dev`，再跑 E2E。

```bash
npm test                 # 单元测试（Node 内置 test runner）
npm run test:e2e         # Playwright 端到端（需要本机 Chrome）
npm run check:boundaries # 分层边界检查
npm run check            # 边界 + 单测
```

本次实测（Windows + Chrome 正式版 + Playwright `channel: 'chrome'`）：

- 单元测试：**42 / 42 通过**（RNG、属性夹紧、经验曲线、升级、武器升级/满栏、商店购买/治疗/刷新、武器合成、战斗流程、暂停、首领三阶段、胜负、重开）。
- 端到端：**61 / 61 通过**。覆盖菜单 → 选角色 → 战斗 → 摇杆拖拽 → 升级三选一 → 暂停/恢复 → 清场进商店 → 购买/治疗/刷新 → 武器合成 → 下一波 → 首领 → 胜利 → 重开 → 失败 → 委托结算与评价 → 存档 → 主题切换 → 解锁角色 → 360×640 无横向溢出。
- 帧率：390×844、DPR 2 下 **60 fps**（180 帧平均 16.6ms，最差 17ms）。
- 控制台：**0 报错**。
- 数值模拟：无头机器人 4 局 3 胜，通关约 297–307 秒；一局在第 8 波阵亡。
- 截图：`screenshots/`（E2E 自动生成，含菜单、战斗、升级、商店、首领、结算、两种主题）。

## 5. 目录结构（分层）

```
src/
  content/    纯数据：角色、武器、敌人、波次、升级、道具、主题、素材注册表
  game/       纯逻辑：世界、系统（移动/武器/敌人/子弹/掉落/伤害）、进度、RNG
  render/     Canvas 绘制：背景、精灵、渲染器（只读世界状态）
  platform/   平台适配：browser.js / wechat.js（画布、触摸、存储、震动、音效）
  input/      浮动摇杆（基于 platform 的指针接口）
  app/        控制器：把 game 事件翻译成 UI 快照与音效/震动
  ui/         React 界面：菜单、选角、HUD、升级、商店、暂停、结算
  styles/     主题变量 + 基础样式 + 组件 + 页面布局
  wechat/     微信小游戏 Canvas 版入口（复用 game/render/platform）
tests/        单元测试
tools/        e2e、边界检查、小游戏构建、调试脚本
```

分层规则由 `npm run check:boundaries` 强制：

- `content/`、`game/` 不能出现 DOM / Canvas / React；
- `render/` 不碰 DOM 事件与存储；
- `ui/` 不直接引用平台层；
- 换皮只允许改 `content/`、`render/`、`styles/`，不改战斗数值与 AI。

## 6. 美术替换（换皮）指南

现在的角色/敌人/图标都是**程序化占位图形**，但外观已经全部数据化：

1. **精灵注册表**：`src/content/assets.js`
   - 每个条目有 `kind`（画法）、`palette`（配色）、可选的 `themeOverrides`。
   - 想换成图片：在 `assets.js` 把条目改成 `{ kind: 'image', src: '...' }`，再在 `src/render/sprites.js` 的 `drawSprite` 分支里加图片绘制即可；`game/` 不需要任何改动。
2. **主题**：`src/content/theme.js` 定义 `neon` / `paper` 两套颜色与背景参数；新增主题只需加一个对象 + 在 `assets.js` 里补对应覆盖。
3. **UI 配色**：`src/styles/theme.css` 的 CSS 变量（`html[data-theme]`）。界面组件只引用变量，不写死颜色。
4. **验证**：改完跑 `npm run check:boundaries` 与 `npm run test:e2e`，确保只动了外观。

## 7. 微信小游戏适配（已实现，未真机验证）

小游戏没有 DOM / React-DOM，网页版 React 界面不能直接搬过去。因此：

- `src/platform/wechat.js`：wx 的画布、触摸、存储、震动适配（与 browser.js 同接口）。
- `src/wechat/main.js`：**Canvas 版界面**，复用同一套 `game/` 与 `render/`，覆盖菜单、选角、战斗、升级、商店、暂停、结算。
- 构建：

```bash
npm run wechat
```

产物在 `wechat-dist/`：`game.js`（IIFE，约 140KB / gzip 34KB）、`game.json`、`project.config.json`。

用微信开发者工具「导入项目」选择 `wechat-dist/`，AppID 可先用测试号。已知限制：

- 未在开发者工具/真机实测（本机没有微信开发者工具）；首次导入若报错，优先检查 `game.json` 的 `deviceOrientation` 与基础库版本。
- 小游戏暂未接入音频文件（网页版是 WebAudio 合成音效），目前只有震动反馈。
- 小游戏界面为 Canvas 手绘，视觉精细度低于网页版 React 界面，后续可替换为精灵图。
- 网页版与小程序共用存档键名 `hachicat.*`，但两端存储不互通。

### 小游戏产物的自动冒烟测试

```bash
npm run wechat
npm run test:wechat
```

`tools/wechat-smoke.mjs` 会用假的 `wx` + Canvas 上下文执行 `wechat-dist/game.js`，模拟「开始游戏 → 选角色 → 出战」，跑约 96 帧。本次结果：**通过**，产生 11617 次填充、790 次文字绘制、2818 次描边，0 异常。它不能替代真机，但能提前发现入口、界面与主循环的崩溃。

## 8. 已知问题 / 未完成

- 难度只经过机器人模拟与自动化测试，**缺少真人手感校准**（尤其手机上的摇杆半径与波次节奏）。
- 音效为程序化合成，没有背景音乐；微信端无音效。
- 没有排行榜、云存档、成就系统。
- 首领弹幕与召唤在低端机上的性能未实测（当前 60fps 为中端桌面 Chrome 数据）。

## 9. 常用命令

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 开发服务器（0.0.0.0:5190） |
| `npm run build` | 生产构建到 `dist/` |
| `npm run preview` | 预览生产包（5191） |
| `npm test` | 单元测试 |
| `npm run test:e2e` | 端到端测试 + 截图 |
| `npm run check` | 边界检查 + 单测 |
| `npm run wechat` | 构建微信小游戏包到 `wechat-dist/` |
| `npm run test:wechat` | 用假 wx 环境冒烟执行小游戏产物 |

调试入口：开发模式或 `?debug=1` 时，控制台可用 `window.__hachicat`（`state()`、`start()`、`jumpWave()`、`money()`、`win()`、`lose()` 等）。

## 10. 部署到 Cloudflare Pages

当前使用 **Direct Upload**（没有接 Git 自动部署），项目名 `hachicat`，固定域名 <https://hachicat.pages.dev/>。账号下的旧项目 `huffcat` 与 `brotato-like-minigame` 已于 2026-10-23 删除，只保留本项目。

更新线上版本：

```bash
npm run build
npx wrangler pages deploy dist --project-name hachicat --branch main
```

说明：

- 换机器或首次部署需要先 `npx wrangler login`。
- 部署后在 Cloudflare 控制台可看到 Production 记录；`--branch main` 对应生产环境。
- 本机 Chrome 若访问 `*.pages.dev` 报 SSL 错误，可用 `--disable-quic --disable-features=EncryptedClientHello` 启动；手机浏览器一般不受影响。