# Skills Index

| Skill | Summary | Tags |
|-------|---------|------|
| checkpoint/ | Checkpoint 流程 — 写 memory、更新 Index、提交 | checkpoint, memory, workflow |
| project-work/ | 业务需求处理 - 读取需求、解析文档、创建计划、积累经验 | requirements, workflow, project |
| feishu-docs/ | 飞书文档操作服务（MCP 读写） | feishu, docs, mcp |
| codex-cr-review/ | GitLab MR 代码评审 | gitlab, code-review |
| docx/ | Word 文档读写 | docx, word |
| frontend-design/ | 前端 UI 设计 | frontend, ui, design |
| geb-fractal-docs/ | GEB 分形文档系统 | geb, documentation |
| imoo-browser/ | 浏览器自动化控制 | browser, automation |
| playwright-skill/ | Playwright 浏览器自动化测试 | playwright, testing |
| skill-creator/ | 技能创建与管理 | skills, meta |
| project-link/ | 项目软链接管理（添加/移除/更新） | projects, links |
| ui-ux-pro-max/ | UI/UX 设计智能 | ui, ux, design |
| unified-agent-structure/ | 统一多 Agent 目录架构 | agents, structure |
| superpowers/ | Superpowers 技能集（14 个） | superpowers, workflow |

---
**说明：**
- Skills 是 Claude 技能的本地实现
- 每个 skill 是一个目录，包含 `SKILL.md` 文件
- 目录命名使用 `kebab-case`
- 新增 skill 时需更新本索引

**目录结构：**
```
config/skills/<skill-name>/
└── SKILL.md   # skill 定义（前matter + 内容）
```

**SKILL.md 格式：**
```markdown
---
name: <skill-name>
description: <一句话描述>
---

# <Title>

<skill 详细说明>
```
