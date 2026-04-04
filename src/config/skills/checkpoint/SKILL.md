---
name: checkpoint
description: 每日工作结束时的检查点流程 — 写 memory、更新 Index、提交
---

# Checkpoint

**触发条件：** 用户输入 "checkpoint" 或工作 session 结束时

**原则：** 不写 Memory = 任务未完成，不可提交

---

## 流程（严格按顺序）

### 1. 读取 Index

先读取以下文件确认各目录格式及 active Plan：

- `src/brain/memory/claude.md`
- `src/brain/knowledge/claude.md`
- `src/brain/notes/claude.md`
- `src/brain/plan/claude.md`

### 2. 沉淀内容（按分支处理）


| 内容类型 | 目标位置 | 说明 |
|----------|----------|------|
| 每日日志 | `memory/YYYY-MM-DD.md` | Done / Reflection / User Insights |
| 反复犯错的禁令 | `src/brain/claude.md` | 更新「强化规则」章节 |
| 单次错误分析/探索过程/未确定的方案 | `notes/<topic>.md` | 临时分析，单文件 |
| 已验证的方法论/可复用的结论 | `knowledge/<topic>.md` | 可复用的稳定知识 |
| 用户偏好/行为规则 | `knowledge/user-preferences.md` 或强化规则 | 用户明确的偏好 |
| Plan 进度 | `plan/YYYY-MM-DD-topic.md` | 状态流转或 checklist 进度 |


### 2. 沉淀内容（按分支处理）


| 内容类型 | 目标位置 | 说明 |
|----------|----------|------|
| 每日日志 | `memory/YYYY-MM-DD.md` | Done / Reflection / User Insights |
| 反复犯错的禁令 | `src/brain/claude.md` | 更新「强化规则」章节 |
| 单次错误分析/探索过程/未确定的方案 | `notes/<topic>.md` | 临时分析，单文件 |
| 已验证的方法论/可复用的结论 | `knowledge/<topic>.md` | 可复用的稳定知识 |
| 用户偏好/行为规则 | `knowledge/user-preferences.md` 或强化规则 | 用户明确的偏好 |
| Plan 进度 | `plan/YYYY-MM-DD-topic.md` | 状态流转或 checklist 进度 |


**Checkpoint 检查清单**（执行前逐项确认，**必须主动检查**）：

**第一步：回顾对话，识别可沉淀内容**
- [ ] 用户是否纠正过你的行为？（如"不对"、"错了"、"不是这样"）→ 错误分析 → notes 或 knowledge
- [ ] 用户是否表达过偏好？（如"不要"、"应该"、"直接"、"别"）→ 偏好 → user-preferences.md
- [ ] 用户是否重复过同样的要求？（同一件事说第 2 次）→ 强化规则 → claude.md
- [ ] 用户是否删除过你的代码/文档？ → 删除原因 → 清理意识 → user-preferences.md
- [ ] 是否有可复用的结论？→ knowledge

**第二步：检查已有文件，确认是否需要更新**
- [ ] 读取 `knowledge/user-preferences.md` — 本轮对话的偏好是否已记录？
- [ ] 读取 `src/brain/claude.md` 强化规则 — 是否有反复违反的规则需要升级？
- [ ] 读取 `knowledge/` 目录 — 是否有新主题需要创建？

**第三步：写 Memory**
- **Done:** 完成的工作清单
- **Reflection:** 学习到的经验、模式、洞察
- **User Insights:** 用户偏好、反馈、纠正（**即使已写入 knowledge，也要在这里记录**）

**Memory 要求（50-100 行）：**

### 3. 更新 Index

如有新增文件或状态变更，更新对应的 Index：

- `memory/claude.md` — 添加今日 memory 摘要
- `knowledge/claude.md` — 添加新知识条目
- `notes/claude.md` — 添加新 notes 条目
- `plan/claude.md` — 添加新 plan 或状态变更

### 4. AI 执行提交

分析 `git diff`，写有意义的提交信息：

**提交前缀规范：**
- Checkpoint 提交：`cp-<type>:`（如 `cp-fix:`、`cp-feat:`、`cp-refactor:`、`cp-chore:`）
- 常规提交：`<type>:`（如 `fix:`、`feat:`、`refactor:`、`chore:`）

**执行：**
```bash
git add <changed files>
git commit -m "<prefix>: <message based on reflection>"
git push
```

---

## 输出

完成后报告：
- Memory 写入位置：`src/brain/memory/YYYY-MM-DD.md`
- Index 更新：列出哪些 Index 被更新
- 提交：显示 commit hash 和 message
