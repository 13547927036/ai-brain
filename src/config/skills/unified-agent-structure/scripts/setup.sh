#!/bin/bash
# Unified Agent Directory Structure Setup Script
# 为 Cursor、Claude Code、Codex 创建统一的 Agent 配置目录

set -e

PROJECT_ROOT="$(pwd)"
AGENTS_DIR="$PROJECT_ROOT/.agents"

echo "🔧 开始设置统一 Agent 目录架构..."

# 步骤 1：创建 .agents 目录
echo "📁 创建 .agents 目录结构..."
mkdir -p "$AGENTS_DIR/rules" "$AGENTS_DIR/skills" "$AGENTS_DIR/commands"

# 步骤 2：迁移现有配置（如果有）
echo "📦 检查并迁移现有配置..."
for dir in .cursor .claude .codex; do
  DIR_PATH="$PROJECT_ROOT/$dir"
  if [[ -d "$DIR_PATH" ]]; then
    # 迁移 rules
    if [[ -d "$DIR_PATH/rules" ]] && [[ ! -L "$DIR_PATH/rules" ]]; then
      echo "   → 迁移 $dir/rules 到 .agents/rules"
      cp -r "$DIR_PATH/rules"/* "$AGENTS_DIR/rules/" 2>/dev/null || true
      rm -rf "$DIR_PATH/rules"
    fi
    # 迁移 skills
    if [[ -d "$DIR_PATH/skills" ]] && [[ ! -L "$DIR_PATH/skills" ]]; then
      echo "   → 迁移 $dir/skills 到 .agents/skills"
      cp -r "$DIR_PATH/skills"/* "$AGENTS_DIR/skills/" 2>/dev/null || true
      rm -rf "$DIR_PATH/skills"
    fi
    # 迁移 commands
    if [[ -d "$DIR_PATH/commands" ]] && [[ ! -L "$DIR_PATH/commands" ]]; then
      echo "   → 迁移 $dir/commands 到 .agents/commands"
      cp -r "$DIR_PATH/commands"/* "$AGENTS_DIR/commands/" 2>/dev/null || true
      rm -rf "$DIR_PATH/commands"
    fi
  fi
done

# 步骤 3：创建软链接
echo "🔗 创建软链接..."
for dir in .cursor .claude .codex; do
  DIR_PATH="$PROJECT_ROOT/$dir"
  mkdir -p "$DIR_PATH"

  # 检查并创建 rules 软链接
  if [[ ! -L "$DIR_PATH/rules" ]]; then
    ln -s ../.agents/rules "$DIR_PATH/rules"
    echo "   → $dir/rules -> ../.agents/rules"
  fi

  # 检查并创建 skills 软链接
  if [[ ! -L "$DIR_PATH/skills" ]]; then
    ln -s ../.agents/skills "$DIR_PATH/skills"
    echo "   → $dir/skills -> ../.agents/skills"
  fi

  # 检查并创建 commands 软链接
  if [[ ! -L "$DIR_PATH/commands" ]]; then
    ln -s ../.agents/commands "$DIR_PATH/commands"
    echo "   → $dir/commands -> ../.agents/commands"
  fi
done

# 步骤 4：验证并报告
echo ""
echo "✅ .agents 目录结构已就绪"
echo "✅ 已为以下 Agent 创建软链接：Cursor, Claude Code, Codex"
echo ""
echo "📝 下一步："
echo "   1. 检查 .gitignore 是否已忽略软链接目录"
echo "   2. 在 .agents/rules/、skills/、commands/ 中添加配置文件"
