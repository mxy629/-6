# 成长星球 / Growth Planet（打卡星球）

家长发布任务 → 孩子完成并提交 → 家长审核 → 积分到账 → 孩子兑换奖励 → 家长确认/拒绝（自动退款）。
一个围绕**家庭任务激励**的微信小程序 + NestJS 后端，已端到端跑通（验收 A–E 全绿）。

---

## 技术栈

| 层 | 技术 |
|----|------|
| 小程序 | 微信原生小程序 + TypeScript（`ts2js` 编译，无需额外构建步骤） |
| 后端 | NestJS + TypeScript |
| 数据库 | Prisma ORM（开发默认 **SQLite**，生产切换 MySQL 仅需改 `DATABASE_URL`） |
| 鉴权 | 家长：微信 `code` 换 openId（开发期 mock）；孩子：登录名 + PIN（bcrypt） |
| 工程化 | npm workspaces（monorepo） |

---

## 目录结构

```
growth-planet/
├── apps/
│   ├── miniprogram/        # 微信小程序（原生 + TS）
│   └── server/             # NestJS API（端口 3000）
├── packages/
│   └── shared/             # 共享类型/枚举（小程序侧为本地 types 副本，避免跨包 rootDir 编译问题）
├── docs/
│   ├── API.md              # 完整接口文档
│   ├── acceptance-report.html  # 验收报告（A–E 全绿）
│   ├── miniprogram-preview.html # 可交互 Web 预览（连真实后端）
│   └── PUBLISH.md          # 上架准备清单
└── package.json
```

---

## 一、启动后端

> 已验证：后端运行于 `http://localhost:3000`，验收脚本 23 项断言全通过。

```bash
# 1. 安装依赖（根目录，workspaces 自动安装各子包）
npm install

# 2. 准备环境变量（默认已指向 SQLite dev.db，可直接用）
cp .env.example .env        # 如不存在

# 3. 生成 Prisma Client + 建库 + 灌种子数据
cd apps/server
npx prisma generate
npx prisma db push          # 开发用 push；生产用 migrate
npm run db:seed             # 家长(测试家长) / 孩子(小宇,PIN=2580) / 任务 / 奖励 / 初始积分360

# 4. 启动开发服务
npm run dev:server          # 或 npm run start:dev
```

后端默认 `http://localhost:3000/api/v1`，响应统一包裹 `{ success, data, message }`。

### 演示账号

| 角色 | 登录方式 | 凭据 |
|------|----------|------|
| 家长 | 小程序「家长登录」按钮（`wx.login`） | 每次登录新建一个空家长（真实行为）；种子家长 openId=`dev_openid_seed_parent` |
| 孩子 | 小程序「孩子登录」 | 登录名 `xiaoyu` / PIN `2580`（种子数据，可直接体验已有权限与积分） |

> 想在浏览器里直接体验**种子家长**视角（已包含任务、兑换申请等），打开 `docs/miniprogram-preview.html` → 切到「家长端」即可，它连的是本地真实后端。

---

## 二、运行微信小程序

1. 用**微信开发者工具**打开目录 `apps/miniprogram`（导入项目）。
2. AppID：开发期可直接用 `touristappid`（游客模式，无需真实 AppID 即可预览）。
   - 真机调试 / 上架需要你自己的**小程序 AppID**。
3. 工具设置里保持「**不校验合法域名、TLS 版本以及 HTTPS 证书**」勾选（开发默认勾选），这样 `http://localhost:3000` 才能访问。
4. 后端地址在 `apps/miniprogram/services/request.ts` 的 `BASE_URL`，默认 `http://localhost:3000/api/v1`。
5. 编译运行：工具会自动把 `.ts` 编译为 `.js`（`ts2js`），**无需「构建 npm」**（项目无运行时 npm 依赖，仅 `miniprogram-api-typings` 类型包）。

### 在小程序里走通完整闭环

- **家长端**：点「家长登录」→（首次为空）到「我的」页创建孩子（昵称/登录名/PIN）→ 到「任务」页发布任务 → 到「审核」页通过/驳回孩子提交 → 到「奖励」页创建奖励 → 到「兑换」页确认/拒绝孩子申请。
- **孩子端**：用刚创建的（或种子）登录名+PIN 登录 → 首页看今日任务 → 任务详情提交完成说明/照片 → 「积分」看流水 → 「奖励」兑换。

---

## 三、验收状态

端到端验收脚本 `apps/server/scripts/acceptance.mjs` 覆盖核心闭环：

- **A** 家长/孩子登录、鉴权、数据隔离
- **B** 发布→提交→审核（幂等发分，重复审核积分不变）
- **C** 驳回→重新提交→只计一次分
- **D** 兑换→扣分
- **E** 拒绝兑换→自动退款→流水含 REDEEM+REFUND→重复拒绝幂等

运行（需后端已起、库已 seed）：

```bash
cd apps/server
node scripts/acceptance.mjs
```

> 详见 `docs/acceptance-report.html`。

---

## 四、已知边界 / 后续

- 图片提交：小程序 `chooseMedia` 拿到的是本地临时路径，当前直接作为 `images` 字符串存库（演示可用）。**生产需先 `wx.uploadFile` 传到对象存储（COS/OSS）再存 URL**。
- 微信登录为开发期 mock（`codeToOpenId` 返回 `dev_openid_${code}`）；生产需接真实 `auth.code2Session`。
- 生产数据库：将 `apps/server/.env` 的 `DATABASE_URL` 改为 MySQL，并执行 `prisma migrate deploy`。

上架完整清单见 **`docs/PUBLISH.md`**。
