import { chromium, BrowserContext, Page } from 'playwright';
import { config } from '../config/config';
import { logger } from '../services/logger';
import path from 'path';
import fs from 'fs';

export class BrowserManager {
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private screenshotDir: string;

  constructor() {
    this.screenshotDir = path.join(process.cwd(), 'data', 'screenshots');
    this.ensureScreenshotDir();
  }

  private ensureScreenshotDir(): void {
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }
  }

  async launch(): Promise<Page> {
    logger.info('正在启动浏览器...');

    // 确保用户数据目录存在
    const userDataDir = config.browser.userDataDir;
    if (!fs.existsSync(userDataDir)) {
      logger.warn(`用户数据目录不存在: ${userDataDir}`);
      logger.warn('将创建新的用户数据目录，你需要手动登录支付宝');
    }

    this.context = await chromium.launchPersistentContext(userDataDir, {
      headless: config.browser.headless,
      slowMo: config.browser.slowMo,
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    // 如果有现有页面，使用第一个；否则创建新页面
    const pages = this.context.pages();
    if (pages.length > 0) {
      this.page = pages[0];
      logger.info('使用现有页面');
    } else {
      this.page = await this.context.newPage();
      logger.info('创建新页面');
    }

    // 设置默认超时
    this.page.setDefaultTimeout(config.browser.timeout);
    this.page.setDefaultNavigationTimeout(config.browser.timeout);

    // 尝试加载保存的 cookies
    await this.loadCookies();

    logger.info('浏览器启动成功');
    return this.page;
  }

  async getPage(): Promise<Page> {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    return this.page;
  }

  async takeScreenshot(name: string): Promise<string> {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch() first.');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${name}-${timestamp}.png`;
    const filepath = path.join(this.screenshotDir, filename);

    await this.page.screenshot({ path: filepath, fullPage: true });
    logger.info(`截图已保存: ${filepath}`);
    return filepath;
  }

  async saveCookies(): Promise<void> {
    if (!this.context) return;

    const cookiesPath = path.join(process.cwd(), 'data', 'cookies.json');
    const cookies = await this.context.cookies();
    fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));
    logger.info('Cookies 已保存');
  }

  async loadCookies(): Promise<void> {
    if (!this.context) return;

    const cookiesPath = path.join(process.cwd(), 'data', 'cookies.json');
    if (fs.existsSync(cookiesPath)) {
      const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf-8'));
      await this.context.addCookies(cookies);
      logger.info('Cookies 已加载');
    }
  }

  async close(): Promise<void> {
    logger.info('正在关闭浏览器...');
    if (this.context) {
      try {
        // 先保存 cookies
        await this.saveCookies();
        // 等待一下确保数据保存
        await new Promise(resolve => setTimeout(resolve, 500));
        await this.context.close();
      } catch (e) {
        logger.debug('关闭浏览器时出错，但可能不影响:', e);
      }
      this.context = null;
      this.page = null;
    }
    logger.info('浏览器已关闭');
  }
}
