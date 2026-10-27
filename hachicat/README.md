# 吉伊卡哇 · 讨伐委托（同人）

手机竖屏 Roguelite 生存讨伐。小动物们接下一份讨伐委托，自动攻击，完成 12 波并击退巨兽「隆隆」。

> **非官方同人作品。** 本项目未获得《Chiikawa》（吉伊卡哇）原作者或版权方的授权，也不代表官方立场。若后续涉及公开商业化或正式发行，应先核实相关 IP 权利。
>
> 三张角色图片 `public/chars/*.png` 为项目内既有素材，本轮没有重绘或替换；角色与作品相关权利归原作者及权利方。敌人、图标、场景与界面为本项目原创的程序化美术与设计，不是原作官方怪物设定。

- 技术栈：React + Vite + JavaScript + HTML5 Canvas。
- 核心逻辑与平台接口分离：同一套 `game/` + `render/` 已接入浏览器与微信小游戏两个入口。
- 线上地址：<https://hachicat.pages.dev/>（Cloudflare Pages，手机浏览器可直接打开）。
- 本次题材改造的审计与方案：[docs/chiikawa-theme-redesign.md](docs/chiikawa-theme-redesign.md)。

---

## 1. 现在能玩到什么

| 内容 | 说明 |
| --- | --- |
| 12 波 | 4 个阶段：1–3 基础、4–6 新怪与走位压力、7–9 精英与协同、10–12 高压与讨伐目标（10–11 高压、12 目标）；普通波结束进补给点 |
| 3 个搭档 | 小八、吉伊卡哇、乌萨奇（使用项目内三张既有角色图，未改数值） |
| 6 种装备 | 毛线团、小木槌、小喇叭、手电筒、风车、捕兽夹；每种 5 级，最多 6 格 |
| 整理 | 同种装备同等级两件合一件，等级 +1，最高 5 级 |
| 副本 | 补给点有概率（30%）出售同名同等级副本，单价为直购升级价的 42%，买下即可整理 |
| 9 种普通怪 + 召唤物 + 讨伐目标 | 蓬蓬兽（追击）、飘飘鸟（绕行）、喷籽花（远程）、壳壳兽（重装）、冲撞兽（突进）、铁甲虫（远程减伤）、噗噗果（自爆）、巢巢兽（召唤）、荧光菇（支援）；小绒球（召唤物）、隆隆（三阶段讨伐目标） |
| 精英怪 | 第 7 波起按波次间隔出现，生命 ×1.8、伤害 ×1.25、体积 ×1.12、奖励 ×3，四角金色标记 |
| 局内成长 | 经验升级三选一（18 种成长）、金币、用品（9 种） |
| 补给点 | 每波后 2 装备 + 2 用品 + 喝碗热汤 + 换一批；装备等级越高越贵，副本按 42% 折价 |
| 委托 | 讨伐委托：接单基础报酬 30，完成奖金 80，按波次评 S/A/B/C；沿途金币一并计入 |
| 结算 | 委托完成/中止、基础报酬、沿途收入、完成奖金、评价、最佳波次/局数/胜场存档 |
| 主题 | 星夜集市 / 纸片日常，可持久化 |
| 操作 | 拖拽虚拟摇杆移动，装备自动瞄准最近怪物 |

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

> 端口固定 5190（`strictPort`），避免和机器上其它项目混在一起。

## 3. 手机操作

- **移动**：在屏幕任意位置按下并拖动，出现浮动摇杆；松手停下。
- **攻击**：全自动，装备各自瞄准射程内最近的怪物。
- **成长**：升级时战斗暂停，点一张卡（电脑上也可按 1/2/3）。
- **补给点**：点商品买下，可喝汤、换一批，然后点「继续赶路」。
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

- 单元测试：**85 / 85 通过**（RNG、属性夹紧、经验曲线、成长、装备升级/满栏、补给点购买/喝汤/换一批、副本出现率与定价、装备整理闭环、战斗流程、暂停、讨伐目标三阶段、胜负、重开、角色数量守卫、名称与图片绑定、素材等比未变形、角色描述与旧文案清除；新增敌人 AI、精英缩放、波次解锁、经济不变量、玩家可见文案残留检查、装备/用品图标映射）。
- 端到端：**84 / 84 通过**。覆盖：标题与选角、6 种新怪生成、精英金环、冲撞兽突进预警、噗噗果引信、第 11 波多类型同屏、讨伐目标 9000 血与弹幕/冲刺预警、补给点购买/整理/喝汤、用品图标、结算、两种主题；控制台 0 报错。
- 帧率：390×844、DPR 2 下 **60 fps**（数据见每轮实测日志）。
- 压力帧率：第 11 波 40+ 敌人、3 秒 180+ 帧，**60 fps**（`npm run perf:stress`，需先 `npm run dev`）。
- 数值模拟：54 局/版本（3 角色 × 3 种子 × 6 场景），详见 [balance-report.md](docs/balance-report.md)。本次只改展示与美术，**经济与战斗数值未调整**。
- 微信小游戏冒烟：通过，0 异常。
- 截图：`screenshots/`（E2E 自动生成，含菜单、战斗、新怪物、第 11 波、补给点、讨伐目标、结算、两种主题）。

## 5. 目录结构（分层）

```
src/
  content/    纯数据：角色、武器、敌人、波次、升级、道具、主题、素材注册表
  game/       纯逻辑：世界、系统（移动/武器/敌人/子弹/掉落/伤害）、进度、RNG
  render/     Canvas 绘制：背景、精灵、渲染器（只读世界状态）
  platform/   平台适配：browser.js / wechat.js（画布、触摸、存储、震动、音效）
  input/      浮动摇杆（基于 platform 的指针接口）
  app/        控制器：把 game 事件翻译成 UI 快照与音效/震动
  ui/         React 界面：菜单、选角、HUD、成长、补给点、暂停、结算
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

现在的**敌人与图标**是程序化绘制，三个主角使用位图素材，二者共用同一套精灵注册表：

1. **精灵注册表**：`src/content/assets.js`
   - 每个条目有 `kind`（画法）、`palette`（配色）、可选的 `themeOverrides`。
   - 换成图片：条目写成 `{ kind: 'image', image: './chars/xxx.png', palette: {...} }`，
     `palette` 仅作为图片不可用时的兜底配色。加载与缓存见 `src/render/char-images.js`，
     绘制分支在 `src/render/sprites.js`；`game/` 不需要任何改动。
   - 位图几何约定：素材按「内容宽度 192px、四边贴合内容」导出（裁掉透明边 + 等比缩放，
     不改变主体、比例、颜色与透明背景）。绘制时按同一系数等比缩放，屏上内容宽度为
     `size * 0.7`，脚底对齐 `y + size * 16 / 44`，正好落在渲染器画好的投影椭圆上。
     三个主角共用同一系数，因此相对比例与原图一致。
   - 美术为正面视角，故不随移动方向做水平镜像；受击闪白与移动起伏沿用原逻辑。
   - 素材来源：三张角色位图是项目既有素材，本轮未改动；敌人、图标与场景为原创程序化绘制，
     未引入任何网络图片素材。
   - 图片加载不出来时（例如微信小游戏没有 `HTMLImageElement`）自动退回程序化小动物，
     按 `variant` 区分圆耳/尖耳/长耳轮廓，界面与战斗都不会空白。
2. **主题**：`src/content/theme.js` 定义 `neon` / `paper` 两套颜色与背景参数（内部 id 保留，显示名分别为「星夜集市」「纸片日常」）；新增主题只需加一个对象 + 在 `assets.js` 里补对应覆盖。
3. **UI 配色**：`src/styles/theme.css` 的 CSS 变量（`html[data-theme]`）。界面组件只引用变量，不写死颜色。
4. **验证**：改完跑 `npm run check:boundaries` 与 `npm run test:e2e`，确保只动了外观。

## 7. 微信小游戏适配（已实现，未真机验证）

小游戏没有 DOM / React-DOM，网页版 React 界面不能直接搬过去。因此：

- `src/platform/wechat.js`：wx 的画布、触摸、存储、震动适配（与 browser.js 同接口）。
- `src/wechat/main.js`：**Canvas 版界面**，复用同一套 `game/` 与 `render/`，覆盖菜单、选搭档、战斗、成长、补给点、暂停、结算。
- 构建：

```bash
npm run wechat
```

产物在 `wechat-dist/`：`game.js`（IIFE，约 191KB / gzip 45KB）、`game.json`、`project.config.json`。

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

`tools/wechat-smoke.mjs` 会用假的 `wx` + Canvas 上下文执行 `wechat-dist/game.js`，模拟「接取委托 → 选搭档 → 出战」，跑约 96 帧。它不能替代真机，但能提前发现入口、界面与主循环的崩溃。

## 8. 已知问题 / 未完成

- 难度只经过机器人模拟与自动化测试，**缺少真人手感校准**。
- 近战型怪物（冲撞兽、铁甲虫、噗噗果、荧光菇）对完美走位机器人几乎打不出伤害，真人压迫感需要用手机校准。
- 音效为程序化合成，没有背景音乐；微信端无音效。
- 没有排行榜、云存档、成就系统。
- 讨伐目标弹幕与 40 敌人同屏在低端机上的性能未实测（当前 60fps 为中端桌面 Chrome 数据；真机仍需确认）。
- 微信小游戏未在开发者工具/真机实测，新怪物只通过共用 `render/` 的理论复用与冒烟测试。
- 本轮没有实现「除草」工作玩法；世界观里保留了这项工作，后续可在同一委托框架下扩展。

## 9. 常用命令

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 开发服务器（0.0.0.0:5190） |
| `npm run build` | 生产构建到 `dist/` |
| `npm run preview` | 预览生产包（5191） |
| `npm test` | 单元测试 |
| `npm run test:e2e` | 端到端测试 + 截图 |
| `npm run sim:balance` | 无头机器人 12 波平衡模拟（可加 `--scenario` / `--build` / `--runs`） |
| `npm run perf:stress` | 第 11 波 40+ 敌人的压力帧率（需先 `npm run dev`） |
| `npm run check` | 边界检查 + 单测 |
| `npm run wechat` | 构建微信小游戏包到 `wechat-dist/` |
| `npm run test:wechat` | 用假 wx 环境冒烟执行小游戏产物 |

调试入口：开发模式或 `?debug=1` 时，控制台可用 `window.__hachicat`（`state()`、`start()`、`jumpWave()`、`money()`、`spawn()`、`enemies()`、`win()`、`lose()` 等）。

## 10. 部署到 Cloudflare Pages

当前使用 **Direct Upload**（没有接 Git 自动部署），项目名 `hachicat`，固定域名 <https://hachicat.pages.dev/>。

更新线上版本：

```bash
npm run build
npx wrangler pages deploy dist --project-name hachicat --branch main
```

说明：

- 换机器或首次部署需要先 `npx wrangler login`。
- 部署后在 Cloudflare 控制台可看到 Production 记录；`--branch main` 对应生产环境。
- 本机 Chrome 若访问 `*.pages.dev` 报 SSL 错误，可用 `--disable-quic --disable-features=EncryptedClientHello` 启动；手机浏览器一般不受影响。
