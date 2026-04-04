#!/bin/bash
# 飞书 Bot 桥接服务 - 启动脚本

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 检查 node_modules
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  pnpm install
fi

# 检查并停止已有进程
PORT=${PORT:-5070}
PID=$(lsof -ti :$PORT 2>/dev/null)
if [ -n "$PID" ]; then
  echo "Stopping existing process on port $PORT (PID: $PID)..."
  kill $PID 2>/dev/null
  sleep 1
  # 确认是否停止
  if lsof -ti :$PORT >/dev/null 2>&1; then
    echo "Force killing..."
    kill -9 $PID 2>/dev/null
  fi
fi

# 启动服务
echo "Starting feishu-bridge server..."
pnpm dev
