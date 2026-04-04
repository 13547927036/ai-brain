# AI Config

## Session Init（读取规则）

**新会话启动时，按顺序读取：**

1. **必选**：`memory/claude.md` + `knowledge/claude.md`
2. **条件**：`notes/claude.md`（存在时）+ `memory/YYYY-MM-DD.md`（今日）
3. **条件**：`plan/claude.md`（存在时）+ 如有 `active` 状态的 plan
4. **条件**：`src/config/skills/claude.md`（技能索引）
5. **按需**：根据 INDEX Tags 读取 `knowledge/<topic>.md`

**Fallback**：文件不存在时输出警告，不阻塞会话

→ 完成后回复：`记忆系统已加载`

---

## claude.md 规则

进入目录时，**必须**先读取当前目录下对应 `claude.md`（即使是很简单的操作）：
**原则：先读 claude.md，再读写具体文件 — 没有例外，违反此规则 = 任务失败**

---

## 记忆系统（Memory Protocol）

**核心原则**：所有工作过程必须沉淀到记忆系统，不写 memory = 任务未完成

- **memory** (`YYYY-MM-DD.md`) — 每日日志，任务完成后立即写
- **notes** (`<topic>.md`) — 深度分析，跨日讨论/多文件排查/方案对比
- **knowledge** (`<topic>.md`) — 稳定结论，已验证 + 会复用
- **plan** (`<topic>.md`) — 执行指南，复杂任务先 plan 再执行
- **claude.md** — 核心规则，每次必用

**memory 要求**：50-100 行，包含 Done/Reflection/User Insights

---

## 目录结构

```
src/
├── brain/        # 记忆系统（memory, knowledge, notes, plan）
├── projects/     # 业务项目（代码 + 工作文档）- 与 brain 平级
├── config/       # 静态配置（settings.json, skills/）
└── temp/         # 临时区（按日期分目录）
```

---

## Checkpoint

用户输入 "checkpoint" 或工作结束时，使用 `checkpoint` skill 执行。


---

## plan Rule

**需要 plan 的场景**（满足任一即触发）：
- 多步骤任务（>3 步）
- 涉及多模块修改或新文件创建
- 用户明确要求先 plan 再执行
- 任务复杂度需要拆解

**plan 流程**：
1. 使用 `superpowers:writing-plans` skill 创建 plan
2. plan 文件位于 `src/brain/plan/YYYY-MM-DD-<topic>.md`
3. 使用 `superpowers:executing-plans` skill 执行 plan
4. Checkpoint 时检查 active plan 状态，完成后更新为 `completed`
