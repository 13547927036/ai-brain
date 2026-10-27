# 哈奇猫：小八四方向动画素材规范与接入方案

> 状态：**阶段 A，接入准备**。本文不包含真实逐帧素材，也不代表动画已经完成。
> 当前线上版本继续使用 `public/chars/*.png` 静态立绘 + 整体起伏，游戏可正常游玩。

## 1. 环境与能力边界

- 当前 DS 工具环境没有可用的图像生成模型/图像输出工具，**不能直接生成高质量角色位图**。
- 本轮只做项目审计、名称核对、素材规范和接入方案；不伪造帧、不用程序化图形冒充逐帧动画。
- 用户提供的「小八四方向图」只作为方向分组和帧数参考，**不是正式游戏素材**，不会切进游戏。

## 2. 现有角色 PNG 审计

三张图片都是 RGBA、透明背景、四角 alpha 为 0，但都是**按内容裁切**的导出，不是统一画布：

| 文件 | 像素尺寸 | 全透明像素 | 不透明像素 | 内容边界 | 体积 |
| --- | --- | --- | --- | --- | --- |
| `public/chars/hachiware.png` | 185 × 121 | 19.0% | 74.8% | 四边贴合内容 | 27.2 KB |
| `public/chars/chiikawa.png` | 192 × 116 | 16.0% | 77.9% | 四边贴合内容 | 24.9 KB |
| `public/chars/usagi.png` | 187 × 168 | 38.2% | 56.5% | 四边贴合内容 | 35.1 KB |

小八原图的关键特征（生成时必须保留）：

- 蓝白配色，蓝色头顶/帽状色块，白色身体。
- 黑色手绘轮廓，圆润头身，短小四肢。
- 黑色大眼睛、粉色腮红、小嘴。
- 原图是正面/趴卧姿态，宽高比约 `185:121 ≈ 1.53:1`。
- 原图取色参考（仅用于核对，不要重绘成另一套颜色）：
  - 身体：约 `#FBFAFA`
  - 轮廓：约 `#0D0E10`
  - 蓝色头部：约 `#88A4B8`
  - 腮红：约 `#CBADB3` / `#DEBCC3`

注意：

- 三张图都是**正面视角**，没有背面、侧面或行走帧。
- 图片主体触及导出边缘，没有统一留白；不能直接在原图上补边或拉伸成新帧。
- 三张原图只作为角色外观的**唯一主要参考**，不能直接把示意图、AI 说明图或占位图当素材。

## 3. 当前渲染与动画实现

### 3.1 渲染方式

- 游戏使用 **Canvas 2D**，不是 DOM/CSS 精灵动画。
- 战斗绘制链路：
  `src/render/renderer.js` → `drawSprite()` → `src/render/sprites.js` → `drawCharImage()`。
- 角色图片加载：
  `src/render/char-images.js` 的 `getCharImage()`，按 URL 缓存一个 `Image`。
- 首页/选角：
  `src/ui/SpriteIcon.jsx` → `drawSpriteIcon()`，使用同一套 `drawSprite()` 静态绘制。
- 微信小游戏：
  - 战斗与渲染共用 `renderer/sprites`；
  - 微信菜单是 `src/wechat/main.js` 的独立 Canvas 文案，不共用 React 首页；
  - `char-images.js` 在没有 `Image` 时使用 `wx.createImage()`，失败则回退程序化小动物。

### 3.2 现有动画

`src/render/renderer.js` 的 `playAnim` 只做整体姿态：

- `bob`：上下起伏
- `sway`：左右摆动
- `tilt`：轻微倾斜
- `lean`：前后倾

`updatePlayerAnim()` 使用世界时间推进相位，移动时加快；这些效果不会改变碰撞、速度或攻击。

### 3.3 现有缺口

- `src/game/world.js` 只有 `facing: 1`（±1）。
- `src/game/systems/weapons.js` 按瞄准/移动设置左右符号。
- `drawCharImage()` **完全忽略 `facing`**，始终画同一张正面图。
- 没有 `idle` / `walk` 状态，没有帧索引、帧计时器或精灵图切帧。
- 没有图集缓存；`char-images.js` 只能加载整张静态图。
- 没有脚底锚点元数据；当前靠固定常量 `IMAGE_CONTENT_W = 192`、`IMAGE_FOOT_RATIO = 16/44` 近似对齐。

**结论：当前渲染逻辑不支持根据移动方向切换动画。**

### 3.4 与战斗系统的耦合

- 角色碰撞使用 `PLAYER_RADIUS`，与图片像素尺寸无关。
- 移动速度来自 `p.stats.speed`，与图片无关。
- 武器瞄准、自动攻击、敌人 AI、受击判定都不读取角色图片尺寸。
- 角色的显示尺寸固定为战斗 `size: 46`；新动画必须保持相同的屏上内容宽度和脚底基线，否则会视觉跳变。
- 因此可以安全地增加“纯展示层”的动画，不需要改战斗数值或碰撞。

## 4. 用户提供的排布示意图审查

提供的示意图为 `1536 × 1024` RGBA：

- 四角 alpha 为 0，背景大部分透明；全透明像素约 66.7%。
- 画面包含 4 行方向标签（向上/向下/向左/向右）、待机/行走说明卡、帧数文字和角色帧。
- 每行是 4 帧待机 + 6 帧走路的排布，适合用来确认**方向分组和帧数**。
- 但角色帧宽度约 90–101px，帧间距不一致，部分帧相邻/粘连；图中还有标签和说明卡，**没有统一 cell，不能自动切分**。
- 图中角色与现有 `hachiware.png` 的细节也有差异（耳朵、脸型、线条和配色不完全一致）。

结论：

- 只采用它的“4 行 × 4 idle + 6 walk”组织方式。
- 不把它整体放入游戏，不切它的文字/说明栏/背景/棋盘格。
- 不把它作为生成模型的风格参考；生成时只附现有 `hachiware.png`。

## 5. 小八正式素材规范

### 5.1 方向

| 方向 | 文件前缀 | 要求 |
| --- | --- | --- |
| 向上 | `up` | 背面；不画正脸，保留蓝色头顶、耳朵、身体轮廓 |
| 向下 | `down` | 正面；保留现有五官、腮红和表情 |
| 向左 | `left` | 左侧面；脸朝画面左 |
| 向右 | `right` | 右侧面；脸朝画面右 |

左右必须独立绘制，**不要镜像同一张**。镜像会让耳朵、蓝色头块、腮红和身体轮廓方向错误；只有在某方向素材临时缺失时，才允许作为降级。

### 5.2 帧数

每个方向：

- 待机：**4 帧**（最低 2 帧；推荐 4 帧）
- 走路：**6 帧**（固定 6 帧，首尾可循环）

小八合计 `4 × (4 + 6) = 40 帧`。第一版不要增加帧数；先验证动作和锚点。

### 5.3 单帧画布与锚点

推荐：

```text
cell:        256 × 256 px
content max: 192 × 192 px
foot anchor: (128, 224)
safe area:   x = 32..224, y = 32..224
```

理由：

- 小八原图 `185×121`，按内容宽 192 放入 256 cell，约等于原图 1.04 倍，不强行拉伸。
- 当前战斗内容宽约 `46 × 0.70 = 32.2 CSS px`；128/192 cell 也能用，但首页主视觉需要约 101 CSS px 内容宽，256 cell 在 DPR2 下仍有足够清晰度。
- 若未来需要 DPR3 或更大首页展示，可整体升级为 384 cell / 288 content；不要只放大某一帧。

要求：

- 每帧完整落在 256×256 内，不跨帧裁切。
- 角色水平中心对齐 `x = 128`。
- 最低不透明点（脚底/身体底部）对齐 `y = 224`。
- 角色最大宽高不超过 192px；左右至少留 32px，顶部至少留 32px，底部留 32px。
- 待机帧脚底完全不动；走路帧允许身体起伏，但最低点漂移不超过 1–2px。
- 不画地面阴影：渲染器已单独画投影，图集再画会双重阴影。
- 不做整体缩放、旋转或透视变化；四方向保持同一相机和比例。

### 5.4 透明与导出

- PNG-32，sRGB，透明背景；四角 alpha 必须为 0。
- 不要有白色/棋盘格底板、半透明底、文字、标签、边框、网格、水印。
- 不要有地面、场景、额外角色、道具、粒子、速度线。
- 不要用白色背景冒充透明；导出后用工具检查 alpha。
- 线条、配色、阴影层次必须来自现有小八原图；同一动作跨帧不得变色、变胖/变瘦或改变五官位置。

## 6. 文件命名、排布与目录

### 6.1 推荐目录

沿用现有角色资源目录，在 `public/chars/` 下建立独立动画目录：

```text
public/chars/anim/
├── hachiware_up_idle.png
├── hachiware_up_walk.png
├── hachiware_down_idle.png
├── hachiware_down_walk.png
├── hachiware_left_idle.png
├── hachiware_left_walk.png
├── hachiware_right_idle.png
├── hachiware_right_walk.png
├── chiikawa_*.png
└── usagi_*.png
```

- 现有 `public/chars/hachiware.png` 等静态文件保持不变，继续作为 UI 图标和失败回退。
- 不为每个角色重复建多层目录；文件名已经带角色前缀，扁平目录更易维护。
- 第一轮只放小八 8 个文件，其他角色不要提前放未验证图片。

### 6.2 每条图的尺寸

| 文件 | 帧数 | 单帧 | 整张 |
| --- | --- | --- | --- |
| `hachiware_*_idle.png` | 4 | 256×256 | **1024×256** |
| `hachiware_*_walk.png` | 6 | 256×256 | **1536×256** |

如果待机采用 2 帧，idle 图为 `512×256`；但同一角色的四个方向必须一致，不能一个方向 2 帧、另一个 4 帧。

排布：

```text
idle:  [idle 0][idle 1][idle 2][idle 3]       1024×256
walk:  [walk 0][walk 1][walk 2][walk 3][walk 4][walk 5]   1536×256
```

- 从左到右，帧顺序固定。
- 每帧严格 256 宽，不能靠不等间距“手动摆放”。
- 不要在一个文件里混放 idle 和 walk；一个文件只放一个动作。

### 6.3 配置建议

推荐把配置写在 `src/content/assets.js` 的 `char.*` 中，不额外依赖运行时 JSON：

```js
'char.hachiware': {
  kind: 'image',
  image: './chars/hachiware.png',
  anim: {
    base: './chars/anim',
    prefix: 'hachiware',
    cell: 256,
    anchor: { x: 128, y: 224 },
    frames: { idle: 4, walk: 6 },
    fps: { idle: 6, walk: 10 },
  },
  // ...
}
```

如果外部交付需要清单，可另附 `manifest.json` 作为验收资料，但运行时不必读取它；以代码内明确配置为准，避免靠猜切图。

## 7. 外部 AI 图片工具制作说明

### 7.1 参考图

只附：

- `public/chars/hachiware.png`：角色外观、比例、配色、线条的唯一主要参考。

不要附：

- 四方向排布示意图（会带入标签、说明卡、错误间距和不同画风）。
- 其他角色图（会被模型混入其他特征）。

### 7.2 生成顺序

优先按“方向 + 动作”逐一生成，不要一次要求 40 帧：

1. `down` 待机 4 帧
2. `down` 走路 6 帧
3. `left` 待机 4 帧
4. `left` 走路 6 帧
5. `right` 待机 4 帧
6. `right` 走路 6 帧
7. `up` 待机 4 帧
8. `up` 走路 6 帧

如果工具单次无法稳定输出 4/6 帧：

- 先生成关键帧：待机 0/2，走路 0/2/4；
- 再生成中间帧 1/3（待机）或 1/3/5（走路）；
- 每帧按同一锚点重新对齐，不能直接复制粘贴关键帧后只改手脚。

### 7.3 提示词模板

待机 4 帧（把 `down` 替换为其他方向）：

```text
Use the attached Hachiware character reference as the ONLY appearance reference.
Create a horizontal idle animation strip for a 2D top-down game.

Direction: DOWN, facing the camera.
Exactly 4 frames in one row, each frame exactly 256x256 pixels.
Canvas: 1024x256, transparent background.

Frames 0-3: subtle breathing loop, feet planted, no walking, no position drift.
Keep exactly the same character identity, body proportions, blue head mark,
white body, black hand-drawn outline, eyes, blush and mouth in every frame.

Full body, centered, same scale, lowest point on the same baseline.
No text, no labels, no border, no grid, no background, no ground, no shadow,
no extra characters, no props, no watermark. Do not crop ears or limbs.
No zoom, no rotation, no perspective change, no motion blur.
Flat 2D game asset, clean anti-aliased edges, sRGB PNG.
```

走路 6 帧：

```text
Use the attached Hachiware character reference as the ONLY appearance reference.
Create a horizontal walk animation strip for a 2D top-down game.

Direction: DOWN, facing the camera.
Exactly 6 frames in one row, each frame exactly 256x256 pixels.
Canvas: 1536x256, transparent background.

Frames 0-5: continuous walk cycle, small alternating steps, first and last frame
must connect into a loop. Keep the same body shape and face in every frame.

Full body, centered, same scale, lowest point on the same baseline.
No text, no labels, no border, no grid, no background, no ground, no shadow,
no extra characters, no props, no watermark. Do not crop ears or limbs.
No zoom, no rotation, no perspective change, no motion blur.
Flat 2D game asset, clean anti-aliased edges, sRGB PNG.
```

方向替换规则：

- `UP`：`back view, no visible face, no eyes or mouth`；保留蓝色头顶和耳朵。
- `LEFT`：`left profile view, face and nose point to the left`。
- `RIGHT`：`right profile view, face and nose point to the right`；不要镜像左图。

### 7.4 负面提示词

```text
text, letters, numbers, labels, UI cards, frame numbers, borders, grid,
white background, checkerboard background, ground, shadow, scenery,
extra characters, props, watermark, logo, cropped ears, cropped tail,
different colors, redesigned character, 3D render, perspective, rotation,
motion blur, blurry edges, inconsistent proportions
```

### 7.5 验收标准

每个方向、每个动作逐项检查：

- [ ] 文件尺寸严格为 `1024×256`（idle 4 帧）或 `1536×256`（walk 6 帧）。
- [ ] 每格 256×256，帧从左到右完整，不串格。
- [ ] 四角 alpha=0，背景真正透明，没有白底/棋盘格。
- [ ] 没有文字、标签、说明卡、边框、网格、水印。
- [ ] 小八的蓝白配色、黑线、五官、腮红、身体比例与现图一致。
- [ ] 四方向可辨认；`up` 无正脸，`left/right` 朝向正确且非镜像。
- [ ] 脚底最低点在每帧 `y=224` 附近，水平中心 `x=128`；漂移 ≤2px。
- [ ] 待机 4 帧只有呼吸/轻微晃动，没有位移。
- [ ] 走路 6 帧首尾可循环，没有突然变形或五官漂移。
- [ ] 没有阴影；渲染器会单独画投影。
- [ ] 在 32px 战斗尺寸和 101px 首页尺寸下检查清晰度。

## 8. 代码接入方案（后续阶段）

以下代码**本轮不修改**；等真实素材到位后再实施。

### 8.1 数据层

`src/content/assets.js` 的 `char.*` 增加第 6.3 节的 `anim` 配置。

### 8.2 加载层

`src/render/char-images.js`：

- 新增 `getCharSheet(url)`，按 URL 缓存 `Image`，沿用现有 `onload` / `onerror` 通知。
- 新增预加载函数；`src/app/controller.js` 只在 `sprite.anim` 存在时加载 8 张图。
- 单张失败只影响该方向/动作，回退静态正面图；不能整局黑屏。

### 8.3 绘制层

`src/render/sprites.js` 的 `drawCharImage()`：

1. 有 `opts.anim`，对应图集已加载，帧索引有效 → 画当前帧。
2. 否则 → 现有静态 `sprite.image`。
3. 静态图也不可用 → 现有 `drawCritter()` 程序化回退。

source rect 换算（cell=256、内容宽 192、脚底 224）：

```js
const scale = (size * 0.70) / 192;         // 保持当前屏上内容宽度
const cell = 256 * scale;
const footY = y + size * (16 / 44);         // 现有脚底基线
const sx = frame * 256;
ctx.drawImage(img, sx, 0, 256, 256,
  x - cell / 2,
  footY - 224 * scale,
  cell, cell);
```

`drawSpriteIcon()` 不传 `anim`，首页/选角继续显示静态图。

### 8.4 方向与帧状态

- `src/game/world.js`：玩家新增 `faceDir: 'down'`（纯展示，不参与战斗）。
- `src/game/systems/movement.js`：`p.moving` 更新后按主导轴设置 `faceDir`：
  - `|mx| - |my| > 0.15` → `left` / `right`
  - `|my| - |mx| > 0.15` → `up` / `down`
  - 差值在 ±0.15 内保持上一方向，避免斜向抖动
  - 停止时保留最后方向
- `src/render/renderer.js`：
  - 增加独立 `animClock`，只在移动时按 `fps.walk` 累加，静止时按 `fps.idle`；
  - 传给 `drawSprite` 的 `anim` 包含 `{ state, dir, frame }`；
  - 图集驱动后关闭 `bob/sway/lean` 对图片的作用，避免双重运动；静态回退保留 bob。
- **不要改 `p.facing` 的战斗含义**：`weapons.js` 继续负责瞄准/朝向的 ±1 兼容值；四方向由 `faceDir` 单独驱动，避免影响自动攻击和受击判定。
- 移动速度不因动画改变；需要调节播放频率时只改帧计时。

### 8.5 测试

- 单元：方向判定（四方向、死区、斜向）、帧索引循环、图集缺失回退。
- E2E：四方向移动、待机/走路切换、切换角色、暂停/结算、360×640、微信冒烟。
- 视觉：四方向各截待机/走路帧，检查锚点、朝向和首尾循环。
- 性能：8 张图按需加载，不每帧创建 Image/Canvas。

## 9. 分阶段

- **阶段 A（本轮）**：审计、名称核对、规范、外部生成说明。无真实素材，不接动画。
- **阶段 B**：拿到小八 8 张真实 PNG 后，只接小八，保留其他角色静态表现；先修素材再调代码。
- **阶段 C**：小八验收后，按同一配置接入吉伊卡哇、乌萨奇；每个角色独立生成，不套用小八帧。
- **阶段 D**：完整回归；确认移动/攻击/碰撞/暂停/结算/微信构建。

在真实 PNG 到位前，不用程序化形状、重复静态图或示意图切片冒充四方向动画。
