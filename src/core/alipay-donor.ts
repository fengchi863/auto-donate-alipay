import { Page } from 'playwright';
import { config } from '../config/config';
import { logger } from '../services/logger';

export class AlipayDonor {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * 导航到捐款页面
   */
  async navigateToDonationPage(): Promise<void> {
    logger.info('正在导航到捐款页面...');
    await this.page.goto(config.donation.url, { waitUntil: 'networkidle' });
    logger.info('已到达捐款页面');
  }

  /**
   * 点击"我要捐助"按钮
   */
  async clickDonateButton(): Promise<void> {
    logger.info('正在查找并点击"我要捐助"按钮...');

    // 尝试多种可能的选择器
    const selectors = [
      'button:has-text("我要捐助")',
      'a:has-text("我要捐助")',
      '.donate-btn',
      '.btn-donate',
      '[class*="donate"][class*="btn"]',
      'button:visible',
      'a:visible'
    ];

    for (const selector of selectors) {
      try {
        const element = this.page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          const text = await element.textContent();
          if (text && (text.includes('捐助') || text.includes('捐赠') || text.includes('捐款'))) {
            await element.click();
            logger.info(`已点击捐款按钮: ${selector}`);
            return;
          }
        }
      } catch (e) {
        // 继续尝试下一个选择器
      }
    }

    // 如果上面都没找到，尝试点击页面上看起来像按钮的元素
    const buttons = this.page.locator('button, a, [role="button"]');
    const count = await buttons.count();
    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i);
      try {
        const text = await btn.textContent();
        if (text && (text.includes('捐助') || text.includes('捐赠') || text.includes('捐款'))) {
          await btn.click();
          logger.info(`已找到并点击捐款按钮: ${text}`);
          return;
        }
      } catch (e) {
        continue;
      }
    }

    throw new Error('未找到"我要捐助"按钮');
  }

  /**
   * 输入捐款金额
   */
  async inputAmount(amount: number): Promise<void> {
    logger.info(`正在输入捐款金额: ${amount} 元`);

    // 截图保存当前页面状态
    try {
      await this.page.screenshot({ path: 'data/screenshots/before-amount-input.png', fullPage: true });
      logger.info('已保存截图：data/screenshots/before-amount-input.png');
    } catch (e) {
      logger.warn('截图失败');
    }

    const amountStr = amount.toString();

    // 优先查找"捐款金额"标签附近的输入框
    logger.info('尝试通过"捐款金额"标签查找输入框...');
    try {
      // 查找包含"捐款金额"的元素
      const labelElements = this.page.locator('text=捐款金额');
      const labelCount = await labelElements.count();
      logger.info(`找到 ${labelCount} 个包含"捐款金额"的元素`);

      for (let i = 0; i < labelCount; i++) {
        const label = labelElements.nth(i);
        // 查找该标签的父元素，然后在父元素内找输入框
        const parent = label.locator('xpath=..');
        const nearbyInputs = parent.locator('input:visible');
        const nearbyCount = await nearbyInputs.count();
        logger.info(`在"捐款金额"附近找到 ${nearbyCount} 个输入框`);

        if (nearbyCount > 0) {
          const input = nearbyInputs.first();
          logger.info('在"捐款金额"标签附近找到输入框，准备输入金额');
          await input.click();
          await input.fill('');
          await input.fill(amountStr);
          logger.info(`已输入金额: ${amountStr}`);

          try {
            await this.page.screenshot({ path: 'data/screenshots/after-amount-input.png', fullPage: true });
          } catch (e) { }

          return;
        }
      }
    } catch (e) {
      logger.debug('通过标签查找输入框失败:', e);
    }

    // 如果上面没找到，尝试用页面位置判断 - 通常捐款金额输入框不在页面顶部
    logger.info('尝试通过页面位置查找输入框...');
    try {
      const allInputs = this.page.locator('input:visible');
      const inputCount = await allInputs.count();

      for (let i = 0; i < inputCount; i++) {
        const input = allInputs.nth(i);
        const box = await input.boundingBox();

        // 如果输入框在页面较下方（y坐标较大），更可能是捐款金额输入框
        if (box && box.y > 100) {
          logger.info(`找到位置偏下的输入框 (y=${box.y})，尝试输入`);
          await input.click();
          await input.fill('');
          await input.fill(amountStr);
          logger.info(`已输入金额: ${amountStr}`);

          try {
            await this.page.screenshot({ path: 'data/screenshots/after-amount-input.png', fullPage: true });
          } catch (e) { }

          return;
        }
      }
    } catch (e) {
      logger.debug('通过位置查找输入框失败:', e);
    }

    // 先尝试找预设的金额按钮（如 0.01元、0.1元 等按钮）
    const presetButtons = this.page.locator('button, div, span').filter({
      hasText: new RegExp(amountStr.replace('.', '\\.') + '\\s*元')
    });

    const presetCount = await presetButtons.count();
    logger.info(`找到 ${presetCount} 个预设金额按钮`);

    for (let i = 0; i < presetCount; i++) {
      try {
        const btn = presetButtons.nth(i);
        if (await btn.isVisible({ timeout: 1000 })) {
          await btn.click();
          logger.info(`已点击预设金额按钮: ${amountStr}元`);
          return;
        }
      } catch (e) {
        continue;
      }
    }

    // 截图保存失败时的状态
    try {
      await this.page.screenshot({ path: 'data/screenshots/amount-input-failed.png', fullPage: true });
      logger.warn('已保存失败截图：data/screenshots/amount-input-failed.png');
    } catch (e) { }

    throw new Error('未找到金额输入框，请查看截图了解页面状态');
  }

  /**
   * 同意协议
   */
  async agreeToProtocol(): Promise<void> {
    logger.info('正在同意协议...');

    // 尝试勾选协议复选框
    const checkboxSelectors = [
      'input[type="checkbox"]',
      '.agreement-checkbox',
      '[class*="protocol"][class*="check"]',
      '[class*="agree"][class*="check"]'
    ];

    for (const selector of checkboxSelectors) {
      try {
        const checkbox = this.page.locator(selector).first();
        if (await checkbox.isVisible({ timeout: 1000 })) {
          // 如果没勾选，就勾选它
          if (!(await checkbox.isChecked())) {
            await checkbox.check();
            logger.info('已勾选协议复选框');
          }
          break;
        }
      } catch (e) {
        // 继续尝试
      }
    }

    // 等待一下，让页面更新
    await this.page.waitForTimeout(500);
  }

  /**
   * 点击"同意协议并捐款"或类似的提交按钮
   */
  async submitDonation(): Promise<void> {
    logger.info('正在提交捐款...');

    // 优先找"同意协议并捐款"按钮
    try {
      const targetBtn = this.page.locator('text=同意协议并捐款').first();
      if (await targetBtn.isVisible({ timeout: 2000 })) {
        await targetBtn.click();
        logger.info('已点击提交按钮: 同意协议并捐款');
        return;
      }
    } catch (e) {
      // 继续尝试
    }

    // 尝试找包含"同意"和"捐款"的按钮
    try {
      const buttons = this.page.locator('button:visible, a:visible');
      const count = await buttons.count();
      for (let i = 0; i < count; i++) {
        const btn = buttons.nth(i);
        const text = await btn.textContent();
        if (text && text.includes('同意') && text.includes('捐款')) {
          await btn.click();
          logger.info(`已点击提交按钮: ${text}`);
          return;
        }
      }
    } catch (e) {
      // 继续尝试
    }

    // 尝试其他可能的选择器
    const selectors = [
      'button:has-text("同意")',
      'button:has-text("捐款")',
      'button:has-text("支付")',
      'button:has-text("确认")',
      'a:has-text("同意")',
      'a:has-text("捐款")',
      '.submit-btn',
      '.confirm-btn'
    ];

    for (const selector of selectors) {
      try {
        const btn = this.page.locator(selector).first();
        if (await btn.isVisible({ timeout: 2000 })) {
          const text = await btn.textContent();
          if (text && (text.includes('同意') || text.includes('捐款') || text.includes('支付') || text.includes('确认'))) {
            await btn.click();
            logger.info(`已点击提交按钮: ${text}`);
            return;
          }
        }
      } catch (e) {
        // 继续尝试
      }
    }

    throw new Error('未找到提交按钮');
  }

  /**
   * 选择指定的银行卡（全程使用鼠标点击操作）
   */
  async selectBankCard(): Promise<void> {
    const cardDesc = config.targetBankCardLastFour
      ? `${config.targetBankCardName} (尾号${config.targetBankCardLastFour})`
      : config.targetBankCardName;

    logger.info(`正在选择银行卡: ${cardDesc}`);

    // 等待支付页面加载
    await this.page.waitForTimeout(2000);

    // 检查是否有新标签页打开（支付宝支付页面通常在新标签打开）
    const context = this.page.context();
    const allPages = context.pages();
    logger.info(`当前共有 ${allPages.length} 个标签页`);
    for (const p of allPages) {
      const url = p.url();
      logger.info(`标签页 URL: ${url}`);
    }
    if (allPages.length > 1) {
      // 切换到最后一个新标签页（最新打开的支付页）
      const newPage = allPages[allPages.length - 1];
      if (newPage !== this.page) {
        logger.info(`切换到新标签页: ${newPage.url()}`);
        this.page = newPage;
        await this.page.bringToFront();
        await this.page.waitForTimeout(2000);
      }
    }

    // 先尝试鼠标点击"其他付款方式"
    try {
      const otherPaymentBtn = this.page.locator('text=其他付款方式').first();
      if (await otherPaymentBtn.isVisible({ timeout: 2000 })) {
        logger.info('鼠标点击"其他付款方式"...');
        const box = await otherPaymentBtn.boundingBox();
        if (box) {
          await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
          await this.page.waitForTimeout(1500);
        }
      }
    } catch (e) {
      logger.debug('没有"其他付款方式"按钮，继续...');
    }

    // 滚动回顶部，从头开始查找
    logger.info('滚动回顶部，准备开始查找银行卡...');
    await this.page.evaluate('window.scrollTo(0, 0)');
    await this.page.waitForTimeout(500);

    // 持续向下滚动并查找目标银行卡
    let found = false;
    let scrollCount = 0;
    const maxScrolls = 30;

    while (!found && scrollCount < maxScrolls) {
      try {
        const pageText = await this.page.content();
        const hasBankName = pageText.includes(config.targetBankCardName);
        const hasLastFour = config.targetBankCardLastFour ? pageText.includes(config.targetBankCardLastFour) : true;

        if (hasBankName && hasLastFour) {
          logger.info('页面中包含目标银行卡信息，开始查找可点击元素...');

          // 查找所有可能包含银行卡信息的元素
          const allElements = this.page.locator('div, li, label, span');
          const count = await allElements.count();

          for (let i = 0; i < count; i++) {
            const el = allElements.nth(i);
            let text = '';
            try {
              text = await el.textContent({ timeout: 300 }) || '';
            } catch {
              continue;
            }

            // 文本长度过长说明是容器元素，跳过
            if (text.length > 100) continue;

            const elHasBankName = text.includes(config.targetBankCardName);
            const elHasLastFour = config.targetBankCardLastFour ? text.includes(config.targetBankCardLastFour) : true;

            if (elHasBankName && elHasLastFour) {
              logger.info(`找到目标银行卡元素: ${text.trim()}`);

              // 先滚动到元素位置，确保它在视口内
              await el.scrollIntoViewIfNeeded();
              await this.page.waitForTimeout(500);

              const box = await el.boundingBox();
              if (box && box.width > 0 && box.height > 0) {
                const clickX = box.x + box.width / 2;
                const clickY = box.y + box.height / 2;
                logger.info(`鼠标点击银行卡元素坐标: (${Math.round(clickX)}, ${Math.round(clickY)})`);
                await this.page.mouse.click(clickX, clickY);
                await this.page.waitForTimeout(800);
                logger.info(`已鼠标点击选中银行卡: ${cardDesc}`);
                found = true;
                break;
              }
            }
          }
        }
      } catch (e) {
        logger.debug('检查页面内容失败:', e);
      }

      if (!found) {
        scrollCount++;
        logger.info(`未找到目标银行卡，继续向下滚动 (${scrollCount}/${maxScrolls})...`);
        await this.page.evaluate('window.scrollBy(0, 300)');
        await this.page.waitForTimeout(300);
      }
    }

    if (!found) {
      logger.warn(`未找到指定的银行卡: ${cardDesc}，将使用默认方式`);
    }
  }

  /**
   * 输入支付密码：页面默认光标已在密码框，逐字符输入，完成后等1秒
   */
  async inputPassword(): Promise<void> {
    logger.info('正在输入支付密码...');
    // 逐字符输入，每个字符间隔150ms，确保每格都能接收到输入
    for (const char of config.payPassword) {
      await this.page.keyboard.type(char);
      await this.page.waitForTimeout(150);
    }
    logger.info('已输入支付密码，等待1秒...');
    await this.page.waitForTimeout(1000);
  }

  /**
   * 确认付款
   */
  async confirmPayment(): Promise<void> {
    logger.info('正在点击确认付款...');

    const selectors = [
      'text=确认付款',
      'text=确认捐款',
      'button:has-text("确认付款")',
      'button:has-text("确认捐款")',
      'button:has-text("确认支付")',
      'button:has-text("付款")',
    ];

    for (const selector of selectors) {
      try {
        const btn = this.page.locator(selector).first();
        if (await btn.isVisible({ timeout: 2000 })) {
          await btn.scrollIntoViewIfNeeded();
          await this.page.waitForTimeout(200);
          const box = await btn.boundingBox();
          if (box) {
            await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
            logger.info(`已鼠标点击确认付款按钮: ${selector}`);
            return;
          }
        }
      } catch (e) {
        // 继续尝试
      }
    }

    throw new Error('未找到确认付款按钮');
  }

  /**
   * 验证捐款是否成功
   */
  async verifySuccess(): Promise<boolean> {
    logger.info('正在验证捐款结果...');

    // 等待结果页面加载
    await this.page.waitForTimeout(2000);

    // 检查是否有成功提示
    const successKeywords = ['成功', '完成', '已支付', '支付成功', '捐款成功', '感谢'];
    const pageContent = await this.page.content();

    for (const keyword of successKeywords) {
      if (pageContent.includes(keyword)) {
        logger.info(`捐款成功！找到关键词: ${keyword}`);
        return true;
      }
    }

    // 检查是否有错误提示
    const errorKeywords = ['失败', '错误', '异常', '余额不足', '限额'];
    for (const keyword of errorKeywords) {
      if (pageContent.includes(keyword)) {
        logger.error(`捐款可能失败，找到关键词: ${keyword}`);
        return false;
      }
    }

    // 不确定时，假设成功（但记录警告）
    logger.warn('无法确定捐款是否成功，假设成功，请手动确认');
    return true;
  }

  /**
   * 执行完整的捐款流程
   */
  async executeDonation(amount: number): Promise<boolean> {
    try {
      // 1. 导航到捐款页面
      await this.navigateToDonationPage();
      await this.page.waitForTimeout(2000);

      // 2. 点击"我要捐助"
      await this.clickDonateButton();
      logger.info('已点击"我要捐助"，等待页面变化...');

      // 等待页面变化（可能弹出弹窗或跳转）
      await this.page.waitForTimeout(3000);

      // 截图保存点击后的状态
      try {
        await this.page.screenshot({ path: 'data/screenshots/after-click-donate.png', fullPage: true });
        logger.info('已保存截图：data/screenshots/after-click-donate.png');
      } catch (e) { }

      // 3. 输入金额
      await this.inputAmount(amount);
      await this.page.waitForTimeout(1000);

      // 4. 同意协议
      await this.agreeToProtocol();

      // 5. 提交捐款，等待支付页面加载
      await this.submitDonation();
      await this.page.waitForTimeout(3000);

      // 6. 输入密码
      await this.inputPassword();

      // 7. 确认付款
      await this.confirmPayment();

      // 9. 验证结果
      const success = await this.verifySuccess();
      return success;

    } catch (error) {
      logger.error('捐款过程出错:', error);
      // 截图以便调试
      try {
        await this.page.screenshot({ path: `data/screenshots/error-${Date.now()}.png`, fullPage: true });
      } catch (e) {
        // 忽略截图错误
      }
      throw error;
    }
  }
}
