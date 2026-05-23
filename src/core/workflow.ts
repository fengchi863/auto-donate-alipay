import { BrowserManager } from './browser';
import { AlipayDonor } from './alipay-donor';
import { config } from '../config/config';
import { logger } from '../services/logger';
import { Storage, ExecutionState } from '../services/storage';
import { randomDelay } from '../utils/random';
import path from 'path';

export class DonationWorkflow {
  private browserManager: BrowserManager;
  private storage: Storage;
  private donor: AlipayDonor | null = null;

  constructor() {
    this.browserManager = new BrowserManager();
    this.storage = new Storage(path.join(process.cwd(), config.storage.file));
  }

  async execute(): Promise<void> {
    logger.info('===== 自动捐款点击器启动 =====');
    logger.info(`配置: 总次数=${config.donation.totalTimes}, 金额=${config.donation.amount}元, 延迟=${config.donation.minDelay/1000}-${config.donation.maxDelay/1000}秒`);

    // 加载之前的状态
    const previousState = await this.storage.loadState();
    const startIndex = previousState.completedCount;

    if (startIndex > 0) {
      logger.info(`发现之前的执行记录: 已完成 ${startIndex} 次`);
      logger.info(`上次执行时间: ${previousState.lastRunTime}`);
    }

    // 检查是否已经完成
    if (startIndex >= config.donation.totalTimes) {
      logger.info('已达到配置的总次数，无需继续执行');
      logger.info(`总计成功: ${startIndex} 次`);
      return;
    }

    try {
      // 启动浏览器
      const page = await this.browserManager.launch();
      this.donor = new AlipayDonor(page);

      // 执行循环
      await this.runLoop(startIndex, config.donation.totalTimes);

    } catch (error) {
      logger.error('执行过程中发生严重错误:', error);
      throw error;
    } finally {
      // 关闭浏览器
      await this.browserManager.close();

      // 输出最终统计
      const finalState = await this.storage.loadState();
      logger.info('===== 执行结束 =====');
      logger.info(`总计成功: ${finalState.completedCount} 次`);
    }
  }

  private async runLoop(startIndex: number, totalTimes: number): Promise<void> {
    for (let i = startIndex; i < totalTimes; i++) {
      const attempt = i + 1;
      logger.info(`===== 第 ${attempt}/${totalTimes} 次捐款开始 =====`);

      try {
        const success = await this.singleDonation(attempt);

        if (success) {
          logger.info(`第 ${attempt} 次捐款成功！`);
          await this.storage.recordExecution(true, attempt);
        } else {
          logger.error(`第 ${attempt} 次捐款失败`);
          await this.storage.recordExecution(false, attempt, '捐款验证失败');
        }

      } catch (error) {
        logger.error(`第 ${attempt} 次捐款出错:`, error);
        await this.storage.recordExecution(false, attempt, error instanceof Error ? error.message : String(error));

        // 截图保存错误现场
        try {
          await this.browserManager.takeScreenshot(`error-attempt-${attempt}`);
        } catch (e) {
          // 忽略截图错误
        }
      }

      // 如果不是最后一次，随机等待
      if (attempt < totalTimes) {
        const delayMs = randomDelay(config.donation.minDelay, config.donation.maxDelay);
        const delaySec = Math.round((config.donation.minDelay + Math.random() * (config.donation.maxDelay - config.donation.minDelay)) / 1000);
        logger.info(`等待 ${delaySec} 秒后继续...`);
        await new Promise(resolve => setTimeout(resolve, config.donation.minDelay + Math.random() * (config.donation.maxDelay - config.donation.minDelay)));
      }

      // 检查当前状态
      const currentState = await this.storage.loadState();
      logger.info(`当前进度: ${currentState.completedCount}/${totalTimes} 次成功`);
    }
  }

  private async singleDonation(attempt: number): Promise<boolean> {
    if (!this.donor) {
      throw new Error('Donor not initialized');
    }

    // 执行捐款
    const success = await this.donor.executeDonation(config.donation.amount);
    return success;
  }

  async resetState(): Promise<void> {
    logger.warn('正在重置执行状态...');
    await this.storage.resetState();
    logger.info('状态已重置');
  }

  async getState(): Promise<ExecutionState> {
    return await this.storage.loadState();
  }
}
