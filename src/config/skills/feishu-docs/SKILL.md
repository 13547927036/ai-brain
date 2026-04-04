---
name: feishu-docs
description: 飞书文档操作服务 - 通过 MCP 读写飞书云文档/知识库
---

# feishu-docs - 飞书文档读写

## 快速使用（推荐）

**使用飞书官方 MCP 服务** - 无需部署，直接调用飞书 API：

```json
{
  "mcpServers": {
    "feishu-mcp": {
      "url": "https://mcp.feishu.cn/mcp/mcp_XXXXXXXX",
      "headers": {}
    }
  }
}
```

配置位置：`/Users/imoo/work/data/project/ai-config/config/settings.json`

## 可用工具

| 工具 | 功能 |
|------|------|
| `create-doc` | 从 Markdown 创建云文档 |
| `fetch-doc` | 获取云文档内容 |
| `update-doc` | 更新云文档（7 种模式） |
| `search-doc` | 搜索云文档 |
| `list-docs` | 获取知识库/空间文档列表 |
| `add-comments` | 添加文档评论 |
| `get-comments` | 获取评论列表 |
| `search-user` | 搜索用户 |
| `get-user` | 获取用户信息 |

## 重要约束

**所有文档必须创建在指定知识库下，禁止创建到个人空间！**

默认创建位置：
```
https://rg975ojk5z.feishu.cn/wiki/DMCgwLJPYiRvKzkr4W4cyN6mnKb
```

调用 `create-doc` 时**必须**传入 `wiki_node` 参数：

```json
{
  "name": "create-doc",
  "arguments": {
    "title": "文档标题",
    "markdown": "文档内容",
    "wiki_node": "https://rg975ojk5z.feishu.cn/wiki/DMCgwLJPYiRvKzkr4W4cyN6mnKb"
  }
}
```

## 问题排查

**Q: AI 使用了 SDK 而非 MCP 怎么办？**

**A: 必须优先使用 MCP 方式**。如果当前环境无法使用 MCP 工具，可用 curl 直接调用：

```bash
curl -X POST "https://mcp.feishu.cn/mcp/mcp_XXXXXX" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "create-doc",
      "arguments": {
        "title": "文档标题",
        "markdown": "# 内容",
        "wiki_node": "https://rg975ojk5z.feishu.cn/wiki/DMCgwLJPYiRvKzkr4W4cyN6mnKb"
      }
    }
  }'
```

---

## 知识文档

问题记录：`/Users/imoo/work/data/project/ai-config/brain/knowledge/feishu-mcp-sdk-choice.md`
