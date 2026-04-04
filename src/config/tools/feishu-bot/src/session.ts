/**
 * 会话管理 - 按 thread_key 隔离对话
 * 完整日志版本
 */

import { createLogger } from "./logger.js";

// ============================================================================
// 初始化日志
// ============================================================================

const log = createLogger("session");

// ============================================================================
// 类型定义
// ============================================================================

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// ============================================================================
// 会话存储
// ============================================================================

// 内存 Map - key: thread_key (飞书话题 ID), value: 消息历史数组
const sessions = new Map<string, Message[]>();

log.info("会话管理器初始化完成", { initialSessionCount: sessions.size });

// ============================================================================
// 会话操作
// ============================================================================

/**
 * 获取会话（如果不存在则创建）
 */
export function getSession(threadKey: string): Message[] {
  log.debug("[getSession]", { threadKey, exists: sessions.has(threadKey) });

  if (!sessions.has(threadKey)) {
    sessions.set(threadKey, []);
    log.info("[getSession] 创建新会话", { threadKey });
  }

  const session = sessions.get(threadKey)!;
  log.debug("[getSession] 返回会话", { threadKey, messageCount: session.length });

  return session;
}

/**
 * 添加消息到会话
 */
export function addMessage(
  threadKey: string,
  role: 'user' | 'assistant',
  content: string
): void {
  const startTime = Date.now();

  log.call("addMessage", {
    threadKey,
    role,
    contentLength: content.length,
    contentPreview: content.substring(0, 50) + "...",
  });

  const session = getSession(threadKey);
  const message: Message = {
    role,
    content,
    timestamp: Date.now(),
  };

  session.push(message);

  log.ret("addMessage", {
    threadKey,
    newMessageCount: session.length,
  }, Date.now() - startTime);

  log.debug("[addMessage] 消息已添加", {
    threadKey,
    role,
    totalMessages: session.length,
  });
}

/**
 * 获取会话历史（格式化为 Claude API 格式）
 * 限制最近 20 条消息，避免 token 超限
 */
export function getSessionHistory(threadKey: string): Array<{ role: 'user' | 'assistant'; content: string }> {
  const startTime = Date.now();

  log.call("getSessionHistory", { threadKey });

  const history = getSession(threadKey);
  const limitedHistory = history.slice(-20);

  const result = limitedHistory.map((msg) => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
  }));

  log.ret("getSessionHistory", {
    threadKey,
    totalMessages: history.length,
    returnedMessages: result.length,
    wasLimited: history.length > 20,
  }, Date.now() - startTime);

  log.debug("[getSessionHistory] 返回历史", {
    threadKey,
    count: result.length,
    summary: result.map(r => ({ role: r.role, length: r.content.length })),
  });

  return result;
}

/**
 * 清除会话
 */
export function clearSession(threadKey: string): void {
  log.call("clearSession", { threadKey, exists: sessions.has(threadKey) });

  const hadSession = sessions.has(threadKey);
  sessions.delete(threadKey);

  log.ret("clearSession", { deleted: hadSession });

  if (hadSession) {
    log.info("[clearSession] 会话已删除", { threadKey });
  } else {
    log.debug("[clearSession] 会话不存在，无需删除", { threadKey });
  }
}

/**
 * 获取所有活跃会话
 */
export function getActiveSessions(): string[] {
  const sessionKeys = Array.from(sessions.keys());

  log.debug("[getActiveSessions]", {
    activeCount: sessionKeys.length,
    sessionKeys: sessionKeys.map(k => k.substring(0, 20) + "..."),
  });

  return sessionKeys;
}

/**
 * 获取会话统计信息（调试用）
 */
export function getSessionStats(): {
  totalSessions: number;
  totalMessages: number;
  sessions: Array<{ threadKey: string; messageCount: number }>;
} {
  const stats = {
    totalSessions: sessions.size,
    totalMessages: Array.from(sessions.values()).reduce((sum, msgs) => sum + msgs.length, 0),
    sessions: Array.from(sessions.entries()).map(([threadKey, msgs]) => ({
      threadKey: threadKey.substring(0, 30) + "...",
      messageCount: msgs.length,
    })),
  };

  log.debug("[getSessionStats]", stats);

  return stats;
}
