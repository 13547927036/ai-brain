# M0 渲染基准实测结果

- 日期：2026-10-22
- 环境：Windows 桌面 Chrome 155（非移动端，见「局限」）
- 负载：500 精灵，图集 2×2，逻辑分辨率 750×1334
- 方式：预热 60 帧 + 测量 600 帧，种子 20261022

## 数据

| 后端 | 平均 FPS | 平均帧时(ms) | p95 帧时(ms) | drawcall |
|---|---|---|---|---|
| Canvas 2D | 564.5 | 1.772 | 8.6 | 不适用（每精灵一次 drawImage） |
| WebGL | 10619.5 | 0.094 | 0.2 | 1（500 精灵合批） |

Canvas2D 三次独立运行：576.9 / 586.3 / 564.5 fps，量级稳定。

## 决策：选 WebGL

1. **drawcall 是决定性的**：WebGL 把 500 精灵合批成 1 次 drawcall，Canvas2D 是 500 次。spec 4.6 的性能预算是 drawcall < 30，Canvas2D 从一开始就超标。
2. **吞吐差 19 倍**。桌面两者都远超 60fps，余量是留给移动端的：按低端 Android 衰减 20 倍估算，Canvas2D 掉到约 28fps（低于 60fps 验收线），WebGL 仍有充裕余量。
3. 微信小游戏对 iOS14+ 的 drawcall 共享缓冲区问题有专门说明，drawcall 在目标平台是真实约束。

## 顺带修掉一个真实 bug

首轮结果是「WebGL: 不可用（无法获取 webgl 上下文）」。原因：两个后端**复用同一个 canvas** —— 一旦调用过 `getContext('2d')`，再调 `getContext('webgl')` 会返回 `null`。已改为每个后端独立 canvas（`src/render/bench.ts`）。**静态类型检查与单元测试都发现不了这个错误，只有真跑浏览器才会暴露。**

## 局限（必须知道）

1. 数据来自桌面 Chrome，**绝对帧率必须在真机 / 微信开发者工具复测**，尤其低端 Android。
2. 负载偏轻：无飘字、粒子、UI、音频。M1 完整负载约 620 精灵量级，需重测。
3. 未测 iOS。
4. WebGL 的 1 个 drawcall 依赖「所有精灵共享一张图集」。**后续贴图必须图集化**，否则 drawcall 随图集数上升 —— 这是 M1 渲染层的硬约束。

## 复现

    npm install && npm run build && npm run serve
    # 打开 http://127.0.0.1:5180/
