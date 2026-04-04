---
name: 工作习惯 - 计划和文档
description: 做任何事都要先写计划放 plan 里，业务需求的文档和改动记录放 work 里
type: feedback
---

**核心规则：**

1. **做任何事都要有计划**
   - 计划文件放在 `src/brain/plan/YYYY-MM-DD-<主题>.md`
   - 先在 plan 里写好要做什么、分几步、怎么算完成
   - plan 状态要更新（draft → active → completed）

2. **业务需求文档放 work 里**
   - 需求文档放在 `src/projects/<项目名>/work/` 目录下
   - 记录需求说明、改动内容、决策原因
   - 做完后更新项目里的 claude.md

**为什么：** 用户明确要求的工作习惯，保持工作有条理、可追溯

**怎么用：** 
- 开始任何任务前，先问自己"plan 写了吗？"
- 做业务需求时，同步更新 work 里的文档
