---
name: project-link
description: 管理业务项目软链接 - 添加/移除项目，自动更新索引
---

# Project Link Skill

管理 `projects/` 下的业务项目代码软链接。

## 触发条件

- 用户要添加新项目到 `projects/`
- 用户要移除已链接的项目
- 用户要查看已链接的项目列表
- 用户要更新项目索引描述

## 操作流程

### 添加项目

**用户输入示例：** "添加项目 ~/work/data/project/api-platform"

**流程：**
1. 确定项目名称（默认使用目录名，或用户指定的名称）
2. 创建目录：`mkdir -p projects/<项目名称>/work`
3. 创建软链接：`ln -s <项目路径> projects/<项目名称>/code`
4. 用 AI 分析项目（package.json, README.md, 目录结构）
5. 自动生成项目描述
6. 更新 `projects/claude.md` 索引

### 移除项目

**用户输入示例：** "移除项目 api-platform"

**流程：**
1. 确认 `projects/<项目名称>/code` 是软链接（不是物理目录）
2. 删除软链接：`rm projects/<项目名称>/code`
3. 从 `projects/claude.md` 索引中移除对应条目

### 列出项目

**用户输入示例：** "列出所有项目"

**流程：**
1. 读取 `projects/claude.md`
2. 输出表格中的所有项目链接及目标路径

### 更新索引

**用户输入示例：** "更新 api-platform 的项目描述"

**流程：**
1. 重新分析项目
2. 用 AI 生成更新的描述
3. 更新 `projects/claude.md`

## 索引格式

`projects/claude.md` 格式：

```markdown
# Projects Index

统一项目目录 — 每个项目包含工作文档和代码软链接。

## 项目列表

| 项目 | 代码实际位置 |
|------|----------|
| <name> | <path> |

---

**规则：**
- 新增项目时，先更新本索引，再创建目录
- 项目目录命名使用 `kebab-case`
```

## AI 生成描述规则

分析项目时，按优先级提取信息：

1. `package.json` - `name`, `description`, `scripts`
2. `README.md` - 标题和简介段落
3. 目录结构 - 识别项目类型（frontend/backend/lib/docs）
4. 其他配置文件 - `pyproject.toml`, `Cargo.toml`, `go.mod` 等

生成描述格式：`<项目类型> - <核心功能/用途>`

示例：
- "前端 monorepo - 包含多个 React 应用和共享组件库"
- "Node.js API 服务 - Express 后端，提供 RESTful 接口"
- "TypeScript 工具库 - 通用日期处理和格式化工具"

## 注意事项

- 添加项目前检查软链接是否已存在
- 移除项目前确认不是物理目录（避免误删）
- 索引文件必须保持 Markdown 表格格式有效
- 项目描述要简洁（不超过 50 字）
