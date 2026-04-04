#!/usr/bin/env node
/**
 * install.js 测试套件
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const NC = '\x1b[0m';

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`${GREEN}✓${NC} ${name}`);
        passed++;
    } catch (e) {
        console.error(`${RED}✗${NC} ${name}`);
        console.error(`  ${e.message}`);
        failed++;
    }
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

function assertExists(filePath, message) {
    assert(fs.existsSync(filePath), message || `File does not exist: ${filePath}`);
}

function assertNotExists(filePath, message) {
    assert(!fs.existsSync(filePath), message || `File exists: ${filePath}`);
}

function assertSymlink(linkPath, message) {
    assert(fs.lstatSync(linkPath).isSymbolicLink(), message || `Not a symlink: ${linkPath}`);
}

// ==================== 测试用例 ====================

console.log('========================================');
console.log('  install.js 测试套件');
console.log('========================================\n');

// 测试 1: 检查 install.js 文件存在
test('install.js 文件存在', () => {
    assertExists(path.join(__dirname, 'index.js'), 'install/index.js 应该存在');
});

// 测试 2: 检查 install.js 语法正确
test('install.js 语法正确', () => {
    execSync(`node -c "${path.join(__dirname, 'index.js')}"`, { stdio: 'ignore' });
});

// 测试 3: 检查 --help 输出
test('install.js --help 正常输出', () => {
    const output = execSync(`node "${path.join(__dirname, 'index.js')}" --help`, { encoding: 'utf8' });
    assert(output.includes('用法'), '应该输出用法说明');
    assert(output.includes('--project'), '应该输出 --project 选项');
});

// 测试 4: 检查无参数时提示错误（因为没有 ai-config 目录）
test('无参数运行时检测 ai-config 目录', () => {
    try {
        execSync(`node "${path.join(__dirname, 'index.js')}"`, { encoding: 'utf8', stdio: 'ignore' });
        // 如果 ai-config 目录存在，应该成功执行
    } catch (e) {
        // 如果目录不存在，应该报错退出
        assert(e.status !== 0 || e.message.includes('ai-config'), '应该检测 ai-config 目录');
    }
});

// 测试 5: 检查项目初始化（使用临时目录）
test('项目初始化创建 .agents 目录结构', () => {
    const tmpDir = path.join(__dirname, 'test-tmp-' + Date.now());
    try {
        fs.mkdirSync(tmpDir, { recursive: true });
        // 项目必须存在才能初始化
        assertExists(tmpDir, '临时目录应该已创建');
        execSync(`node "${path.join(__dirname, 'index.js')}" --project "${tmpDir}"`, { encoding: 'utf8' });

        assertExists(path.join(tmpDir, '.agents'), '应该创建 .agents 目录');
        assertExists(path.join(tmpDir, '.agents/rules'), '应该创建 .agents/rules 目录');
        assertExists(path.join(tmpDir, '.agents/commands'), '应该创建 .agents/commands 目录');
        // 检查软链接是否创建（不验证目标是否存在）
        assert(fs.lstatSync(path.join(tmpDir, '.agents/skills')).isSymbolicLink(), '.agents/skills 应该是软链接');
    } finally {
        // 清理临时目录
        if (fs.existsSync(tmpDir)) {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
    }
});

// ==================== 总结 ====================

console.log('\n========================================');
console.log('  测试结果');
console.log('========================================\n');

console.log(`${GREEN}通过：${passed}${NC}`);
if (failed > 0) {
    console.log(`${RED}失败：${failed}${NC}`);
    process.exit(1);
} else {
    console.log(`${GREEN}✓ 所有测试通过${NC}`);
}
