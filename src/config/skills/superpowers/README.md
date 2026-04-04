# Superpowers Skills

来源：https://github.com/obra/superpowers

## 技能列表

| 技能 | 用途 |
|------|------|
| `using-superpowers` | 会话启动时加载，说明如何使用技能 |
| `brainstorming` | 创意工作前的头脑风暴 |
| `writing-plans` | 编写多步骤任务的执行计划 |
| `executing-plans` | 执行已写好的计划 |
| `test-driven-development` | TDD 测试驱动开发 |
| `systematic-debugging` | 系统性调试 |
| `verification-before-completion` | 完成任务前的验证 |
| `requesting-code-review` | 请求代码审查 |
| `receiving-code-review` | 接收审查反馈 |
| `finishing-a-development-branch` | 完成开发分支 |
| `using-git-worktrees` | 使用 Git worktree |
| `dispatching-parallel-agents` | 并行任务分发 |
| `subagent-driven-development` | 子代理驱动开发 |
| `writing-skills` | 创建/修改技能 |

## 安装方式

### 方式 1：通过 Claude Code 插件（推荐）

```bash
/plugin marketplace add obra/superpowers
```

然后：
```bash
/plugin install superpowers@claude-plugins-official
```

### 方式 2：本地技能目录（当前方式）

技能已复制到 `config/skills/superpowers/` 目录。

在 `~/.claude/settings.json` 中添加：

```json
{
  "extraKnownMarketplaces": {
    "superpowers": {
      "source": {
        "source": "git",
        "url": "https://github.com/obra/superpowers.git"
      }
    }
  },
  "enabledPlugins": {
    "superpowers@superpowers": true
  }
}
```
