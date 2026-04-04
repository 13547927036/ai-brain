# knowledge Index

| File | Summary | Source | Tags |
|------|---------|--------|------|
| user-preference.md | 用户沟通偏好 - 大白话、少术语 | 2026-04-04 用户反馈 | user, communication |
| memory-habit.md | memory 使用习惯 - 只放每日日记 | 2026-04-04 学习 | memory, workflow |
| work-habit.md | 工作习惯 - 计划放 plan、文档放 work | 2026-04-04 用户要求 | workflow, plan, documentation |

---
**说明：**
- knowledge 是从 memory/代码/对话中提炼的稳定结论
- Agent 启动时只加载 index.md
- 需要某个主题时，按 Tags 匹配到对应文件再读取
- knowledge 可以上下流动：
  - 往上：毕业到 claude.md（核心规则）
  - 往下：退回 knowledge（按需加载，省 token）

**流动机制：**

| 流向 | 触发条件 | 判断标准 | 执行时机 |
|------|----------|----------|----------|
| → claude.md | memory/notes 中同一主题出现 ≥3 次 | 跨日复用 + 用户确认 + 影响全局 | checkpoint 时检测 |
| → knowledge | memory 中的稳定结论 | 被后续任务引用 ≥2 次 | 写 memory 时判断 |
| 归档 | 过时的 knowledge | 超过 30 天无引用 | 定期清理 |

**Checkpoint 自动检测：**
- 脚本检测 memory 中是否有"应流动"内容（标签匹配 + 引用频次）
- 输出提示由 AI 决定是否流动
