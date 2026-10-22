# 类《土豆兄弟》微信小游戏原型

原生 TypeScript + Canvas2D，竖屏固定单屏竞技场，12 波 / 单局约 5~6 分钟。
**浏览器先行验证手感**，同一份代码切到微信小游戏运行。

> 题材当前为 Chiikawa 占位（`content/theme.ts`，标注 `placeholder: true`），
> 仅本地自用、不发布不分发。换原创皮只需改主题数据，代码无需改动。

## 快速开始

```bash
npm install
npm run dev
```

打开 http://127.0.0.1:5180/

- 手机/触屏：按住任意位置拖动 = 浮动摇杆；轻点 = 按钮
- 桌面：WASD / 方向键移动，鼠标点击操作界面

## 一局的流程

选角色 → 第 1 波（15 秒）→ 升级三选一 → 商店 → 第 2 波 → …… → 第 12 波 Boss → 结算

- 武器自动开火，玩家只需走位
- 6 个武器槽，同名同品质武器可合成升阶
- 每拾取一个材料 = +1 材料 +1 经验（材料既是钱也是经验）
- 波末自动存档，中途退出可在选角界面「继续上次进度」

## 常用命令

| 命令 | 作用 |
|---|---|
| `npm run dev` | 编译 + 起本地服务器（http://127.0.0.1:5180/） |
| `npm test` | 编译 + 跑全部单元测试 |
| `npm run balance` | 用 bot 跑 3 角色 × 24 种子，输出通关率与存活波次 |
| `npm run check:boundaries` | 校验分层：`core/` 与 `content/` 不得依赖 `platform/` 或 `render/` |
| `npm run check:imports` | 校验相对导入全部可解析 |
| `npm run build:wechat` | 编译并把产物拷进 `wechat/dist/` |

## 目录结构

```
src/
├── content/    纯数据：武器、敌人、波次、角色、道具、主题
├── core/       纯逻辑：世界、公式、系统、商店、升级、存档（不碰 DOM）
├── render/     表现层：可整体替换（当前 Canvas2D，WebGL 基准见 docs）
├── platform/   平台层：types.ts 定义接口，browser/ 与 wechat/ 各自实现
└── app/        装配：main.ts 主循环 + platform-select.ts 环境判定
```

分层规则由 `tools/check-boundaries.mjs` 强制：`core/` 和 `content/` 不允许
import `platform/` 或 `render/`。这样换渲染后端或换平台时，逻辑层零改动。

## 调试钩子

浏览器控制台可用（仅开发期）：

```js
__game.run          // 当前局状态
__game.tick(600)    // 手动推进 600 帧（绕过后台标签页 rAF 节流）
__game.buttons()    // 当前帧已登记的按钮
__game.tap(x, y)    // 走真实 hitTest → handleTap 的点击
```

URL 参数（仅开发期）：

- `?char=hachiware` 直接开局，跳过选角
- `?theme=originalSkin` 切换皮肤，未知 id 自动回退默认

换皮是**纯数据切换**：`content/theme.ts` 里注册一个 `ThemeDef` 即可，
渲染与逻辑代码一行不用改。

## 已知限制

- 微信端产物可构建（`npm run build:wechat`），但**未在真机验证** —— 需要微信开发者工具打开 `wechat/`。
- 渲染当前为 Canvas2D。M0 实测 WebGL 约快 19 倍（10,619 vs 564 fps @ 500 sprite），
  上线前应换回 WebGL，决策记录见 `docs/superpowers/plans/m0-result.md`。

## 文档

- 设计 spec：`docs/superpowers/specs/2026-10-22-brotato-like-wechat-minigame-design.md`
- 实施计划：`docs/superpowers/plans/implementation-plan.md`
- M0 渲染基准与决策：`docs/superpowers/plans/m0-result.md`
