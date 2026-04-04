/**
 * 飞书长连接服务器 - 使用飞书 SDK
 * 完整日志版本
 */

import * as Lark from "@larksuiteoapi/node-sdk";
import { addMessage, getSessionHistory } from "./session.js";
import { callClaude } from "./claude.js";
import { createLogger } from "./logger.js";

// ============================================================================
// 初始化日志
// ============================================================================

const log = createLogger("server");

// ============================================================================
// 飞书配置
// ============================================================================

const baseConfig = {
  appId: process.env.FEISHU_APP_ID || "",
  appSecret: process.env.FEISHU_APP_SECRET || "",
};

// 创建飞书客户端（用于发送消息和表情回复）
const client = new Lark.Client(baseConfig);

// 创建长连接客户端
const wsClient = new Lark.WSClient({
  ...baseConfig,
  loggerLevel: Lark.LoggerLevel.info,
});

// ============================================================================
// 格式化错误为用户友好的消息
// ============================================================================

function formatErrorForUser(error: string): string {
  const errorMappings: Array<[RegExp, string]> = [
    [/timeout/i, "请求超时（>10 分钟），可能是回复内容太长或网络问题"],
    [/ECONNREFUSED/i, "无法连接到 Claude 服务，请检查本地服务是否正常运行"],
    [/ENOENT|not found/i, "找不到 claude 命令，请确认 Claude Code 已正确安装"],
    [/permission|EACCES/i, "权限不足，请检查文件访问权限或 API 密钥配置"],
    [/JSON|parse|syntax/i, "消息格式解析失败，可能是消息内容包含特殊字符"],
    [/API|api|fetch/i, "调用外部服务失败，请检查网络或 API 配置"],
    [/session|thread/i, "会话管理错误，请尝试开启新话题"],
  ];

  for (const [pattern, message] of errorMappings) {
    if (pattern.test(error)) {
      return message;
    }
  }

  return error.length > 200 ? `${error.substring(0, 200)}...` : error;
}

// ============================================================================
// 消息处理
// ============================================================================

/**
 * 处理消息并回复
 */
async function processMessage(
  chatId: string,
  messageId: string,
  rawContent: string,
  threadId: string
): Promise<void> {
  const startTime = Date.now();

  log.info("=== 开始处理新消息 ===", {
    chatId,
    messageId,
    threadId,
    rawContentLength: rawContent.length,
  });

  try {
    // -------------------------------------------------------------------------
    // Step 1: 解析消息内容
    // -------------------------------------------------------------------------
    log.call("parseMessage", { rawContent });

    const contentObj = JSON.parse(rawContent);
    const text = contentObj.text || contentObj.content || rawContent;

    log.ret("parseMessage", { contentObj, text: text.substring(0, 200) + "..." });

    log.info(`[Step 1] 消息解析完成`, {
      chatId,
      textPreview: text.substring(0, 100),
      textLength: text.length,
    });

    // -------------------------------------------------------------------------
    // Step 2: 添加"正在输入"表情
    // -------------------------------------------------------------------------
    log.call("addTypingReaction", { messageId });

    const typingReaction = await client.im.messageReaction.create({
      path: { message_id: messageId },
      data: { reaction_type: { emoji_type: "Typing" } },
    });

    const typingReactionId = typingReaction.data?.reaction_id;
    log.ret("addTypingReaction", { typingReactionId }, Date.now() - startTime);

    log.info(`[Step 2] 已添加"正在输入"表情`, { messageId, typingReactionId });

    // -------------------------------------------------------------------------
    // Step 3: 添加用户消息到会话
    // -------------------------------------------------------------------------
    log.call("addMessageToSession", { threadId, role: "user", textLength: text.length });

    addMessage(threadId, "user", text);

    log.ret("addMessageToSession", { threadId, messageCount: getSessionHistory(threadId).length });

    log.info(`[Step 3] 用户消息已保存到会话`, { threadId });

    // -------------------------------------------------------------------------
    // Step 4: 获取会话历史
    // -------------------------------------------------------------------------
    log.call("getSessionHistory", { threadId });

    const history = getSessionHistory(threadId);

    log.ret("getSessionHistory", { historyLength: history.length });

    log.info(`[Step 4] 已获取会话历史`, { threadId, messageCount: history.length });

    // -------------------------------------------------------------------------
    // Step 5: 调用 Claude
    // -------------------------------------------------------------------------
    log.info(`[Step 5] 开始调用 Claude AI...`, {
      threadId,
      historySummary: history.map(h => ({ role: h.role, length: h.content.length })),
    });

    const claudeStart = Date.now();
    const reply = await callClaude(history, log);
    const claudeDuration = Date.now() - claudeStart;

    log.info(`[Step 5] Claude 回复完成`, {
      threadId,
      replyLength: reply.length,
      duration: `${claudeDuration}ms`,
      replyPreview: reply.substring(0, 100) + "...",
    });

    // -------------------------------------------------------------------------
    // Step 6: 添加 AI 回复到会话
    // -------------------------------------------------------------------------
    log.call("addAssistantMessage", { threadId, replyLength: reply.length });

    addMessage(threadId, "assistant", reply);

    log.ret("addAssistantMessage", {
      threadId,
      totalMessages: getSessionHistory(threadId).length,
    });

    log.info(`[Step 6] AI 回复已保存到会话`, { threadId });

    // -------------------------------------------------------------------------
    // Step 7: 发送回复到飞书
    // -------------------------------------------------------------------------
    log.call("sendReplyToFeishu", {
      messageId,
      replyLength: reply.length,
      threadId,
    });

    const result = await client.im.message.reply({
      path: { message_id: messageId },
      data: {
        content: JSON.stringify({ text: reply }),
        msg_type: "text",
        reply_in_thread: true,
      },
    });

    log.ret("sendReplyToFeishu", {
      resultThreadId: result.data?.thread_id,
      resultRootId: result.data?.root_id,
    });

    log.info(`[Step 7] 回复已发送到飞书`, {
      messageId,
      thread_id: result.data?.thread_id,
      root_id: result.data?.root_id,
    });

    // -------------------------------------------------------------------------
    // Step 8: 删除"正在输入"表情
    // -------------------------------------------------------------------------
    if (typingReactionId) {
      log.call("removeTypingReaction", { messageId, reactionId: typingReactionId });

      await client.im.messageReaction.delete({
        path: { message_id: messageId, reaction_id: typingReactionId },
      });

      log.ret("removeTypingReaction");
      log.info(`[Step 8] 已删除"正在输入"表情`, { typingReactionId });
    }

    // -------------------------------------------------------------------------
    // Step 9: 添加"完成"表情
    // -------------------------------------------------------------------------
    log.call("addDoneReaction", { messageId });

    await client.im.messageReaction.create({
      path: { message_id: messageId },
      data: { reaction_type: { emoji_type: "DONE" } },
    });

    log.ret("addDoneReaction");
    log.info(`[Step 9] 已添加"完成"表情`, { messageId });

    // -------------------------------------------------------------------------
    // 处理完成
    // -------------------------------------------------------------------------
    const totalDuration = Date.now() - startTime;
    log.info("=== 消息处理完成 ===", {
      messageId,
      totalDuration: `${totalDuration}ms`,
      replyLength: reply.length,
      charsPerSecond: Math.round(reply.length / (totalDuration / 1000)),
    });

  } catch (error) {
    const duration = Date.now() - startTime;

    // 提取详细错误信息
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    // 完整错误日志
    log.error("=== 消息处理失败 ===", {
      messageId,
      chatId,
      errorMessage,
      errorStack,
      duration: `${duration}ms`,
      fullError: error,
    });

    // 用户友好的错误消息
    const userErrorMessage = formatErrorForUser(errorMessage);
    const errorDetails = errorStack ? `\n\n堆栈信息:\n${errorStack}` : "";

    try {
      log.info("发送错误消息到飞书...", { userErrorMessage });

      await client.im.message.reply({
        path: { message_id: messageId },
        data: {
          content: JSON.stringify({
            text: `抱歉，处理消息时出现错误，请稍后重试。\n\n错误原因：${userErrorMessage}${errorDetails}`,
          }),
          msg_type: "text",
          reply_in_thread: true,
        },
      });

      log.info("错误消息已发送");
    } catch (sendError) {
      log.error("发送错误消息失败", {
        originalError: errorMessage,
        sendError: sendError instanceof Error ? sendError.message : String(sendError),
      });
    }
  }
}

// ============================================================================
// 启动飞书长连接
// ============================================================================

log.info("╔═══════════════════════════════════════════════════════════╗");
log.info("║          Feishu Bridge - 飞书桥接服务启动                  ║");
log.info("╚═══════════════════════════════════════════════════════════╝");

log.info("初始化配置", {
  appId: baseConfig.appId ? `${baseConfig.appId.substring(0, 8)}...` : "(empty)",
  appSecret: baseConfig.appSecret ? "***hidden***" : "(empty)",
});

log.info("启动 WebSocket 长连接...");

wsClient.start({
  eventDispatcher: new Lark.EventDispatcher({}).register({
    "im.message.receive_v1": async (data: any) => {
      const { message } = data;
      const chatId = message.chat_id;
      const messageId = message.message_id;
      const content = message.content;
      const threadId = message.thread_id || messageId;

      log.info("📨 收到新消息", {
        chatId,
        messageId,
        threadId,
        contentLength: content.length,
        contentPreview: content.substring(0, 50) + "...",
      });

      // 异步处理消息（不阻塞）
      processMessage(chatId, messageId, content, threadId).catch((err) => {
        log.error("processMessage 未捕获的错误", {
          chatId,
          messageId,
          error: err instanceof Error ? {
            name: err.name,
            message: err.message,
            stack: err.stack,
          } : err,
        });
      });

      // 立即返回，飞书要求 3 秒内响应
      return {};
    },
  }),
});

log.info("✅ 已连接到飞书 WebSocket");
log.info("等待消息中...");
