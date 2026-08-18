# 上架准备清单（微信小程序）

> 现状：项目已在本地端到端跑通（后端验收 A–E 全绿，小程序类型检查 0 错误）。
> 以下是从「本地可跑」到「能提交审核并上架」必须补齐的事项，按优先级排列。

---

## 0. 前置：账号与主体

- [ ] 注册微信小程序账号（mp.weixin.qq.com），完成**主体认证**（个人/企业）。
- [ ] 获取**真实 AppID**，替换 `apps/miniprogram/project.config.json` 里的 `touristappid`。
- [ ] 在开发者工具「详情 → 本地设置」取消勾选「不校验合法域名」（上架前必须关闭）。

---

## 1. 服务器与域名（阻塞性）

- [ ] 准备已 **ICP 备案**的域名（微信要求 request 合法域名必须备案 + HTTPS）。
- [ ] 后端部署到公网：`MySQL` + 进程守护（pm2 / Docker）+ 反代（`nginx` 终止 TLS）。
- [ ] 将 `apps/server/.env` 的 `DATABASE_URL` 改为生产 MySQL，执行 `npx prisma migrate deploy`。
- [ ] 微信公众平台「开发设置 → 服务器域名」配置：
  - request 合法域名：`https://your-api-domain.com`
  - uploadFile / downloadFile 合法域名（若用对象存储）：`https://your-cos-domain.com`
- [ ] 修改 `apps/miniprogram/services/request.ts` 的 `BASE_URL` 为 `https://your-api-domain.com/api/v1`。
- [ ] **收紧 CORS**：当前 `app.enableCors()` 全开，生产改为仅允许你的小程序域名（`origin: ['https://your-api-domain.com']` 或按微信域名白名单）。

---

## 2. 微信登录真实化

- [ ] 去掉 `wechat.util.ts` 的 mock（`dev_openid_${code}`），改为调用 `auth.code2Session` 拿 `openid` / `session_key`。
- [ ] 用 `session_key` 校验前端 `wx.login` 真实性（或配合 `getPhoneNumber` 拿手机号需企业主体）。
- [ ] 注意：`code` 一次性有效，服务端换取后缓存 `session_key`（建议 Redis）。

---

## 2.5 短信服务真实化（手机号注册/登录前置）

注册/登录用的短信当前为 `mock`（`devCode` 直接返回）。上架前必须切换为真实短信：

- [ ] `npm i tencentcloud-sdk-nodejs-sms`（骨架已就位：`src/sms/sms.tencent.ts`，无需改业务代码）。
- [ ] 腾讯云短信控制台：创建签名（如「成长星球」）、创建验证码模板（首个参数即验证码），拿到 `SMS_SDK_APP_ID` / `SMS_SIGN` / `SMS_TEMPLATE_ID`，并开通服务。
- [ ] 在 `apps/server/.env` 配置 `SMS_PROVIDER=tencent` 并填齐 `SMS_SECRET_ID` / `SMS_SECRET_KEY`（密钥不入库、不进代码）。
- [ ] **缺配置/未装 SDK 时服务启动即抛 `SMS_NOT_CONFIGURED` 清晰报错**（fail-fast），可据此快速排障；上线后用真实手机号自测一次发送/登录。

---

## 3. 内容安全（UGC 必过，否则审核驳回）

孩子提交的**文字说明**和**照片**属于 UGC，上架前必须接入微信内容安全：

- [ ] 文本：`msgSecCheck`（提交审核前对 `textProof` 检测）。
- [ ] 图片：`imgSecCheck`（对提交的图片检测），或先在 `wx.uploadFile` 前检测。
- [ ] 不合规内容拦截并提示，不进入审核流。

---

## 4. 图片/文件存储

- [ ] 当前 `chooseMedia` 临时路径直接入库（仅演示）。生产改为：
  `wx.uploadFile` → 对象存储（腾讯云 COS / 阿里 OSS）→ 存返回 URL。
- [ ] 配置 uploadFile 合法域名（见第 1 条）。
- [ ] 提交接口 `POST /task-instances/:id/submit` 的 `images` 改为接收 URL 数组。

---

## 5. 隐私与合规

- [ ] 配置《隐私保护指引》（公众平台「设置 → 服务内容」+ 代码内 `wx.requirePrivacyAuthorize` 弹窗）。
- [ ] 收集儿童信息需监护人同意，登录名/PIN 等做脱敏与加密存储（PIN 已 bcrypt，登录名建议不展示明文）。
- [ ] 未成年人保护：避免过度诱导、明确积分仅虚拟激励、不涉及真实金钱交易。
- [ ] 若奖励兑换涉及实物/真实履约，需补充客服与售后说明。

---

## 6. 类目与资质

- [ ] 选择正确服务类目（如「教育 → 家庭教育」/「工具 → 效率」），按类目提交所需资质
      （部分类目需《增值电信业务经营许可证》等）。
- [ ] 提交审核前用真机走一遍核心闭环，截图留存。

---

## 7. 代码收尾

- [ ] 移除所有 `localhost` 硬编码、调试日志、`touristappid`、游客登录分支。
- [ ] 确认 `npm run build:server` 通过、小程序「上传代码」成功。
- [ ] 体验版/开发版自测无误后提交审核 → 发布。

---

## 验收门槛（上线前自检）

| 项 | 状态 |
|----|------|
| 本地闭环 A–E 通过 | ✅ 已完成 |
| 小程序类型检查 0 错误 | ✅ 已完成 |
| HTTPS + 备案域名 | ⬜ 需准备 |
| 微信登录真实化 | ⬜ 需开发 |
| 短信服务真实化 | ⬜ 需配置 |
| UGC 内容安全 | ⬜ 需接入 |
| 图片上云 | ⬜ 需开发 |
| 隐私指引 + 类目资质 | ⬜ 需配置 |
