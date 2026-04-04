/**
 * 调用本地 Claude Code CLI - 利用其内置的 Brain 记忆系统
 * 完整日志版本
 */

import { exec } from "child_process";
import { promisify } from "util";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { createLogger, Logger } from "./logger.js";

const execAsync = promisify(exec);

// ============================================================================
// 初始化日志
// ============================================================================

const log = createLogger("claude");

// ============================================================================
// 路径配置
// ============================================================================

// 获取项目根目录（feishu-bridge 的父目录的父目录）
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "..", "..");

log.info("Claude 模块初始化", { PROJECT_ROOT });

// ============================================================================
// 类型定义
// ============================================================================

interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

interface ClaudeCallResult {
  reply: string;
  duration: number;
  stdout?: string;
  stderr?: string;
}

// ============================================================================
// 导出Logger 供 server.ts 使用（可选）
// ============================================================================

export { log as logger };

// ============================================================================
// Claude 调用
// ============================================================================

/**
 * 调用 Claude Code CLI
 * 使用 -p (--print) 模式进行非交互式调用，让 Claude Code 读取 Brain 记忆
 */
export async function callClaude(
  messages: ClaudeMessage[],
  logger?: Logger
): Promise<string> {
  const startTime = Date.now();
  const callLog = logger || log;

  // -------------------------------------------------------------------------
  // 参数验证
  // -------------------------------------------------------------------------
  callLog.call("callClaude", {
    messagesCount: messages.length,
    messagesSummary: messages.map(m => ({
      role: m.role,
      contentLength: m.content.length,
      contentPreview: m.content.substring(0, 50) + "...",
    })),
  });

  if (messages.length === 0) {
    callLog.error("调用失败：没有消息");
    throw new Error("No messages to send");
  }

  // -------------------------------------------------------------------------
  // 分离历史对话和最新消息
  // -------------------------------------------------------------------------
  const historyMessages = messages.slice(0, -1);
  const lastMessage = messages[messages.length - 1];

  callLog.debug("消息分离", {
    historyCount: historyMessages.length,
    lastMessageRole: lastMessage.role,
    lastMessageLength: lastMessage.content.length,
  });

  // -------------------------------------------------------------------------
  // 构建 Prompt
  // -------------------------------------------------------------------------
  let prompt = "";

  if (historyMessages.length > 0) {
    prompt += "【对话历史】\n";
    historyMessages.forEach((m, idx) => {
      prompt += `${m.role === "user" ? "用户" : "助手"} #${idx + 1}: ${m.content}\n`;
    });
    prompt += "\n【当前消息】\n";
  }

  prompt += `${lastMessage.role === "user" ? "用户" : "助手"}: ${lastMessage.content}`;

  callLog.info("Prompt 构建完成", {
    promptLength: prompt.length,
    historyMessages: historyMessages.length,
    preview: prompt.substring(0, 200) + "...",
  });

  // -------------------------------------------------------------------------
  // 构建 CLI 命令
  // -------------------------------------------------------------------------
  const command = `claude -p --dangerously-skip-permissions --no-session-persistence --output-format json ${JSON.stringify(prompt)}`;
  const options = {
    timeout: 600000, // 10 分钟超时
    env: { ...process.env },
    cwd: PROJECT_ROOT,
  };

  callLog.info("准备执行 CLI 命令", {
    commandPreview: command.substring(0, 100) + "...",
    timeout: options.timeout,
    cwd: options.cwd,
  });

  // -------------------------------------------------------------------------
  // 执行 CLI
  // -------------------------------------------------------------------------
  let stdout: string;
  let stderr: string;

  try {
    const result = await execAsync(command, options);
    stdout = result.stdout;
    stderr = result.stderr;

    callLog.debug("CLI 执行完成", {
      stdoutLength: stdout.length,
      stderrLength: stderr.length,
      stderrPreview: stderr ? stderr.substring(0, 200) + "..." : "(empty)",
    });

    if (stderr) {
      callLog.warn("CLI stderr 输出", { stderr });
    }

  } catch (error: any) {
    const duration = Date.now() - startTime;

    callLog.error("CLI 执行失败", {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
      killed: error.killed,
      stderr: error.stderr,
      duration: `${duration}ms`,
    });

    if (error.killed) {
      throw new Error("Claude CLI timed out (>600s)");
    }
    if (error.stderr) {
      callLog.error("CLI stderr 详情", { stderr: error.stderr });
    }
    throw error;
  }

  // -------------------------------------------------------------------------
  // 解析 JSON 输出
  // -------------------------------------------------------------------------
  callLog.call("parseJSON", { stdoutLength: stdout.length, stdoutPreview: stdout.substring(0, 200) + "..." });

  let reply: string;

  try {
    const lines = stdout.trim().split("\n");
    const jsonLine = lines[lines.length - 1];
    callLog.debug(`JSON 行 (${lines.length} 行)，取最后一行`, {
      totalLines: lines.length,
      jsonLine: jsonLine.substring(0, 100) + "...",
    });

    const result = JSON.parse(jsonLine);
    callLog.debug("JSON 解析成功", {
      resultKeys: Object.keys(result),
      resultType: typeof result,
    });

    // {"type":"result", "result": "回复内容", ...}
    reply = result.result || result.content || result.output || stdout.trim();

    callLog.ret("parseJSON", {
      replyLength: reply.length,
      replyPreview: reply.substring(0, 100) + "...",
    });

  } catch (e) {
    callLog.warn("JSON 解析失败，使用原始 stdout", {
      parseError: e instanceof Error ? e.message : String(e),
      stdoutLength: stdout.length,
    });
    reply = stdout.trim();
  }

  // -------------------------------------------------------------------------
  // 完成
  // -------------------------------------------------------------------------
  const totalDuration = Date.now() - startTime;

  callLog.ret("callClaude", {
    replyLength: reply.length,
    replyPreview: reply.substring(0, 150) + "...",
    duration: `${totalDuration}ms`,
  }, totalDuration);

  callLog.info("✅ Claude 调用完成", {
    duration: `${totalDuration}ms`,
    replyLength: reply.length,
    charsPerSecond: reply.length > 0 ? Math.round(reply.length / (totalDuration / 1000)) : 0,
  });

  return reply;
}
