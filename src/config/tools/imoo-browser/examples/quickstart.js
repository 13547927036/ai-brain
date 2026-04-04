/**
 * imoo-browser 快速开始示例
 *
 * 前提：在 Chrome 中手动登录过目标网站（如 GitHub）
 * 运行：node examples/quickstart.js
 */

import { connect } from '/Users/imoo/work/data/project/ai-config/config/tools/imoo-browser/cli/src/puppeteer-wrapper.js';

async function main() {
  // 1. 连接已登录的浏览器
  const browser = await connect();
  const page = (await browser.pages())[0];

  // 2. 访问页面（自动复用登录状态）
  console.log('Navigating to GitHub...');
  await page.goto('https://github.com');
  await page.waitForSelector('input[name="q"]', { timeout: 10000 });
  console.log('✓ Page loaded, title:', await page.title());

  // 3. 执行 JavaScript
  const h1Text = await page.$eval('h1', el => el.textContent);
  console.log('✓ H1 text:', h1Text);

  // 4. 截图
  await page.screenshot({ path: 'example.png' });
  console.log('✓ Screenshot saved to example.png');

  // 5. 访问需要认证的 API（复用浏览器 Cookie）
  console.log('\nTrying authenticated API...');
  const repos = await page.evaluate(async () => {
    const res = await fetch('https://api.github.com/user/repos', {
      credentials: 'include'
    });
    if (res.ok) {
      const data = await res.json();
      return data.slice(0, 5).map(r => r.full_name);
    }
    return [];
  });

  if (repos.length > 0) {
    console.log('✓ Your repos:', repos.join(', '));
  } else {
    console.log('⚠ Not logged in to GitHub - please login manually first');
  }

  await browser.close();
  console.log('\n✓ Done!');
}

main().catch(err => {
  if (err.message.includes('timeout')) {
    console.error('\n❌ Error: Page load timeout - please ensure GitHub is accessible');
  } else {
    console.error('❌ Error:', err.message);
  }
});
