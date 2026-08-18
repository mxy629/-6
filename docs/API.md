# 打卡星球 · 后端 API 文档

> 项目：成长星球 / 打卡星球（家长-孩子 任务 / 积分 / 奖励 闭环）
> 技术栈：NestJS + TypeScript · Prisma + SQLite（开发）/ MySQL（生产）
> 基础路径：`http://localhost:3000/api/v1`（生产替换为你的域名）

---

## 1. 通用约定

### 响应信封（ResponseInterceptor 统一包装）
所有成功响应均为：
```json
{ "success": true, "data": <业务数据>, "message": "success" }
```
失败响应（HttpException）为：
```json
{ "success": false, "code": "<错误码>", "message": "<可读信息>" }
```

### 鉴权
- 除登录接口外，所有接口需在 Header 携带 `Authorization: Bearer <token>`。
- 角色由 Guard 约束：`JwtAuthGuard`（登录态）+ `ParentGuard` / `ChildGuard`（家长 / 孩子）。
- 两个角色：`PARENT`（家长）、`CHILD`（孩子）。

### 错误码（部分）
| code | 含义 |
| --- | --- |
| `REWARD_NOT_FOUND` | 奖励不存在 |
| `REWARD_INACTIVE` | 奖励已下架 |
| `REWARD_OUT_OF_STOCK` | 奖励库存不足 |
| `INSUFFICIENT_POINTS` | 积分不足 |
| `FORBIDDEN` | 越权（如兑换其他家庭的奖励） |
| `REDEMPTION_NOT_FOUND` | 兑换记录不存在 |
| `INVALID_REDEMPTION_STATUS` | 兑换状态非法（如重复拒绝） |
| `CHILD_NOT_FOUND` | 孩子档案不存在 |
| `INVALID_PARAM` | 参数不合法（如手机号格式错误） |
| `SMS_RATE_LIMIT` | 验证码发送过于频繁（60 秒限频） |
| `SMS_CODE_INVALID` | 验证码错误、已被使用或不存在 |
| `SMS_CODE_EXPIRED` | 验证码已过期（5 分钟） |
| `PHONE_ALREADY_REGISTERED` | 手机号已注册 |
| `SMS_NOT_CONFIGURED` | 短信服务未配置完整（缺环境变量或 SDK 未安装） |
| `SMS_SEND_FAILED` | 短信网关发送失败 |

---

## 2. 鉴权 Auth（`/auth`）

### 2.1 家长微信登录（开发态用 code 模拟 openid）
`POST /auth/wechat`
```json
{ "code": "seed_parent" }   // 开发环境：返回 openid = dev_openid_${code}
```
响应：`{ "accessToken": "...", "user": { "id", "role":"PARENT", "nickname" } }`

### 2.2 孩子登录（账号 + PIN）
`POST /auth/child-login`
```json
{ "loginName": "xiaoyu", "pin": "2580" }
```

### 2.3 手机号 + 验证码（仅家长）
> 注册/登录均面向**家长**。验证码体系按真实短信架构实现（`SmsProvider` 抽象 + `SmsCode` 表）。
> - 开发期默认 `MockSmsProvider`：后端生成 6 位码并**在响应 `devCode` 字段原样返回**（同时打印服务端日志），可立即跑通。
> - 上架前置：将 `SMS_PROVIDER` 设为 `tencent` 启用真实短信（骨架见 `src/sms/sms.tencent.ts`）。**未配置完整或 SDK 未安装时启动即抛出 `SMS_NOT_CONFIGURED` 清晰报错**（fail-fast），网关失败则抛 `SMS_SEND_FAILED`。
> 详见 `apps/server/.env.example`。

**发送验证码**
`POST /auth/send-code`
```json
{ "phone": "13800138000", "purpose": "REGISTER" }   // purpose: REGISTER | LOGIN
```
响应：`{ "message": "验证码已发送", "devCode": "123456" }`（开发期返回）

**注册（手机号 + 验证码）**
`POST /auth/register`
```json
{ "phone": "13800138000", "code": "123456", "nickname": "新家长" }  // nickname 选填
```
响应：`{ "accessToken": "...", "user": { "id", "role":"PARENT", "nickname", "phone" } }`
> 同手机号已注册则返回 `PHONE_ALREADY_REGISTERED`。

**手机号验证码登录（登录即注册）**
`POST /auth/phone-login`
```json
{ "phone": "13800138000", "code": "123456" }
```
> 验证码通过但手机号未注册时自动建号（登录即注册）。

### 2.4 当前用户
`GET /auth/me`（需登录）

---

## 3. 孩子 Children（`/children`，仅家长）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/children` | 列出当前家长的孩子 |
| POST | `/children` | 新增孩子（body: `nickname, loginName, pin, ...`） |
| GET | `/children/:id` | 孩子详情 |
| PATCH | `/children/:id` | 更新孩子 |
| POST | `/children/:id/reset-pin` | 重置 PIN |

---

## 4. 任务 Tasks

### 家长端
| 方法 | 路径 | 说明 | 关键入参 |
| --- | --- | --- | --- |
| POST | `/tasks` | 发布任务 | `childId, title, rewardPoints, taskType, repeatType, description?` |
| GET | `/tasks` | 任务列表（家长视角） | — |
| GET | `/tasks/:id` | 任务详情 | — |
| PATCH | `/tasks/:id` | 修改任务 | 同上可选字段 |
| DELETE | `/tasks/:id` | 删除任务 | — |

`taskType`：`STUDY` / `HOUSEWORK` / `SPORT` / `OTHER`
`repeatType`：`NONE` / `DAILY` / `WEEKLY`（开发态以一次性为主）

### 孩子端
| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/child/tasks/today` | 今日任务实例（含 `task` 及 `status`） |
| GET | `/child/tasks` | 全部任务实例 |
| GET | `/child/tasks/:instanceId` | 单个实例详情 |

任务实例 `status`：`PENDING`(待完成) → `SUBMITTED`(待审核) → `APPROVED`/`REJECTED`

---

## 5. 任务提交与审核（`/task-instances`, `/reviews`）

| 方法 | 路径 | 角色 | 说明 | 入参 |
| --- | --- | --- | --- | --- |
| POST | `/task-instances/:id/submit` | 孩子 | 提交完成证明 | `{ textProof?, images?: string[] }` |
| GET | `/reviews/tasks` | 家长 | 待审核 / 审核列表（含 `submissions`） | — |
| POST | `/task-instances/:id/approve` | 家长 | 审核通过 → **发放积分（幂等）** | — |
| POST | `/task-instances/:id/reject` | 家长 | 驳回 | `{ reason? }` |

> 幂等保证：积分发放通过 `PointsLedger.bizKey`（`TASK_REWARD:<instanceId>`）唯一索引去重，重复通过不会重复加分。

---

## 6. 积分 Points（`/points`，仅孩子）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/points/balance` | 当前积分余额 `{ balance }` |
| GET | `/points/ledger` | 积分流水（含 `type, amount, balanceBefore, balanceAfter, bizType, bizKey, description`） |

流水 `type`：`TASK_REWARD`(任务奖励) / `REWARD_REDEEM`(兑换扣减) / `REWARD_REFUND`(兑换退款) / `MANUAL_ADJUST`(手动调整)

家长查看孩子积分：`GET /children/:id/points` · 流水：`GET /children/:id/points/ledger`

---

## 7. 奖励与兑换 Rewards / Redemptions

### 奖励 Reward
> 状态机：`DRAFT`(草稿) → `ACTIVE`(上架中) → `INACTIVE`(已下架) → `ACTIVE`(重新上架)。
> **规则：奖励内容（name/pointsCost/stock/description/childId）在任意状态下均可修改（读取当前数据 → 改 → 保存回数据仓库），无需先下架。** 孩子端仅可见 `ACTIVE` 奖励。

| 方法 | 路径 | 角色 | 说明 | 入参 |
| --- | --- | --- | --- | --- |
| POST | `/rewards` | 家长 | 新增奖励（默认 `DRAFT` 草稿） | `{ name, pointsCost, stock, description?, childId? }` |
| GET | `/rewards` | 家长 | 奖励列表（含全部状态） | — |
| PATCH | `/rewards/:id` | 家长 | 修改奖励（**任意状态可改**） | 可选字段 |
| POST | `/rewards/:id/publish` | 家长 | 上架（DRAFT/INACTIVE → ACTIVE，幂等） | — |
| DELETE | `/rewards/:id` | 家长 | 下架（ACTIVE → INACTIVE，返回更新后的奖励） | — |
| GET | `/child/rewards` | 孩子 | 孩子可见奖励商店（仅 `ACTIVE`） | — |
| GET | `/child/rewards/:id` | 孩子 | 奖励详情（仅 `ACTIVE`） | — |

### 兑换 Redemption
| 方法 | 路径 | 角色 | 说明 |
| --- | --- | --- | --- |
| POST | `/rewards/:id/redeem` | 孩子 | 兑换：扣库存 + 扣积分（幂等 `bizKey=REWARD_REDEEM:<id>`），状态 `PENDING` |
| GET | `/child/redemptions` | 孩子 | 我的兑换记录 |
| GET | `/redemptions` | 家长 | 家庭兑换记录（含 `reward`, `child`） |
| POST | `/redemptions/:id/approve` | 家长 | 确认兑换（需 `PENDING`） |
| POST | `/redemptions/:id/reject` | 家长 | 拒绝 → **自动退还积分 + 恢复库存**（幂等 `REWARD_REFUND:<id>`） |
| POST | `/redemptions/:id/fulfill` | 家长 | 标记已发放（需 `APPROVED`） |

兑换 `status`：`PENDING` → `APPROVED` → `FULFILLED`，或 `PENDING` → `REJECTED`

---

## 8. 核心闭环（端到端）

```
家长发布任务(POST /tasks)
   → 孩子完成任务并提交(POST /task-instances/:id/submit)
   → 家长审核通过(POST /task-instances/:id/approve)  ⇒ 积分到账(+rewardPoints, 幂等)
   → 孩子兑换奖励(POST /rewards/:id/redeem)          ⇒ 积分扣减(-pointsCost, 幂等)
   → 家长确认兑换(POST /redemptions/:id/approve) 或 拒绝(POST /redemptions/:id/reject ⇒ 退款)
```

### 验收脚本（流程 A–E 全部通过）
位置：`apps/server/scripts/acceptance.mjs`
```bash
# 1) 重置并初始化数据库
cd apps/server
rm -f prisma/dev.db
npx prisma db push
npx ts-node -r tsconfig-paths/register prisma/seed.ts
# 2) 启动服务（另一终端）
npx ts-node -r tsconfig-paths/register src/main.ts
# 3) 运行验收
node scripts/acceptance.mjs
```
演示账号：家长 `code=seed_parent`；孩子 `loginName=xiaoyu / pin=2580`（初始积分 360）。

---

## 9. 本地运行速查

| 项 | 值 |
| --- | --- |
| 服务端口 | `3000`（环境变量 `PORT`） |
| API 前缀 | `api/v1` |
| 数据库（开发） | SQLite `apps/server/prisma/dev.db`（`DATABASE_URL="file:./dev.db"`） |
| 生产数据库 | 将 `schema.prisma` 的 `provider` 改为 `mysql` 并配置 `DATABASE_URL` |
| 微信 mock | `WECHAT_APPID` / `WECHAT_SECRET` 留空时，`codeToOpenId` 返回 `dev_openid_${code}` |
| JWT 密钥 | 环境变量 `JWT_SECRET`（开发默认见 `.env`） |
