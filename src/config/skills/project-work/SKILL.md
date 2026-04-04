---
name: project-work
description: 业务需求处理 - 读取需求、解析文档、创建计划、积累经验
---

# project-work - 业务需求处理

## Overview

处理业务需求的标准工作流：读取需求文档 → 解析并保存到项目工作目录 → 使用 Superpowers 创建实现计划 → 积累项目经验。

**Announce at start:** "我使用 project-work 技能来处理这个业务需求。"

---

## 快速使用

```
/project-work <需求文档 URL> --project <项目名称>
```

### 示例

```
# skywork 主站需求
/project-work https://rg975ojk5z.feishu.cn/wiki/xxx --project fe-monorepo

# skywork 首页需求
/project-work https://rg975ojk5z.feishu.cn/wiki/xxx --project fe-monorepo-home

# 其他项目需求
/project-work https://xxx.feishu.cn/wiki/xxx --project <项目名>
```

---

## 目录结构

### 项目工作目录（projects/）

为每个项目创建独立的工作目录：

```
src/projects/
├── claude.md                 # 总索引
├── <项目 A>/
│   ├── claude.md             # 项目经验积累
│   └── <需求名称>/
│       ├── README.md
│       ├── docs/
│       ├── figma/
│       └── 04-实现计划.md
└── <项目 B>/
    ├── claude.md
    └── <需求名称>/
```

### 单一需求结构

```
src/projects/<项目>/
├── claude.md                 # 项目经验（技术栈/最佳实践/踩坑记录）
└── <需求名称>/
    ├── README.md             # 需求概览
    ├── docs/                 # 需求文档
    │   ├── 01-产品需求.md
    │   ├── 02-后端文档.md
    │   └── ...
    ├── figma/                # Figma 设计信息
    │   ├── links.md
    │   └── <组件名>.md
    ├── i18n-文案.md          # 新增多语言文案清单
    └── 04-实现计划.md
```

---

## 项目配置

所有项目在 `src/projects/` 中管理：

| 项目 | 工作目录 | 代码目录 |
|------|----------|----------|
| fe-monorepo | `projects/fe-monorepo/` | `projects/fe-monorepo/code/` |
| fe-monorepo-home | `projects/fe-monorepo-home/` | `projects/fe-monorepo-home/code/` |

**--project 参数：**
- 默认值：`fe-monorepo`
- 可选值：任何在 `projects/` 中存在的项目

---

## 文件命名规则

### 核心规则

| 场景 | 处理方式 |
|------|----------|
| 无后端文档 | 不创建后端文档 |
| 无设计稿 | 不创建 `figma/` 目录 |
| 多个产品需求 | 依次保存：`产品需求.md`, `需求补充 1.md`... |
| 多个后端文档 | 合并或分别保存 |
| Figma 设计稿 | 通过 MCP 读取后保存到 `figma/` 目录 |
| PRD 迭代版本 | `产品需求-v1.md`, `产品需求-v2.md` |
| 新增多语言文案 | 保存到 `i18n-文案.md` |

### 文件命名

| 文档类型 | 位置 | 命名 |
|----------|------|------|
| 主需求 | `docs/` | `产品需求.md` |
| 补充需求 | `docs/` | `需求补充 1.md`... |
| 后端文档 | `docs/` | `后端-xxx.md` |
| Figma 链接清单 | `figma/` | `links.md` |
| Figma 设计信息 | `figma/` | `<页面/组件名>.md` |
| 技术文档 | `tech/` | `<主题>.md` |
| 实现计划 | 根目录 | `实现计划.md` |
| 多语言文案 | 根目录 | `i18n-文案.md` |

---

## 执行步骤

### Step 1: 读取需求文档

使用飞书 MCP 读取需求文档：

```bash
# 1. 先 initialize
curl -X POST "<mcp_url>" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"claude-code","version":"1.0.0"}}}'

# 2. 读取需求文档
curl -X POST "<mcp_url>" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"fetch-doc","arguments":{"doc_id":"<文档 URL>"}}}'
```

**读取的文档类型：**
- 产品需求文档（必需）
- 后端接口文档（如有）
- Figma 链接（如有）
- 技术文档（如有）

---

### Step 2: 创建需求文档目录

在项目工作目录下创建需求文档文件夹：

```bash
# 目录位置
/Users/imoo/work/data/project/ai-config/src/projects/<项目>/<需求名称>/
```

**文件保存策略：**

| 文档类型 | 位置 | 命名 |
|----------|------|------|
| 主需求 | `docs/` | `产品需求.md` |
| 补充需求 | `docs/` | `需求补充 1.md`... |
| 后端文档 | `docs/` | `后端-xxx.md` |
| Figma 链接清单 | `figma/` | `links.md` |
| Figma 设计信息 | `figma/` | `<页面/组件名>.md` |
| 技术文档 | `tech/` | `<主题>.md` |
| 实现计划 | 根目录 | `实现计划.md` |

**Figma 设计信息保存：**

当用户提供 Figma 链接时：
1. 使用 MCP 读取设计信息
2. 保存到 `figma/<页面/组件名>.md`
3. 更新 `figma/links.md` 索引

---

### Step 3: 更新项目经验（可选）

如果是新项目或新模块，更新项目的 `claude.md`：

**记录内容：**
- 技术栈说明
- 架构设计
- 开发最佳实践
- 踩坑记录
- 常用命令

---

### Step 4: 创建实现计划

使用 `superpowers:writing-plans` 技能创建实现计划：

**输入信息：**
- 需求文档内容（Step 2 中保存的 MD 文件）
- 后端接口文档（如有）
- Figma 设计信息（如有）
- 项目上下文（当前代码结构、技术栈、claude.md 经验）

**计划保存位置：**
```
projects/<项目>/<需求名称>/04-实现计划.md
```

---

## 完整工作流

```
用户提供需求 URL + 项目名
       ↓
project-work 技能启动
       ↓
Step 1: 读取文档
  - 读取需求/后端/Figma 文档
       ↓
Step 2: 创建需求目录
  - 在 projects/<项目>/ 下创建文件夹
  - 保存文档到 docs/figma/
       ↓
Step 3: 更新项目经验（可选）
  - 更新 <项目>/claude.md
       ↓
Step 4: 创建实现计划
  - 生成 04-实现计划.md
       ↓
输出：需求位置 + 计划位置 + 执行建议
```

---

## 输出示例

```
✅ project-work 需求处理完成

**需求文档已保存到：**
projects/fe-monorepo/fe-website-custom-domain/
  - README.md
  - docs/
      ├── 产品需求.md
      └── 后端文档.md
  - figma/
      ├── links.md
      └── 发布弹窗.md

**实现计划：**
projects/fe-monorepo/fe-website-custom-domain/实现计划.md

**下一步：**
1. 查看计划：Read projects/fe-monorepo/fe-website-custom-domain/实现计划.md
2. 执行计划：/superpowers subagent-driven-development
```

---

## 注意事项

1. **MCP 调用顺序**：必须先 `initialize`，再调用 `tools/call`
2. **目录命名**：使用 `<kebab-case-name>` 格式
3. **灵活文件组织**：根据实际文档情况动态创建文件
4. **Figma 信息保存**：通过 MCP 读取的设计信息保存到 `figma/` 目录
5. **项目经验积累**：开发经验记录到项目的 `claude.md`
6. **多语言文案处理**：
   - 开发时先写死中文文案
   - 完成后列出所有新增文案到 `i18n-文案.md`
   - 用户申请多语言后再替换为 `$t()` 调用

---

## 执行模式

当用户说「可以执行」时，进入逐步执行模式：

**执行原则：**
1. 按 Plan 中的 Task 顺序逐个执行
2. 每个 Task 完成后，**必须等待用户验证确认**后再继续下一个
3. 验证方式：代码 diff、文件位置、浏览器测试
4. 验证失败先修复再继续

---

## 与其他技能的关系

| 技能 | 关系 |
|------|------|
| feishu-docs | 底层依赖，读取飞书文档 |
| superpowers:writing-plans | Step 4 调用，创建计划 |
| superpowers:subagent-driven-development | 计划执行 |
| superpowers:executing-plans | 计划执行备选 |
