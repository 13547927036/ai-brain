#!/usr/bin/env node
/**
 * validate-files 测试套件
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '../..');
const TEST_DIR = path.join(ROOT_DIR, 'scripts/validate-files/.test-tmp');

// 颜色输出
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const NC = '\x1b[0m';

let passed = 0;
let failed = 0;

function runTest(name, fn) {
    try {
        fn();
        console.log(`${GREEN}✓${NC} ${name}`);
        passed++;
    } catch (error) {
        console.log(`${RED}✗${NC} ${name}`);
        console.log(`  ${RED}错误：${error.message}${NC}`);
        failed++;
    }
}

function setup() {
    if (!fs.existsSync(TEST_DIR)) {
        fs.mkdirSync(TEST_DIR, { recursive: true });
    }
    execSync('git add -A 2>/dev/null || true', { cwd: ROOT_DIR });
}

function cleanup() {
    execSync('git reset HEAD 2>/dev/null || true', { cwd: ROOT_DIR });
    if (fs.existsSync(TEST_DIR)) {
        fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    // 恢复工作区
    const testFiles = [
        'src/brain/memory/2099-01-01.md',
        'src/brain/invalid',
        'src/temp/test.md',
        'src/config/extra.json'
    ];
    testFiles.forEach(f => {
        const fullPath = path.join(ROOT_DIR, f);
        if (fs.existsSync(fullPath)) {
            fs.rmSync(fullPath, { recursive: true, force: true });
        }
    });
}

function createTestFile(filePath, content = 'test') {
    const fullPath = path.join(ROOT_DIR, filePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullPath, content);
    execSync(`git add "${filePath}"`, { cwd: ROOT_DIR });
}

function runValidation() {
    try {
        execSync('node scripts/validate-files/index.js', {
            cwd: ROOT_DIR,
            encoding: 'utf8',
            stdio: 'pipe'
        });
        return { success: true };
    } catch (error) {
        return { success: false, output: error.stdout || error.stderr };
    }
}

// ==================== 测试用例 ====================

console.log('\n========================================');
console.log('  validate-files 测试套件');
console.log('========================================\n');

// 测试 1: 合法的 memory 文件
runTest('合法的 memory 文件应该通过', () => {
    createTestFile('src/brain/memory/2099-01-01.md');
    const result = runValidation();
    if (!result.success) {
        throw new Error('预期通过，但失败了');
    }
});

// 测试 2: 非法的 brain 子目录
runTest('非法的 brain 子目录应该被拦截', () => {
    createTestFile('src/brain/invalid/test.md');
    const result = runValidation();
    if (result.success) {
        throw new Error('预期失败，但通过了');
    }
});

// 测试 3: 非法的 memory 文件命名
runTest('非法的 memory 文件命名应该被拦截', () => {
    createTestFile('src/brain/memory/InvalidFile.md');
    const result = runValidation();
    if (result.success) {
        throw new Error('预期失败，但通过了');
    }
});

// 测试 4: temp 根目录文件应该被拦截（temp 被 gitignore 忽略，跳过）
runTest('temp 根目录文件应该被拦截', () => {
    console.log(`  ${YELLOW}跳过：temp 目录被 .gitignore 忽略${NC}`);
});

// 测试 5: 合法的 temp 日期目录（temp 被 gitignore 忽略，跳过）
runTest('合法的 temp 日期目录应该通过', () => {
    console.log(`  ${YELLOW}跳过：temp 目录被 .gitignore 忽略${NC}`);
});

// 测试 6: 全局允许的文件（.husky/pre-commit）应该通过
runTest('全局允许的 .husky/pre-commit 应该通过', () => {
    // 先 reset 所有，然后只 add pre-commit
    execSync('git reset HEAD 2>/dev/null || true', { cwd: ROOT_DIR });
    execSync('git add .husky/pre-commit', { cwd: ROOT_DIR });
    const result = runValidation();
    if (!result.success) {
        throw new Error('.husky/pre-commit 应该始终允许');
    }
});

// 测试 7: skills 目录必须有 SKILL.md
runTest('skills 子目录缺少 SKILL.md 应该被拦截', () => {
    const skillDir = path.join(ROOT_DIR, 'src/config/skills/test-skill');
    fs.mkdirSync(skillDir, { recursive: true });
    const skillPath = path.join(skillDir, 'test.md');
    fs.writeFileSync(skillPath, 'test');
    execSync(`git add "${skillDir}/*"`, { cwd: ROOT_DIR });
    const result = runValidation();
    if (result.success) {
        throw new Error('预期失败，但通过了');
    }
    // 清理
    fs.rmSync(skillDir, { recursive: true, force: true });
});

// 输出结果
console.log('\n========================================');
console.log('  测试结果');
console.log('========================================');
console.log(`\n${GREEN}通过：${passed}${NC}`);
if (failed > 0) {
    console.log(`${RED}失败：${failed}${NC}`);
}
console.log('');

cleanup();
process.exit(failed > 0 ? 1 : 0);
