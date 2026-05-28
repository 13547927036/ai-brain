#!/bin/bash
# 自动推送脚本 - 用于 ai-brain 仓库
# 用法：./auto-push.sh [提交信息]

cd "$(dirname "$0")"

# 默认提交信息
MESSAGE="${1:-auto: 更新项目}"

# 检查是否在仓库目录
if [ ! -d ".git" ]; then
    echo "错误：不在 git 仓库目录"
    exit 1
fi

# 添加所有更改
git add -A

# 检查是否有更改
if git diff --cached --quiet; then
    echo "没有更改需要提交"
    exit 0
fi

# 提交并推送
git commit -m "$MESSAGE"
git push origin main

echo "✅ 推送完成"
