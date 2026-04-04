/**
 * 飞书 Bot 入口 - 长连接模式
 */

// 加载环境变量
import 'dotenv/config';

import "./server.js";

// 健康检查服务器（可选，用于部署监控）
import express from "express";
import { createLogger } from "./logger.js";

const log = createLogger("index");

const app = express();
const PORT = process.env.PORT || 5070;

app.get("/health", (req, res) => {
  res.json({ status: "ok", mode: "websocket" });
});

app.get("/", (req, res) => {
  res.json({
    name: "feishu-bridge",
    mode: "websocket",
    status: "running",
  });
});

const server = app.listen(PORT, () => {
  log.info("健康检查端点启动", { port: PORT, url: `http://localhost:${PORT}/health` });
});

// 优雅关闭
process.on('SIGINT', () => {
  log.info("收到 SIGINT，关闭服务器...");
  server.close(() => {
    log.info("健康检查服务器已关闭");
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  log.info("收到 SIGTERM，关闭服务器...");
  server.close(() => {
    log.info("健康检查服务器已关闭");
    process.exit(0);
  });
});

// 错误处理
server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    log.error(`端口 ${PORT} 已被占用，可能已有实例在运行`);
  } else {
    log.error(`服务器错误：${err.message}`);
  }
  process.exit(1);
});
