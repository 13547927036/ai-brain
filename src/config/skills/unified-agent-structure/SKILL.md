---
name: unified-agent-structure
description: 统一多 Agent 目录架构 - 在任意项目中自动创建并维护 .agents 作为唯一源，为 Cursor/Claude Code/Codex 创建软链接。当用户提到"设置 Agent 目录"、"统一 rules/skills"、"多 Agent 配置"或在新项目中开始时自动触发。
---

## 核心目标

在**任意项目**中快速设置统一的 rules/skills 目录结构，让多个 Agent 共用同一套配置，只需维护一份文件。

**架构原理**：

```
.agents/               # 唯一源 - 所有配置放在这里
├── rules/
├── skills/
└── commands/

其他 Agent 目录通过软链接指向 .agents：
.cursor/  -> .agents/
.claude/  -> .agents/
.codex/   -> .agents/
```

## 触发时机

当用户请求以下任一操作时触发：

- "设置统一 Agent 目录"
- "配置多 Agent 共享 rules/skills"
- "在项目中使用 Cursor 和 Claude Code 共用配置"
- "初始化新项目的 Agent 配置"
- 检测到项目中有多个 Agent 目录但配置不一致

## 支持的 Agent 类型

**默认启用**（自动创建软链接）：

| Agent       | 目录名    |
| ----------- | --------- |
| Cursor      | `.cursor` |
| Claude Code | `.claude` |
| Codex       | `.codex`  |

**扩展支持**（可选启用）：

| Agent      | 目录名      |
| ---------- | ----------- |
| OpenCode   | `.opencode` |
| Gemini CLI | `.agent`    |
| Trae       | `.trae`     |

## 执行流程

### 1. 确认项目根目录

首先确认当前所在目录是否为项目根目录（包含 `package.json` 或 `.git` 目录）。

如果不是，提示用户切换到项目根目录。

### 2. 检查现有结构

检查以下内容：

- `.agents/` 目录是否存在
- 各 Agent 目录（`.cursor/`, `.claude/`, `.codex/`）是否存在
- 现有的 rules/skills/commands 目录内容

### 3. 执行设置

运行设置脚本（推荐）或手动执行以下步骤：

**推荐方式：运行设置脚本**

```bash
# 使用技能自带的脚本
~/.claude/skills/unified-agent-structure/scripts/setup.sh
```

**手动方式：分步执行**

如果不想使用脚本，可以手动执行以下命令：

**步骤 3.1：创建 .agents 目录**

```bash
mkdir -p .agents/rules .agents/skills .agents/commands
```

**步骤 3.2：迁移现有配置（如果有）**

如果 Agent 目录中已有 rules/skills/commands 且不是软链接，将其复制到 `.agents/` 后删除原目录。

**注意**：不会创建 `.backup` 备份目录，原有文件在复制后直接删除。如需要备份，请提前手动备份。

**步骤 3.3：创建软链接**

为每个 Agent 创建 rules、skills、commands 的软链接：

```bash
# 为 .cursor 创建软链接
ln -s ../.agents/rules .cursor/rules
ln -s ../.agents/skills .cursor/skills
ln -s ../.agents/commands .cursor/commands

# 为 .claude 创建软链接
ln -s ../.agents/rules .claude/rules
ln -s ../.agents/skills .claude/skills
ln -s ../.agents/commands .claude/commands

# 为 .codex 创建软链接
ln -s ../.agents/rules .codex/rules
ln -s ../.agents/skills .codex/skills
ln -s ../.agents/commands .codex/commands
```

### 4. 验证并报告

完成后输出：

```
✅ .agents 目录结构已就绪
✅ 已为以下 Agent 创建软链接：Cursor, Claude Code, Codex
```

## 扩展新 Agent

要添加新的 Agent 支持，只需在项目目录运行：

```bash
ln -s ../.agents/rules .opencode/rules
ln -s ../.agents/skills .opencode/skills
```

## 注意事项

1. **不要直接在 Agent 目录下创建文件** - 所有新的 rules/skills/commands 都应该创建在 `.agents/` 下
2. **软链接是本地配置** - 不应该提交到 Git，建议在 `.gitignore` 中添加：
   ```gitignore
   # 软链接目录（指向 .agents）
   .cursor/rules
   .cursor/skills
   .cursor/commands
   .claude/rules
   .claude/skills
   .claude/commands
   .codex/rules
   .codex/skills
   .codex/commands
   ```
3. **不会创建备份** - 迁移时原有文件复制后直接删除，如需备份请提前手动备份

## 故障排查

### 问题：某个 Agent 无法读取 rules/skills

1. 检查软链接是否正确：`ls -la .cursor/` 应该显示 `rules -> ../.agents/rules`
2. 检查 `.agents/` 目录是否有正确的文件
3. 重新执行步骤 3 创建软链接

### 问题：Git 显示软链接为修改

这是正常的，因为软链接是本地配置。在 `.gitignore` 中忽略它们。

## 快速设置命令

一键设置所有 Agent（推荐）：

```bash
# 使用技能自带的脚本
~/.claude/skills/unified-agent-structure/scripts/setup.sh
```

脚本功能：
- 自动创建 `.agents/rules`、`.agents/skills`、`.agents/commands` 目录
- 迁移现有配置（如有）到 `.agents/`
- 为 `.cursor`、`.claude`、`.codex` 创建软链接
- 自动检测已存在的软链接，避免重复创建
