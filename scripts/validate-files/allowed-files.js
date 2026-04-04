module.exports = {
  allowedPaths: {
    '.': ['claude.md', '.gitignore'],
    'src': ['claude.md'],
    'src/brain': ['claude.md'],
    'src/brain/memory': ['*.md'],
    'src/brain/knowledge': ['*.md'],
    'src/brain/notes': ['*.md'],
    'src/brain/plan': ['*.md'],
    'src/projects': true, // 项目内容不校验
    'src/config': ['claude.md'],
    'src/config/skills': ['*/SKILL.md', '*/README.md', '*/**/SKILL.md', 'claude.md'],
    'scripts': ['**/*.js', '*.sh'],
  },
  alwaysAllow: [
    '.husky/*',
    'package.json',
    'package-lock.json',
  ],
  // 已删除：tests/ - 旧测试已废弃，新测试在 scripts/install/test.js
};