import { chromium } from 'playwright';
import { config } from './config/config';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

async function login() {
  console.log('\n===== 支付宝登录工具 =====');
  console.log('将打开浏览器，请手动登录支付宝');
  console.log('登录成功后，回到此终端按 Enter 保存登录状态\n');

  const userDataDir = config.browser.userDataDir;
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
    console.log(`已创建用户数据目录: ${userDataDir}`);
  }

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    slowMo: 100,
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  const pages = context.pages();
  const page = pages.length > 0 ? pages[0] : await context.newPage();

  console.log('正在打开支付宝登录页面...');
  await page.goto('https://auth.alipay.com/login/index.htm', { waitUntil: 'domcontentloaded' });

  console.log('\n请在浏览器中完成登录操作...');
  console.log('登录成功后，回到此终端按 Enter 键保存并退出');

  // 等待用户按 Enter
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await new Promise<void>(resolve => rl.question('', () => { rl.close(); resolve(); }));

  // 保存 cookies
  const cookiesPath = path.join(process.cwd(), 'data', 'cookies.json');
  const dataDir = path.dirname(cookiesPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const cookies = await context.cookies();
  fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));
  console.log(`\nCookies 已保存到: ${cookiesPath}`);
  console.log(`共保存 ${cookies.length} 个 cookie`);

  await context.close();
  console.log('浏览器已关闭，登录状态已保存。');
  console.log('现在可以运行 npm start 执行捐款了。\n');
}

login().catch(err => {
  console.error('登录过程出错:', err);
  process.exit(1);
});
