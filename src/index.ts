import { DonationWorkflow } from './core/workflow';
import { logger } from './services/logger';
import { config } from './config/config';
import fs from 'fs';
import path from 'path';

async function main() {
  // 检查 .env 文件是否存在
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    console.error('错误: .env 文件不存在！');
    console.error('请复制 .env.example 为 .env 并填入你的配置');
    process.exit(1);
  }

  // 显示警告信息
  console.log('\n' + '='.repeat(60));
  console.log('⚠️  警告: 这是涉及真实金钱交易的自动化脚本！');
  console.log('='.repeat(60));
  console.log(`- 捐款金额: ${config.donation.amount} 元/次`);
  console.log(`- 捐款次数: ${config.donation.totalTimes} 次`);
  console.log(`- 总金额: ${config.donation.amount * config.donation.totalTimes} 元`);
  console.log('- 请确保你已充分测试并了解风险');
  console.log('='.repeat(60) + '\n');

  // 检查是否需要先登录
  if (!fs.existsSync(config.browser.userDataDir)) {
    console.log('提示: 用户数据目录不存在，你需要先手动登录支付宝');
    console.log('请按照以下步骤操作:');
    console.log('1. 运行: npx playwright open');
    console.log('2. 在打开的浏览器中访问并登录支付宝');
    console.log('3. 登录成功后，重新运行此程序\n');
  }

  // 确认执行
  console.log('程序将在 5 秒后开始...');
  console.log('按 Ctrl+C 可以随时停止\n');

  await new Promise(resolve => setTimeout(resolve, 5000));

  try {
    const workflow = new DonationWorkflow();

    // 显示当前状态
    const state = await workflow.getState();
    if (state.completedCount > 0) {
      console.log(`之前已完成 ${state.completedCount} 次捐款\n`);
    }

    await workflow.execute();
    process.exit(0);

  } catch (error) {
    logger.error('程序执行出错:', error);
    console.error('\n程序执行出错，请查看日志了解详情');
    process.exit(1);
  }
}

// 处理退出信号
process.on('SIGINT', async () => {
  console.log('\n\n收到停止信号，正在退出...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\n收到停止信号，正在退出...');
  process.exit(0);
});

main();
