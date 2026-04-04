# validate-files

Git Pre-commit 文件验证工具

## 用法

```bash
node scripts/validate-files/index.js
```

## 配置

配置文件：`allowed-files.json`

### allowedPaths

定义允许提交的文件路径白名单：

```json
{
  "allowedPaths": {
    "src/brain/memory": ["claude.md", "*.md"],
    "src/scripts": ["*.js"]
  }
}
```

### rules

定义各项校验规则：

- `brain`: brain 目录结构和文件命名验证
- `skills`: skills 目录格式验证
- `temp`: temp 目录规范验证
- `projects`: projects 软连接检查

### global.alwaysAllow

全局允许的文件（不受 allowedPaths 限制）：

```json
{
  "global": {
    "alwaysAllow": [".husky/*", "package.json"]
  }
}
```

## 测试

```bash
# 运行测试
node scripts/validate-files/test.js
```
