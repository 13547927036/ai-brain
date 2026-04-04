#!/usr/bin/env node
/**
 * Git Pre-commit 文件验证脚本
 * 验证暂存区文件是否在允许的路径中
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.join(__dirname, '../..');
const CONFIG_FILE = path.join(__dirname, 'allowed-files.js');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const NC = '\x1b[0m';

function getStagedFiles() {
    try {
        const output = execSync('git diff --cached --name-status', { encoding: 'utf8' });
        const lines = output.trim().split('\n').filter(l => l.length > 0);
        const files = [];
        for (const line of lines) {
            const parts = line.split(/\s+/);
            const status = parts[0];
            let file = parts.slice(1).join(' ');
            // 跳过已删除的文件
            if (status.startsWith('D')) continue;
            // 处理 Git 的转义文件名（中文等字符会被转义）
            if (file.startsWith('"') && file.endsWith('"')) {
                file = file.slice(1, -1).replace(/\\([0-9]{3})/g, (_, octal) => {
                    return String.fromCharCode(parseInt(octal, 8));
                });
            }
            if (file) files.push(file);
        }
        return files;
    } catch (error) {
        console.error(`${RED}错误：无法获取暂存区文件${NC}`);
        process.exit(1);
    }
}

function loadConfig() {
    if (!fs.existsSync(CONFIG_FILE)) {
        console.error(`${RED}错误：配置文件不存在 ${CONFIG_FILE}${NC}`);
        process.exit(1);
    }
    return require(CONFIG_FILE);
}

// 简单的 glob 模式匹配
function matchPattern(filePath, pattern) {
    if (pattern.includes('*')) {
        // 先替换 ** 为占位符，再替换 *，最后恢复 **
        let regexStr = pattern.replace(/\*\*/g, '__DOUBLESTAR__').replace(/\*/g, '[^/]*').replace(/__DOUBLESTAR__/g, '.*');
        return new RegExp(`^${regexStr}$`).test(filePath);
    }
    return filePath === pattern;
}

function checkGlobalAllow(filePath, globalAllow) {
    if (!globalAllow || !globalAllow.alwaysAllow) return false;
    return globalAllow.alwaysAllow.some(pattern => matchPattern(filePath, pattern));
}

function validateAllowedPaths(files, allowedPaths, globalAllow) {
    const errors = [];

    for (const file of files) {
        let allowed = checkGlobalAllow(file, globalAllow);

        if (!allowed && allowedPaths) {
            for (const [dir, patterns] of Object.entries(allowedPaths)) {
                // 如果 patterns 是 true，表示该目录下所有文件都允许
                if (patterns === true) {
                    if (file === dir || file.startsWith(dir + '/')) {
                        allowed = true;
                        break;
                    }
                }

                if (dir === '' || dir === '.') {
                    if (!file.includes('/')) {
                        allowed = patterns.some(p => matchPattern(file, p));
                    }
                } else if (file === dir || file.startsWith(dir + '/')) {
                    const relativePath = file === dir ? '' : file.slice(dir.length + 1);
                    if (relativePath && patterns.some(p => matchPattern(relativePath, p))) {
                        allowed = true;
                    }
                }
                if (allowed) break;
            }
        }

        if (!allowed) {
            errors.push(`文件不在允许提交的路径中：${file}`);
        }
    }

    return errors;
}

function main() {
    console.log('========================================');
    console.log('  Pre-commit 文件校验');
    console.log('========================================\n');

    const config = loadConfig();
    const stagedFiles = getStagedFiles();

    if (stagedFiles.length === 0) {
        console.log(`${GREEN}✓ 无暂存文件，跳过验证${NC}`);
        process.exit(0);
    }

    const errors = validateAllowedPaths(stagedFiles, config.allowedPaths, config.global);

    console.log('========================================');
    console.log('  校验结果');
    console.log('========================================\n');

    if (errors.length > 0) {
        console.error(`${RED}发现 ${errors.length} 个错误，提交被拒绝${NC}\n`);
        errors.forEach(err => console.error(`${RED}  ❌ ${err}${NC}`));
        console.error(`\n${YELLOW}修复配置：scripts/validate-files/allowed-files.json${NC}`);
        process.exit(1);
    }

    console.log(`${GREEN}✓ 所有校验通过，允许提交${NC}`);
    process.exit(0);
}

main();
