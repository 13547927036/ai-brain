# plan Index

| File | Summary | Status | Created | Tags |
|------|---------|--------|---------|------|
| 2026-04-04-snake-game.md | 贪吃蛇小游戏开发 | active | 2026-04-04 | game, frontend |

---
**说明：**
- plan 是"向前看"的执行指南 — 要做什么、分几步、怎么算完成
- 绝大部分任务都应该先 plan 再执行
- plan 执行完成后，结论流入 knowledge/memory，plan 本身归档保留

**命名规范：**
- 格式：`YYYY-MM-DD-topic.md`（如 `2026-04-01-rename-index-to-claude.md`）
- 与 memory 区分：memory 是 `YYYY-MM-DD.md`（每日唯一），plan 一日可多篇

**状态流转：**
```
draft → active → completed → archived
              ↓
         (结论流入 knowledge)
```

**与 notes 的区别：**
| notes | plan |
|-------|------|
| 向后看：记录已发生的分析/推导 | 向前看：指导未来执行 |
| Bug 排查过程、方案对比推导 | 任务拆解、步骤清单、验收标准 |
| 草稿性质，可能没有明确终点 | 目标明确，有完成状态 |

---
**依托技能：**
使用 Superpowers 的 `writing-plans` 技能创建 plan，`executing-plans` 或 `subagent-driven-development` 执行。

**plan 触发条件：**
- 预计工作量 >30 分钟 或 >3 个步骤
- 涉及新文件创建或多模块修改
- 用户明确要求先 plan 再执行

**Session Init 加载：**
- 启动时读取 `claude.md`
- 如有 `active` 状态的 plan，读取当前正在执行的 plan

**Checkpoint 检查：**
- Checkpoint 时自动检测 active plan 并输出进度
- 所有任务完成后，更新 `claude.md` 状态为 `completed`

---
**plan 文件位置：** `/Users/imoo/work/data/project/ai-config/src/brain/plan/`
