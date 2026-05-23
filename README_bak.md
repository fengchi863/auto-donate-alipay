# 支付宝公益捐款自动点击器

⚠️ **重要警告**: 这是涉及真实金钱交易的自动化脚本，请谨慎使用！

## 功能特性

- 自动执行支付宝公益捐款
- 支持循环执行指定次数
- 每轮之间随机等待10-50秒
- 记录成功次数，支持中断恢复
- 使用浏览器用户数据目录保持登录状态

## 技术栈

- Node.js + TypeScript
- Playwright（浏览器自动化）
- Winston（日志）
- Lowdb（数据持久化）

## 安装步骤

### 1. 安装依赖

```bash
npm install
```

### 2. 安装 Playwright 浏览器

```bash
npx playwright install chromium
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env` 并填入你的配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 支付密码（重要：不要提交到代码仓库！）
PAY_PASSWORD=你的支付密码

# 目标银行卡名称
TARGET_BANK_CARD_NAME=招商银行

# 目标银行卡尾号后四位（可选，用于区分同一银行的多张卡）
TARGET_BANK_CARD_LAST_FOUR=8888

# 用户数据目录
USER_DATA_DIR=C:/Users/你的用户名/AppData/Local/Chromium/User Data
```

**银行卡选择说明**：
- 如果同一银行只有一张卡，只需设置 `TARGET_BANK_CARD_NAME`
- 如果同一银行有多张卡，建议同时设置 `TARGET_BANK_CARD_NAME` 和 `TARGET_BANK_CARD_LAST_FOUR` 来精确选择

### 4. 首次登录支付宝

由于支付宝需要登录，你需要先手动登录一次：

```bash
npx playwright open https://love.alipay.com/donate/index.htm
```

在打开的浏览器中：
1. 访问支付宝公益页面
2. 手动登录你的支付宝账号
3. 确认登录成功后，关闭浏览器

登录状态会保存在用户数据目录中，后续运行会自动保持登录。

### 5. 修改捐款配置

编辑 `config/default.json`：

```json
{
  "donation": {
    "url": "捐款页面地址",
    "amount": 0.01,
    "totalTimes": 10,
    "minDelay": 10000,
    "maxDelay": 50000
  }
}
```

- `totalTimes`: 捐款总次数
- `minDelay`/`maxDelay`: 两次捐款之间的最小/最大延迟（毫秒）

## 使用方法

### 启动程序

```bash
npm start
```

### 测试运行

建议先用 `totalTimes: 1` 进行单次测试，确认流程正常后再增加次数。

## 项目结构

```
自动捐款点击器/
├── src/
│   ├── index.ts                 # 程序入口
│   ├── config/
│   │   └── config.ts            # 配置管理
│   ├── core/
│   │   ├── browser.ts           # 浏览器管理
│   │   ├── alipay-donor.ts      # 支付宝捐款核心逻辑
│   │   └── workflow.ts          # 工作流编排
│   ├── services/
│   │   ├── logger.ts            # 日志服务
│   │   └── storage.ts           # 数据持久化
│   └── utils/
│       └── random.ts            # 随机工具
├── data/                        # 数据目录（gitignore）
│   ├── screenshots/             # 错误截图
│   ├── donation.log             # 日志文件
│   └── execution-log.json       # 执行记录
├── config/
│   └── default.json             # 配置文件
├── .env                         # 环境变量（gitignore）
└── package.json
```

## 注意事项

### 安全警告

1. **永远不要**将 `.env` 文件提交到代码仓库
2. 建议先用小额（0.01元）充分测试
3. 建议设置合理的单日捐款上限
4. 使用专门的测试账号进行开发测试
5. 程序运行时请勿手动操作浏览器

### 页面元素选择

由于支付宝页面可能会更新，如果发现选择器失效，你可能需要：
1. 打开浏览器开发者工具
2. 检查实际的页面结构
3. 更新 `src/core/alipay-donor.ts` 中的选择器

### 中断恢复

如果程序意外中断，重新运行时会自动从上次成功的位置继续。

### 查看执行记录

执行记录保存在 `data/execution-log.json`，日志保存在 `data/donation.log`。

## 重置状态

如果需要重新开始，删除 `data/execution-log.json` 文件即可。

## 常见问题

### 找不到元素？

支付宝页面可能会更新，请检查 `alipay-donor.ts` 中的选择器是否需要调整。

### 登录状态失效？

重新运行 `npx playwright open` 并手动登录一次。

### 如何只测试一次？

修改 `config/default.json` 中的 `totalTimes` 为 1。

## 免责声明

此工具仅供学习和研究使用，使用者需自行承担使用此工具产生的一切责任和风险。请合理使用，遵守支付宝的服务条款。
