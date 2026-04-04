/**
 * 飞书消息 API 封装
 * 完整日志版本
 *
 * 仅用于 Bot 桥接服务发送消息，不包含文档操作功能
 */

import * as Lark from "@larksuiteoapi/node-sdk";
import { createLogger } from "./logger.js";

// ============================================================================
// 初始化日志
// ============================================================================

const log = createLogger("feishu");

// ============================================================================
// 飞书配置
// ============================================================================

const FEISHU_APP_ID = process.env.FEISHU_APP_ID || "";
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET || "";

log.info("飞书模块初始化", {
  appId: FEISHU_APP_ID ? `${FEISHU_APP_ID.substring(0, 8)}...` : "(empty)",
  appSecret: FEISHU_APP_SECRET ? "***hidden***" : "(empty)",
});

// 创建飞书客户端（SDK 会自动管理 access token）
const client = new Lark.Client({
  appId: FEISHU_APP_ID,
  appSecret: FEISHU_APP_SECRET,
  appType: Lark.AppType.SelfBuild,
  domain: Lark.Domain.Feishu,
});

log.info("飞书客户端创建完成");

// ============================================================================
// 导出客户端供 server.ts 使用
// ============================================================================

export { client };

// ============================================================================
// 发送消息
// ============================================================================

/**
 * 发送消息到飞书
 */
export async function sendMessage(
  chatId: string,
  content: string,
  threadKey?: string
): Promise<void> {
  const startTime = Date.now();

  log.call("sendMessage", {
    chatId,
    contentLength: content.length,
    contentPreview: content.substring(0, 100) + "...",
    threadKey,
  });

  try {
    const response = await client.im.message.create({
      params: {
        receive_id_type: "chat_id",
      },
      data: {
        receive_id: chatId,
        content: JSON.stringify({ text: content }),
        msg_type: "text",
        ...(threadKey ? { thread_id: threadKey } : {}),
      },
    });

    const duration = Date.now() - startTime;

    log.ret("sendMessage", {
      responseCode: response.code,
      responseMsg: response.msg,
      data: response.data,
    }, duration);

    log.info("✅ 消息发送成功", {
      chatId,
      duration: `${duration}ms`,
      responseCode: response.code,
    });

    if (response.code !== 0) {
      log.error("飞书 API 返回错误", {
        code: response.code,
        msg: response.msg,
        data: response.data,
      });
      throw new Error(`Failed to send message: ${response.msg}`);
    }

  } catch (error) {
    const duration = Date.now() - startTime;

    log.error("❌ 消息发送失败", {
      chatId,
      contentLength: content.length,
      duration: `${duration}ms`,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
    });

    throw error;
  }
}
