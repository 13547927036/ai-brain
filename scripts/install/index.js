#!/usr/bin/env node
/**
 * AI Config 安装脚本
 * 用途：
 *   1. 全局安装：将 ~/.claude/ 配置链接到 ai-config/
 *   2. 项目初始化：为指定项目创建 .agents 统一配置目录
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const NC = '\x1b[0m';

// ==================== 配置 ====================

const AI_CONFIG_DIR = process.env.AI_CONFIG_DIR || path.join(process.env.HOME, 'work/data/project/ai-config');
const CLAUDE_DIR = process.env.CLAUDE_DIR || path.join(process.env.HOME, '.claude');
const CODEX_DIR = process.env.CODEX_DIR || path.join(process.env.HOME, '.codex');
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(CLAUDE_DIR, 'backups', `pre-ai-config-${Date.now()}`);

// ==================== 辅助函数 ====================

function migrateFile(src, dest, desc) {
    if (fs.lstatSync(src).isSymbolicLink()) {
        console.log(`   ⏭️  跳过 ${desc}（已是软链接，无需迁移）`);
        return;
    }
    if (fs.existsSync(src)) {
        console.log(`   📦 迁移 ${desc} -> ${dest}`);
        fs.renameSync(src, dest);
    } else {
        console.log(`   ⏭️  跳过 ${desc}（文件不存在）`);
    }
}

function migrateDir(src, dest, desc) {
    if (fs.lstatSync(src).isSymbolicLink()) {
        console.log(`   ⏭️  跳过 ${desc}（已是软链接，无需迁移）`);
        return;
    }
    if (fs.existsSync(src)) {
        console.log(`   📦 迁移 ${desc} -> ${dest}`);
        if (fs.existsSync(dest)) {
            fs.cpSync(src, dest, { recursive: true, force: true });
            fs.rmSync(src, { recursive: true, force: true });
        } else {
            fs.renameSync(src, dest);
        }
    } else {
        console.log(`   ⏭️  跳过 ${desc}（目录不存在）`);
    }
}

function createLink(target, link, desc) {
    // 目标不存在时创建父目录
    const linkDir = path.dirname(link);
    if (!fs.existsSync(linkDir)) {
        fs.mkdirSync(linkDir, { recursive: true });
    }

    // 检查链接是否已存在
    const exists = fs.existsSync(link);
    const isSymlink = exists && fs.lstatSync(link).isSymbolicLink();

    if (isSymlink) {
        console.log(`   ⏭️  跳过 ${desc}（已是软链接）`);
        return;
    }
    if (exists) {
        console.log(`   ⚠️  ${desc} 已存在且不是软链接，删除后创建链接`);
        fs.rmSync(link, { recursive: true, force: true });
    }
    fs.symlinkSync(target, link);
    console.log(`   ✅ 已创建 ${desc} -> ${target}`);
}

function ensureShellShortcuts() {
    const shellRc = path.join(process.env.HOME, '.zshrc');
    const markerStart = '# >>> ai-config shortcuts >>>';
    const markerEnd = '# <<< ai-config shortcuts <<<';

    let content = fs.existsSync(shellRc) ? fs.readFileSync(shellRc, 'utf8') : '';
    const lines = content.split('\n');
    const filtered = [];
    let skip = false;

    for (const line of lines) {
        if (line === markerStart) { skip = true; continue; }
        if (line === markerEnd) { skip = false; continue; }
        if (!skip) filtered.push(line);
    }

    const shortcuts = [
        markerStart,
        '# `claude -skip` => `claude --dangerously-skip-permissions`',
        'alias -g -- -skip=\'--dangerously-skip-permissions\'',
        '',
        '# `codex -skip` => `codex --dangerously-bypass-approvals-and-sandbox`',
        'codex() {',
        '  if [[ "$1" == "--dangerously-skip-permissions" ]]; then',
        '    shift',
        '    command codex --dangerously-bypass-approvals-and-sandbox "$@"',
        '  else',
        '    command codex "$@"',
        '  fi',
        '}',
        markerEnd,
    ];

    fs.writeFileSync(shellRc, [...filtered, ...shortcuts].join('\n'));
    console.log(`   ✅ 已更新 shell 快捷命令到 ${shellRc}`);
    console.log('      - claude -skip');
    console.log('      - codex -skip -> codex --dangerously-bypass-approvals-and-sandbox');
}

// ==================== 全局安装 ====================

function doGlobalInstall() {
    console.log('🔧 开始全局安装 AI Config...');
    console.log('');

    if (!fs.existsSync(AI_CONFIG_DIR)) {
        console.error(`${RED}❌ 错误：ai-config 目录不存在${NC}`);
        console.error(`   位置：${AI_CONFIG_DIR}`);
        console.error('');
        console.error('   如果是首次设置，请先创建仓库：');
        console.error(`   git clone git@github.com:imoo666/ai-config.git ${AI_CONFIG_DIR}`);
        process.exit(1);
    }

    if (!fs.existsSync(CLAUDE_DIR)) {
        console.error(`${RED}❌ 错误：~/.claude 目录不存在${NC}`);
        console.error('   请先安装 Claude Code');
        process.exit(1);
    }

    if (!fs.existsSync(CODEX_DIR)) {
        console.log('📁 创建 ~/.codex 目录...');
        fs.mkdirSync(CODEX_DIR, { recursive: true });
    }

    console.log('📁 备份现有配置...');
    fs.mkdirSync(BACKUP_DIR, { recursive: true });

    console.log('');
    console.log('📦 迁移现有配置到 ai-config...');

    if (fs.existsSync(path.join(CLAUDE_DIR, 'CLAUDE.md')) && !fs.lstatSync(path.join(CLAUDE_DIR, 'CLAUDE.md')).isSymbolicLink()) {
        migrateFile(path.join(CLAUDE_DIR, 'CLAUDE.md'), path.join(AI_CONFIG_DIR, 'brain/claude.md'), 'CLAUDE.md');
    }

    if (fs.existsSync(path.join(CLAUDE_DIR, 'settings.json')) && !fs.lstatSync(path.join(CLAUDE_DIR, 'settings.json')).isSymbolicLink()) {
        const aiConfigSettings = path.join(AI_CONFIG_DIR, 'src/config/settings.json');
        if (fs.existsSync(aiConfigSettings)) {
            console.log('   ⚠️  ai-config 中已有 settings.json，保留本地版本到 backup');
            fs.copyFileSync(path.join(CLAUDE_DIR, 'settings.json'), path.join(BACKUP_DIR, 'settings.json.local'));
            fs.unlinkSync(path.join(CLAUDE_DIR, 'settings.json'));
        } else {
            migrateFile(path.join(CLAUDE_DIR, 'settings.json'), aiConfigSettings, 'settings.json');
        }
    }

    if (fs.existsSync(path.join(CLAUDE_DIR, 'skills')) && !fs.lstatSync(path.join(CLAUDE_DIR, 'skills')).isSymbolicLink()) {
        migrateDir(path.join(CLAUDE_DIR, 'skills'), path.join(AI_CONFIG_DIR, 'src/config/skills'), 'skills 目录');
    }

    if (fs.existsSync(path.join(CLAUDE_DIR, 'memory')) && !fs.lstatSync(path.join(CLAUDE_DIR, 'memory')).isSymbolicLink()) {
        console.log('   📦 迁移 memory 目录 -> brain/...');
        const brainDir = path.join(AI_CONFIG_DIR, 'src/brain');
        if (fs.existsSync(brainDir)) {
            fs.cpSync(path.join(CLAUDE_DIR, 'memory'), brainDir, { recursive: true, force: true });
            fs.rmSync(path.join(CLAUDE_DIR, 'memory'), { recursive: true, force: true });
        } else {
            fs.renameSync(path.join(CLAUDE_DIR, 'memory'), brainDir);
        }
    }

    console.log('');
    console.log('🔗 创建软链接...');

    createLink(path.join(AI_CONFIG_DIR, 'src/brain/claude.md'), path.join(CLAUDE_DIR, 'CLAUDE.md'), 'CLAUDE.md');
    createLink(path.join(AI_CONFIG_DIR, 'src/config/settings.json'), path.join(CLAUDE_DIR, 'settings.json'), 'settings.json');
    createLink(path.join(AI_CONFIG_DIR, 'src/config/skills'), path.join(CLAUDE_DIR, 'skills'), 'skills');
    createLink(path.join(AI_CONFIG_DIR, 'src/brain'), path.join(CLAUDE_DIR, 'memory'), 'memory');
    createLink(path.join(AI_CONFIG_DIR, 'src/brain/claude.md'), path.join(CODEX_DIR, 'AGENTS.md'), '~/.codex/AGENTS.md');

    console.log('');
    console.log('📦 安装依赖...');

    const skillsDir = path.join(AI_CONFIG_DIR, 'src/config/skills');
    if (fs.existsSync(skillsDir)) {
        for (const skillDir of fs.readdirSync(skillsDir)) {
            const pkgJson = path.join(skillsDir, skillDir, 'package.json');
            if (fs.existsSync(pkgJson)) {
                console.log(`   📦 安装 ${skillDir} 依赖...`);
                try {
                    execSync(`cd "${path.join(skillsDir, skillDir)}" && pnpm install --ignore-scripts`, { stdio: 'ignore' });
                } catch (e) {
                    console.log(`   ⚠️  ${skillDir} 依赖安装失败，可稍后手动执行：cd ${path.join(skillsDir, skillDir)} && pnpm install`);
                }
            }
        }
    }

    console.log('');
    console.log('⌨️  配置 shell 快捷命令...');
    ensureShellShortcuts();

    console.log('');
    console.log(`${GREEN}✅ AI Config 全局安装完成！${NC}`);
    console.log('');
    console.log('📝 验证：');
    console.log(`   ls -la ${path.join(CLAUDE_DIR, 'CLAUDE.md')}`);
    console.log(`   ls -la ${path.join(CLAUDE_DIR, 'settings.json')}`);
    console.log(`   ls -la ${path.join(CLAUDE_DIR, 'skills')}`);
    console.log(`   ls -la ${path.join(CLAUDE_DIR, 'memory')}`);
    console.log(`   ls -la ${path.join(CODEX_DIR, 'AGENTS.md')}`);
    console.log('   source ~/.zshrc');
    console.log('   claude -skip');
    console.log('   codex -skip');
    console.log('');
    console.log(`📂 备份位置：${BACKUP_DIR}`);
    console.log('');
}

// ==================== 项目初始化 ====================

function doProjectInit(projectPath) {
    if (!path.isAbsolute(projectPath)) {
        projectPath = path.join(process.cwd(), projectPath);
    }

    console.log(`🔧 开始初始化项目：${projectPath}`);
    console.log('');

    if (!fs.existsSync(projectPath)) {
        console.error(`${RED}❌ 错误：项目目录不存在${NC}`);
        process.exit(1);
    }

    const projectAgentsDir = path.join(projectPath, '.agents');
    const projectCodexDir = path.join(projectPath, '.codex');

    console.log('📁 创建 .agents 目录结构...');
    fs.mkdirSync(path.join(projectAgentsDir, 'rules'), { recursive: true });
    fs.mkdirSync(path.join(projectAgentsDir, 'commands'), { recursive: true });
    fs.mkdirSync(projectCodexDir, { recursive: true });

    console.log('');
    console.log('🔗 创建软链接...');

    createLink(path.join(AI_CONFIG_DIR, 'src/config/skills'), path.join(projectAgentsDir, 'skills'), '.agents/skills');
    createLink(path.join(AI_CONFIG_DIR, 'src/brain/claude.md'), path.join(projectAgentsDir, 'rules/AGENTS.md'), '.agents/rules/AGENTS.md');

    console.log('');
    console.log('🔗 为 Agent 创建软链接...');

    createLink('../.agents/rules', path.join(projectPath, 'AGENTS.md'), '项目根 AGENTS.md');

    for (const agentDir of ['.claude', '.cursor', '.codex']) {
        const agentPath = path.join(projectPath, agentDir);
        const exists = fs.existsSync(agentPath);
        const isSymlink = exists && fs.lstatSync(agentPath).isSymbolicLink();
        if (exists || isSymlink) {
            createLink('../.agents/rules', path.join(agentPath, 'rules'), `${agentDir}/rules`);
            createLink('../.agents/skills', path.join(agentPath, 'skills'), `${agentDir}/skills`);
            createLink('../.agents/commands', path.join(agentPath, 'commands'), `${agentDir}/commands`);
        } else {
            console.log(`   ⏭️  跳过 ${agentDir}（目录不存在）`);
        }
    }

    console.log('');
    console.log(`${GREEN}✅ 项目初始化完成！${NC}`);
    console.log('');
    console.log('📁 目录结构：');
    console.log(`   ${projectAgentsDir}/`);
    console.log('   ├── rules/');
    console.log(`   ├── skills -> ${path.join(AI_CONFIG_DIR, 'src/config/skills')}`);
    console.log('   └── commands/');
    console.log(`   ${path.join(projectPath, 'AGENTS.md')} -> .agents/rules/AGENTS.md`);
}

// ==================== 主程序 ====================

const args = process.argv.slice(2);

if (args.length === 0) {
    doGlobalInstall();
} else if (args[0] === '--project') {
    if (!args[1]) {
        console.error(`${RED}❌ 错误：--project 需要指定项目路径${NC}`);
        process.exit(1);
    }
    doProjectInit(args[1]);
} else if (args[0] === '-h' || args[0] === '--help') {
    console.log('用法：node install.js [选项]');
    console.log('');
    console.log('选项：');
    console.log('   (无参数)              全局安装 AI Config 到 ~/.claude');
    console.log('   --project <路径>      初始化指定项目的 .agents 目录');
    console.log('');
    console.log('示例：');
    console.log('   node install.js                              # 全局安装');
    console.log('   node install.js --project ~/my-project       # 项目初始化');
} else {
    console.error(`${RED}❌ 未知参数：${args[0]}${NC}`);
    process.exit(1);
}
