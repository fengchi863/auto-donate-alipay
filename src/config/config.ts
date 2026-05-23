import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

export interface Config {
  donation: {
    url: string;
    amount: number;
    totalTimes: number;
    minDelay: number;
    maxDelay: number;
  };
  browser: {
    headless: boolean;
    slowMo: number;
    timeout: number;
    userDataDir: string;
  };
  payPassword: string;
  targetBankCardName: string;
  targetBankCardLastFour?: string;
  logging: {
    level: string;
    file: string;
  };
  storage: {
    file: string;
  };
}

function loadConfig(): Config {
  const configPath = path.join(process.cwd(), 'config', 'default.json');
  let configFile: any = {};

  if (fs.existsSync(configPath)) {
    const content = fs.readFileSync(configPath, 'utf-8');
    configFile = JSON.parse(content);
  }

  const payPassword = process.env.PAY_PASSWORD;
  if (!payPassword) {
    throw new Error('PAY_PASSWORD is required in .env file');
  }

  const targetBankCardName = process.env.TARGET_BANK_CARD_NAME || '招商银行';
  const targetBankCardLastFour = process.env.TARGET_BANK_CARD_LAST_FOUR;
  const userDataDir = process.env.USER_DATA_DIR;

  if (!userDataDir) {
    throw new Error('USER_DATA_DIR is required in .env file');
  }

  return {
    donation: {
      url: configFile.donation?.url || 'https://love.alipay.com/donate/itemDetail.htm?name=2016051810442526101',
      amount: configFile.donation?.amount ?? 0.01,
      totalTimes: configFile.donation?.totalTimes ?? 10,
      minDelay: configFile.donation?.minDelay ?? 10000,
      maxDelay: configFile.donation?.maxDelay ?? 50000
    },
    browser: {
      headless: configFile.browser?.headless ?? false,
      slowMo: configFile.browser?.slowMo ?? 100,
      timeout: configFile.browser?.timeout ?? 30000,
      userDataDir
    },
    payPassword,
    targetBankCardName,
    targetBankCardLastFour,
    logging: {
      level: configFile.logging?.level || 'info',
      file: configFile.logging?.file || 'data/donation.log'
    },
    storage: {
      file: configFile.storage?.file || 'data/execution-log.json'
    }
  };
}

export const config: Config = loadConfig();
