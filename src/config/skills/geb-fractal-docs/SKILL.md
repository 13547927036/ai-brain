---
name: geb-fractal-docs
description: GEB 分形文档系统 - 帮助用户创建和维护三层结构的项目文档（L1项目地图、L2模块清单、L3文件头部）。当用户需要初始化项目文档、创建或更新 CLAUDE.md、设置项目结构说明、整理代码文档，或者提到"GEB"、"分形文档"、"三层结构"、"项目文档"、"CLAUDE.md"时使用此 skill。即使用户只是说"帮我整理一下项目"、"添加项目说明"、"这个模块需要文档"，也应该主动使用这个 skill。
---

# GEB 分形文档系统

帮助用户建立三层递归的项目文档结构，让 AI 快速理解项目。

## 三层结构

- **L1（项目层）** `/CLAUDE.md` — 技术栈 + 目录结构
- **L2（模块层）** `{模块}/CLAUDE.md` — 文件清单 + 职责
- **L3（文件层）** 文件头部 — INPUT/OUTPUT/POS 契约

所有文档必须包含：`[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md`

## 使用场景

### 场景 1：初始化项目文档
1. 询问项目名、定位、技术栈
2. 扫描目录结构（Glob）
3. 生成 L1 文档
4. 询问是否创建模块文档

### 场景 2：为模块添加文档
1. 列出模块文件（Glob）
2. 分析文件职责（Read + import/export）
3. 生成 L2 文档

### 场景 3：添加文件头部
1. 读取文件
2. 分析 INPUT（import）、OUTPUT（export）、POS（角色）
3. 添加 L3 头部注释

### 场景 4：检查更新文档
1. 扫描所有 CLAUDE.md
2. 检查规范和时效性
3. 提供更新建议

## 文档模板

### L1 模板（`/CLAUDE.md`）

```markdown
# {项目名} - {定位}

## 技术栈
- 框架：{React + Vite}
- 语言：{TypeScript}
- 样式：{Tailwind CSS}

## 目录结构

<directory>
src/ - 源代码
├── components/ - 可复用组件
├── pages/ - 页面组件
└── utils/ - 工具函数
</directory>

<config>
vite.config.ts - Vite 配置
package.json - 项目依赖
</config>

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
```

### L2 模板（`{模块}/CLAUDE.md`）

```markdown
# {模块名}/
> L2 | 父级：../CLAUDE.md

**{文件名}**: {职责描述}
- {技术细节}

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
```

### L3 模板（文件头部）

**JavaScript/TypeScript**：
```javascript
/**
 * [INPUT]: 依赖 {模块} 的 {功能}
 * [OUTPUT]: 提供 {导出内容}
 * [POS]: {模块} 的 {角色}
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
```

**Python**：
```python
"""
[INPUT]: 依赖 {模块} 的 {功能}
[OUTPUT]: 提供 {导出内容}
[POS]: {模块} 的 {角色}
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""
```

## 关键原则

1. **简洁优先** - L1 不超过 50 行，L2 每文件 2-3 行，L3 头部 5-10 行
2. **通过对话确认** - 询问必要信息，提供选择而非一次性完成
3. **解释价值** - 告诉用户为什么这样做，不是生硬命令
4. **优先级** - 核心文件优先，简单配置文件可跳过
5. **语言无关** - 根据项目语言调整注释风格，结构保持一致
