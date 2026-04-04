---
name: feishu-bot
type: tool
description: 飞书 Bot 桥接服务 - 消息中转，让 Claude 住进飞书
---

# feishu-bot - 飞书通信中转

## 功能

飞书 Bot 桥接服务，让 Claude 住进飞书，变成随时在线的同事。

**v2.0：使用飞书 SDK 长连接模式**
- ✅ 无需公网 IP
- ✅ 无需内网穿透（ngrok 等）
- ✅ SDK 自动处理加密、验签、token 管理

## 启动方式

```bash
cd /Users/imoo/work/data/project/ai-config/config/tools/feishu-bot
pnpm install
./start.sh
```

## 环境变量

```bash
# 飞书配置
FEISHU_APP_ID=cli_xxx
FEISHU_APP_SECRET=xxx
BOT_USER_ID=ou_xxx  # 可选，用于过滤 @Bot 消息

# Claude 配置
ANTHROPIC_API_KEY=sk-xxx
ANTHROPIC_BASE_URL=https://api.anthropic.com
ANTHROPIC_MODEL=claude-sonnet-4-20250514

# 服务器配置
PORT=5070

# 日志配置
LOG_LEVEL=DEBUG          # DEBUG | INFO | WARN | ERROR
LOG_DIR=logs             # 日志目录
LOG_RETENTION_DAYS=2     # 保留天数
```

日志自动输出到 `logs/YYYY-MM-DD.log`，默认保留 2 天。

## 飞书开放平台配置

1. 创建自建应用
2. 开通机器人权限
3. **事件订阅** → 编辑订阅方式 → 选择 **使用长连接接收事件**
4. 订阅事件：`接收消息 (im.message.receive_v1)`

## 测试

飞书群聊中 @Bot 发送消息，验证回复。

---

## 项目位置

`/Users/imoo/work/data/project/ai-config/config/tools/feishu-bot/`

## 相关文件

- `src/server.ts` - Webhook 服务器
- `src/feishu.ts` - 飞书消息 API 封装
- `src/claude.ts` - Claude 调用
- `src/session.ts` - 会话管理
- `src/logger.ts` - 日志系统
