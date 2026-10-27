# 哈奇猫：四方向角色动画素材规范与接入方案

> 状态：**接入准备**。本文不包含真实逐帧素材，也不代表动画已经完成。
> 当前线上版本继续使用 `public/chars/*.png` 静态立绘 + 整体起伏，功能不受影响。

## 1. 现有角色 PNG 审计

三张图片均为 8-bit RGBA、透明背景、四角 alpha 为 0，没有文字或场景背景：

| 文件 | 像素尺寸 | 全透明像素 | 内容边界 | 当前用途 |
| --- | --- | --- | --- | --- |
| `public/chars/hachiware.png` | 185 × 121 | 19.0% | 四边贴合内容 | 小八 |
| `public/chars/chiikawa.png` | 192 × 116 | 16.0% | 四边贴合内容 | 吉伊卡哇 |
| `public/chars/usagi.png` | 187 × 168 | 38.2% | 四边贴合内容 | 乌萨奇 |

注意：

- 三张图是**按内容裁切**的导出，不是统一画布，没有统一留白和脚底锚点；不能直接拿来做四方向图集。
- 三张图都是正面/趴卧姿态，没有背面、侧面、行走帧。
- 角色主体在部分边缘接近图片边界，扩展新姿势时应重新建立固定 cell，而不是在原图上补边。

当前使用位置：

| 位置 | 代码 | 展示方式 |
| --- | --- | --- |
| 战斗 | `src/render/renderer.js` `drawSprite(..., size: 46)` | 屏上内容宽约 32.2px，脚底对齐 `y + 16.7` |
| 首页主视觉 | `src/ui/MainMenu.jsx` `SpriteIcon size={186}` | 静态图，经 `drawSpriteIcon` 缩放 |
| 选角卡 | `src/ui/CharacterSelect.jsx` `SpriteIcon size={56}` | 静态图，经 `drawSpriteIcon` 缩放 |
| 图片加载 | `src/render/char-images.js` | 每张图一个 `Image` 缓存 |
| 图片绘制 | `src/render/sprites.js` `drawCharImage` | 固定内容宽度 192 的静态绘制 |

## 2. 当前动画能力与缺口

### 已经有的

- `src/render/renderer.js` 的 `playAnim` 只做整体姿态：`bob`（起伏）、`sway`（摆动）、`tilt`（微倾）、`lean`（前后倾）。
- 角色移动时，`playAnim.move` 平滑过渡，节奏随实际移速变化。
- 受击闪白、投影、相机和碰撞都独立于立绘，换素材不会改变战斗判定。

### 还没有的

- **没有四方向**：`src/game/world.js` 只有 `facing: 1`（±1），`src/game/systems/weapons.js` 根据瞄准/移动把它设成左右符号。
- **没有方向切换**：`drawCharImage` 完全忽略 `facing`，始终画同一张正面图。
- **没有待机/走路状态**：渲染层没有 `idle` / `walk` 帧概念，也没有帧索引。
- **没有帧图集加载**：`char-images.js` 只加载一张静态 `Image`，不能按方向或帧取子矩形。
- **没有脚底锚点元数据**：当前靠固定常量 `IMAGE_CONTENT_W = 192`、`IMAGE_FOOT_RATIO = 16/44` 近似对齐。

结论：**当前渲染逻辑不支持根据移动方向切换动画**。需要增加一层“可选图集动画”，并在图集缺失时回退到现有静态 PNG；不能把程序化兜底当成逐帧动画。

## 3. 素材规格

### 3.1 四个方向

| 方向 | 含义 | 注意 |
| --- | --- | --- |
| `down` | 面向镜头/向下 | 正面，保留完整面部 |
| `up` | 背向镜头/向上 | 背面，不画正脸；保留耳朵、背部花纹等识别点 |
| `left` | 朝左 | 左侧面；鼻子/眼睛朝画面左 |
| `right` | 朝右 | 右侧面；鼻子/眼睛朝画面右 |

左、右必须分别绘制，**不要只画一侧再镜像**。镜像会让围巾、耳朵、尾巴、花纹方向错误；只有在素材临时缺失时才允许程序镜像作为降级。

### 3.2 帧数

每个方向：

- 待机：**4 帧**（最低 2 帧，推荐 4 帧；循环呼吸/眨眼，不位移）
- 走路：**6 帧**（固定 6 帧；左右脚/手脚交替，首尾可循环）

每个角色合计：`4 × (4 + 6) = 40 帧`。三个角色共 120 帧，建议先只做小八，验证切分和脚底锚点后再扩展。

### 3.3 单帧画布与锚点

推荐统一参数：

```text
cell:        256 × 256 px
content max: 192 × 192 px
foot anchor: (128, 224)
safe area:   x = 32..224, y = 32..224
```

- 每帧角色必须完整落在 256×256 内，不得跨帧裁切。
- 角色水平中心对齐 `x = 128`；最低轮廓点（脚底/身体底部）对齐 `y = 224`。
- 角色最大宽度不超过 192px，最大高度不超过 192px；顶部至少留 32px，左右至少留 32px。
- **不要画地面阴影**：渲染器会单独画投影，图集再画会双重阴影。
- 不要做整体缩放或旋转；每帧保持同一比例、同一相机和同一轮廓线宽。
- 待机帧的脚底锚点必须完全不动；走路帧允许身体起伏，但最低点不能漂移超过 1–2px。

### 3.4 透明与导出

- PNG-32，sRGB，透明背景；四角 alpha 必须为 0。
- 不要有半透明底板、白色描边、地面、文字、边框、格子线或水印。
- 不要带额外角色、道具、粒子、速度线；攻击特效由游戏自己绘制。
- 线条、配色、阴影层次必须与参考图一致；同一角色跨帧不得变色或改变身体比例。
- 不要把三张现有 PNG 拉伸、补边或重采样成新帧；它们只作为角色设定的参考。

## 4. 精灵图排布

### 4.1 推荐：每个方向一条横向图集

每个方向一个文件，10 帧从左到右：

```text
┌────┬────┬────┬────┬────┬────┬────┬────┬────┬────┐
│ 0  │ 1  │ 2  │ 3  │ 4  │ 5  │ 6  │ 7  │ 8  │ 9  │
│idle│idle│idle│idle│walk│walk│walk│walk│walk│walk│
└────┴────┴────┴────┴────┴────┴────┴────┴────┴────┘
每格 256×256，整张 2560×256
```

- 列 `0–3`：待机 4 帧循环。
- 列 `4–9`：走路 6 帧循环。
- 帧顺序固定，不要调换 idle/walk 区段。
- 单条图集比 4×10 大图更容易让图片工具稳定输出，也更容易人工检查。

### 4.2 可选：四方向合并图集

如果工具能稳定输出 4 行，可合并为 `2560 × 1024`：

| 行 | 方向 |
| --- | --- |
| 0 | `down` |
| 1 | `up` |
| 2 | `left` |
| 3 | `right` |

列顺序与单条图集一致。**运行时推荐仍按方向拆成四张**，合并图集只作为打包/审阅用；若使用合并图集，必须用 manifest 明确 row/column，不能靠猜。

### 4.3 文件命名

推荐目录：

```text
public/chars/anim/
├── hachiware/
│   ├── down.png       # 2560×256
│   ├── up.png
│   ├── left.png
│   ├── right.png
│   └── manifest.json
├── chiikawa/
│   └── ...
└── usagi/
    └── ...
```

命名规则：

- 角色 ID 使用现有小写 ID：`hachiware`、`chiikawa`、`usagi`。
- 方向只用 `down`、`up`、`left`、`right`。
- 只用小写 ASCII、数字、连字符/下划线；不要中文、空格、括号、版本号。
- 现有 `public/chars/hachiware.png` 等静态文件**保持不变**，继续作为 UI 图标和回退图。
- 如果工具只能输出单独帧，可先命名 `down-00.png` … `down-09.png`，再用脚本拼接；最终接入仍使用上面的四张图集。

### 4.4 manifest 模板

```json
{
  "character": "hachiware",
  "cell": { "w": 256, "h": 256 },
  "anchor": { "x": 128, "y": 224 },
  "fps": { "idle": 6, "walk": 10 },
  "directions": {
    "down":  { "file": "down.png",  "idle": [0, 1, 2, 3], "walk": [4, 5, 6, 7, 8, 9] },
    "up":    { "file": "up.png",    "idle": [0, 1, 2, 3], "walk": [4, 5, 6, 7, 8, 9] },
    "left":  { "file": "left.png",  "idle": [0, 1, 2, 3], "walk": [4, 5, 6, 7, 8, 9] },
    "right": { "file": "right.png", "idle": [0, 1, 2, 3], "walk": [4, 5, 6, 7, 8, 9] }
  }
}
```

如果要支持每方向 2 帧待机，只需把 `idle` 改成 `[0, 1]`、walk 改成 `[2..7]`，但同一个角色的四个方向必须一致。

## 5. 给小八的生成提示词

第一轮只做小八，建议先用现有 `hachiware.png` 作为角色设定参考，**不要**把原图直接当帧使用。

### 5.1 单方向待机/走路条

```text
Use the attached Hachiware character reference. Create one horizontal
animation strip for a 2D top-down game, direction: DOWN (facing camera).

Exactly 10 frames in one row, each frame exactly 256x256 pixels.
Frames 0-3: idle breathing loop, feet planted, minimal movement.
Frames 4-9: 6-frame walk loop, small alternating steps, same body shape.

Keep the exact same character identity, proportions, line weight, colors,
ears, scarf and facial features in every frame. Full body, centered,
same scale, feet at the same baseline. Transparent background, no ground,
no shadow, no text, no border, no grid, no extra characters or props.
Do not crop any ear, tail or limb. No motion blur, no zoom, no rotation.
Flat 2D game asset, clean anti-aliased edges, sRGB PNG.
```

把 `DOWN` 分别替换为 `UP`、`LEFT`、`RIGHT`，生成四条；不要一次要求模型生成 40 帧。`up` 明确写“back view, no visible face”；`left` / `right` 明确写“profile view facing left/right”。

### 5.2 质量检查

- 每帧角色是否完整、是否同一比例？
- 脚底是否在同一水平线？
- 左/右是否真的朝对应方向，而不是镜像同一张？
- 待机是否只有呼吸/眨眼，没有位移？
- 走路 6 帧是否首尾能循环？
- 是否有背景、阴影、文字、边框、额外角色？
- 10 格之间是否有内容串格？

## 6. 代码接入步骤

以下为**后续**接入方案；当前代码不做动画切换，现有静态图继续工作。

### 6.1 数据层

`src/content/assets.js` 的 `char.*` 条目增加可选 `anim` 元数据：

```js
'char.hachiware': {
  kind: 'image',
  image: './chars/hachiware.png',
  anim: {
    dir: './chars/anim/hachiware',
    cell: 256,
    anchor: { x: 128, y: 224 },
    idleFrames: 4,
    walkFrames: 6,
    fps: { idle: 6, walk: 10 },
  },
  // ...
}
```

`anim` 缺失时永远走静态 PNG，不要求所有角色同时具备图集。

### 6.2 图片加载

`src/render/char-images.js`：

- 新增 `getCharSheet(baseUrl, direction)`，按 URL 缓存 `Image`，沿用现有 `onload` / `onerror` 通知。
- 新增预加载函数；`src/app/controller.js` 在预加载静态图时一并加载四方向图集。
- 单个方向加载失败时只回退该方向到静态正面图，不要整局黑屏。
- 微信小游戏继续使用 `wx.createImage()`；`drawImage` 的 source rect 在微信 Canvas 同样可用。

### 6.3 绘制层

`src/render/sprites.js` 的 `drawCharImage` 增加分支：

1. `opts.anim` 存在、方向图集已加载、帧索引有效 → 从 source rect 绘制当前帧。
2. 否则 → 现有静态 `sprite.image`。
3. 静态图也不可用 → 现有 `drawCritter` 程序化兜底。

推荐的 source rect 换算（cell=256、内容宽 192、脚底 224）：

```js
const scale = (size * 0.70) / 192;        // 保持当前屏上内容宽度
const dest = 256 * scale;
const footY = y + size * (16 / 44);        // 现有脚底基线
const sx = frame * 256;
ctx.drawImage(img, sx, 0, 256, 256,
  x - dest / 2,
  footY - 224 * scale,
  dest, dest);
```

`drawSpriteIcon` 继续不传 `opts.anim`，所以菜单/选角始终使用静态图，不会被战斗帧影响。

### 6.4 方向与帧状态

- `src/game/world.js`：玩家新增 `faceDir: 'down'`（纯展示状态，不参与战斗）。
- `src/game/systems/movement.js`：在 `p.moving` 更新后，按主导轴更新 `p.faceDir`：
  `abs(mx) > abs(my)` 取 left/right，否则取 up/down；死区沿用当前 `0.12`；停下时保留最后方向。
- `src/render/renderer.js`：`updatePlayerAnim` 增加独立 `animClock`，只在移动时累加；把 `{ state: p.moving ? 'walk' : 'idle', dir: p.faceDir, frame }` 传给 `drawSprite`。
- **不要改 `p.facing` 的战斗含义**：`weapons.js` 仍负责瞄准/朝向的 ±1 兼容值；四方向由 `faceDir` 单独驱动，避免影响自动攻击和受击判定。
- 走路帧节奏建议：`frame = floor(animClock * 10) % 6`；待机 `frame = floor(t * 6) % 4`。如果脚步有明显滑动，再改用“移动距离 / 步幅”驱动帧。
- 图集驱动后，关闭 `bob/sway/lean` 对图片的作用，避免“帧动画 + 整体摇晃”双重运动；静态回退仍保留原有 bob。

### 6.5 测试

- 单元：方向判定（上下左右、死区、斜向主导轴）、帧索引循环、图集缺失回退。
- E2E：进入战斗、四方向移动、静态图回退、切换角色、微信冒烟入口。
- 视觉：四方向各截 1 张，检查脚底锚点、左右方向、待机/走路首帧。
- 性能：40 帧图集按需绘制，不每帧创建 Image/Canvas。

## 7. 分阶段落地

1. **只做小八**：四条图集 + manifest，先不接代码，人工检查 40 帧。
2. **接入小八**：加 `anim` 元数据、加载器、绘制分支；静态 PNG 兜底保留。
3. **验证**：四方向、待机/走路、菜单/选角仍显示静态图；E2E 通过。
4. **扩展**：确认切分和锚点后，再做吉伊卡哇、乌萨奇的 40 帧。
5. **调优**：按实际移速调节 fps，检查脚底漂移和左右朝向。

在素材到位前，不要用程序化形状或重复静态图冒充四方向逐帧动画；当前版本的可玩性优先。
