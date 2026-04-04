/**
 * 结构化日志系统
 * 支持日志级别、彩色输出、时间戳、模块标记、文件输出、自动轮转
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// 日志级别
// ============================================================================

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

// 从环境变量读取日志级别，默认 DEBUG（最详细）
const LOG_LEVEL = parseLogLevel(process.env.LOG_LEVEL || 'DEBUG');

// 日志目录（固定为 logs/ 目录）
const LOG_DIR = process.env.LOG_DIR || path.join(process.cwd(), 'logs');
// 日志文件保留天数
const LOG_RETENTION_DAYS = parseInt(process.env.LOG_RETENTION_DAYS || '2', 10);

// ============================================================================
// 日志轮转管理
// ============================================================================

/**
 * 获取今天的日志文件路径
 */
function getTodayLogFile(): string {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return path.join(LOG_DIR, `${today}.log`);
}

/**
 * 清理过期日志文件
 * 只保留最近 N 天的日志（默认 2 天）
 */
function cleanupOldLogs(): void {
  if (!fs.existsSync(LOG_DIR)) {
    return;
  }

  const now = Date.now();
  const maxAge = LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000; // 毫秒

  try {
    const files = fs.readdirSync(LOG_DIR)
      .filter(f => f.endsWith('.log'))
      .map(f => ({ name: f, path: path.join(LOG_DIR, f) }));

    for (const file of files) {
      try {
        const stat = fs.statSync(file.path);
        const age = now - stat.mtimeMs;

        if (age > maxAge) {
          fs.unlinkSync(file.path);
          console.log(`[Logger] 删除过期日志：${file.name} (${Math.round(age / (24 * 60 * 60 * 1000))} 天前)`);
        }
      } catch (err) {
        // 忽略单个文件处理错误
      }
    }
  } catch (err) {
    console.error(`[Logger] 清理日志失败：${err}`);
  }
}

/**
 * 确保日志目录存在并初始化
 */
function ensureLogDirectory(): void {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

// 初始化：确保目录存在并清理旧日志
ensureLogDirectory();
cleanupOldLogs();

// ============================================================================
// 日志配置
// ============================================================================

const LOG_FILE = getTodayLogFile(); // 今天的日志文件
const LOG_TO_FILE = true; // 始终启用文件日志

// 日志级别颜色
const COLORS = {
  [LogLevel.DEBUG]: '\x1b[36m',    // Cyan
  [LogLevel.INFO]: '\x1b[32m',     // Green
  [LogLevel.WARN]: '\x1b[33m',     // Yellow
  [LogLevel.ERROR]: '\x1b[31m',    // Red
  RESET: '\x1b[0m',
};

// 日志级别字符串
const LEVEL_STRINGS = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
};

// ============================================================================
// 日志工具函数
// ============================================================================

function parseLogLevel(level: string): LogLevel {
  const upper = level.toUpperCase();
  switch (upper) {
    case 'DEBUG': return LogLevel.DEBUG;
    case 'INFO': return LogLevel.INFO;
    case 'WARN': return LogLevel.WARN;
    case 'ERROR': return LogLevel.ERROR;
    default: return LogLevel.DEBUG;
  }
}

function formatTimestamp(): string {
  const now = new Date();
  // 转换为北京时间 (UTC+8)
  const beijingTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  return beijingTime.toISOString().replace('T', ' ').replace('Z', '');
}

function formatModule(module: string): string {
  return module.padEnd(12, ' ');
}

function formatMessage(msg: unknown): string {
  if (typeof msg === 'string') return msg;
  if (msg instanceof Error) return msg.message;
  return JSON.stringify(msg, null, 2);
}

function formatObject(obj: unknown, indent = 0): string {
  const spaces = '  '.repeat(indent);
  if (obj === null || obj === undefined) return `${spaces}${obj}`;
  if (typeof obj === 'string') return `${spaces}"${obj}"`;
  if (typeof obj === 'number' || typeof obj === 'boolean') return `${spaces}${obj}`;
  if (Array.isArray(obj)) {
    if (obj.length === 0) return `${spaces}[]`;
    const items = obj.map(item => formatObject(item, indent + 1)).join(',\n');
    return `${spaces}[\n${items}\n${'  '.repeat(indent)}]`;
  }
  if (typeof obj === 'object') {
    const keys = Object.entries(obj as object);
    if (keys.length === 0) return `${spaces}{}`;
    const items = keys.map(([k, v]) => {
      const value = formatObject(v, indent + 1);
      return `${'  '.repeat(indent + 1)}"${k}": ${value}`;
    }).join(',\n');
    return `${spaces}{\n${items}\n${'  '.repeat(indent)}}`;
  }
  return `${spaces}${String(obj)}`;
}

// ============================================================================
// 日志文件操作
// ============================================================================

// 记录当前日志文件日期，每天首次写入时检查轮转
let currentLogDate = new Date().toISOString().split('T')[0];

function checkLogRotation(): void {
  const today = new Date().toISOString().split('T')[0];
  if (today !== currentLogDate) {
    // 日期变更，清理旧日志并更新文件路径
    cleanupOldLogs();
    currentLogDate = today;
  }
}

function writeToConsole(level: LogLevel, module: string, message: string, details?: string) {
  const timestamp = formatTimestamp();
  const levelStr = LEVEL_STRINGS[level];
  const color = COLORS[level];
  const reset = COLORS.RESET;

  let output = `${color}[${timestamp}] [${levelStr}] [${formatModule(module)}]${reset} ${message}`;
  if (details) {
    output += `\n${details}`;
  }

  if (level === LogLevel.ERROR) {
    console.error(output);
  } else {
    console.log(output);
  }
}

function writeToFile(level: LogLevel, module: string, message: string, details?: string) {
  checkLogRotation();

  const timestamp = formatTimestamp();
  const levelStr = LEVEL_STRINGS[level];

  let logLine = `[${timestamp}] [${levelStr}] [${module}] ${message}`;
  if (details) {
    logLine += `\n${details}`;
  }
  logLine += '\n';

  try {
    fs.appendFileSync(LOG_FILE, logLine);
  } catch (err) {
    // 文件写入失败时不抛出异常，避免影响主流程
    console.error(`[Logger] Failed to write to log file: ${err}`);
  }
}

// ============================================================================
// Logger 类
// ============================================================================

export class Logger {
  private module: string;

  constructor(module: string) {
    this.module = module;
  }

  debug(message: string, data?: unknown): void {
    if (LOG_LEVEL <= LogLevel.DEBUG) {
      const details = data !== undefined ? formatObject(data) : undefined;
      writeToConsole(LogLevel.DEBUG, this.module, message, details);
      writeToFile(LogLevel.DEBUG, this.module, message, details);
    }
  }

  info(message: string, data?: unknown): void {
    if (LOG_LEVEL <= LogLevel.INFO) {
      const details = data !== undefined ? formatObject(data) : undefined;
      writeToConsole(LogLevel.INFO, this.module, message, details);
      writeToFile(LogLevel.INFO, this.module, message, details);
    }
  }

  warn(message: string, data?: unknown): void {
    if (LOG_LEVEL <= LogLevel.WARN) {
      const details = data !== undefined ? formatObject(data) : undefined;
      writeToConsole(LogLevel.WARN, this.module, message, details);
      writeToFile(LogLevel.WARN, this.module, message, details);
    }
  }

  error(message: string, data?: unknown): void {
    const details = data !== undefined ? formatObject(data) : undefined;
    writeToConsole(LogLevel.ERROR, this.module, message, details);
    writeToFile(LogLevel.ERROR, this.module, message, details);
  }

  /**
   * 打印请求/响应的详细信息
   */
  request(method: string, endpoint: string, body?: unknown): void {
    this.debug(`→ ${method} ${endpoint}`, body);
  }

  response(endpoint: string, status: number, body?: unknown): void {
    this.debug(`← ${endpoint} (${status})`, body);
  }

  /**
   * 打印函数调用的输入输出
   */
  call(funcName: string, input?: unknown): void {
    this.debug(`[CALL] ${funcName}`, input ? { input } : undefined);
  }

  ret(funcName: string, output?: unknown, duration?: number): void {
    const data = output !== undefined ? { output } : {};
    if (duration !== undefined) {
      (data as any).duration = `${duration}ms`;
    }
    this.debug(`[RET] ${funcName}`, Object.keys(data).length > 0 ? data : undefined);
  }
}

// ============================================================================
// 导出工厂函数
// ============================================================================

export function createLogger(module: string): Logger {
  return new Logger(module);
}

// 导出日志目录路径（供外部使用）
export { LOG_DIR, LOG_RETENTION_DAYS };

// 默认导出
export default createLogger;
