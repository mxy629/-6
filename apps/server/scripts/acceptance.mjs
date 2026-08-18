// 成长星球 MVP 验收脚本（流程 A-G）。直接请求本地运行的服务端。
const BASE = 'http://localhost:3000/api/v1';

async function call(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, json };
}

function assert(cond, msg) {
  if (!cond) { console.error('❌ FAIL:', msg); process.exitCode = 1; }
  else console.log('✅', msg);
}

const run = async () => {
  // 流程 A: 家长登录 + 孩子登录
  const pLogin = await call('POST', '/auth/wechat', { body: { code: 'seed_parent' } });
  assert(pLogin.json.success && pLogin.json.data?.accessToken, 'A-家长微信登录获取 token');
  const PARENT = pLogin.json.data.accessToken;
  const parentId = pLogin.json.data.user.id;

  const cLogin = await call('POST', '/auth/child-login', { body: { loginName: 'xiaoyu', pin: '2580' } });
  assert(cLogin.json.success && cLogin.json.data?.accessToken, 'A-孩子 xiaoyu 登录获取 token');
  const CHILD = cLogin.json.data.accessToken;
  const childUserId = cLogin.json.data.user.id;

  // 列出孩子，确认归属
  const children = await call('GET', '/children', { token: PARENT });
  assert(children.json.data?.some((c) => c.id === childUserId), '家长可看到自己孩子');

  // 流程 B: 发布任务 -> 孩子提交 -> 家长通过 -> 积分+20
  const beforeBalance = (await call('GET', '/points/balance', { token: CHILD })).json.data.balance;
  const createTask = await call('POST', '/tasks', {
    token: PARENT,
    body: {
      childId: childUserId,
      title: '阅读20分钟',
      rewardPoints: 20,
      taskType: 'STUDY',
      repeatType: 'NONE',
    },
  });
  assert(createTask.json.success, 'B-家长发布任务成功');
  const taskId = createTask.json.data.id;

  // 孩子的今日任务应包含该任务实例
  const today = await call('GET', '/child/tasks/today', { token: CHILD });
  const inst = today.json.data.find((t) => t.task.id === taskId);
  assert(inst, 'B-孩子今日任务包含新任务');
  const instanceId = inst.id;

  // 孩子提交
  const submit = await call('POST', `/task-instances/${instanceId}/submit`, {
    token: CHILD,
    body: { textProof: '今天读了20分钟《小王子》', images: [] },
  });
  assert(submit.json.success, 'B-孩子提交任务成功');

  // 家长待审核列表
  const reviews = await call('GET', '/reviews/tasks', { token: PARENT });
  const pending = reviews.json.data.find((r) => r.id === instanceId);
  assert(pending && pending.status === 'SUBMITTED', 'B-家长看到待审核任务(SUBMITTED)');

  // 第一次通过
  const firstApprove = await call('POST', `/task-instances/${instanceId}/approve`, { token: PARENT });
  assert(firstApprove.json.success, 'B-家长首次通过任务');
  // 重复通过应幂等（仅一次积分，不重复发放）
  const balMid = (await call('GET', '/points/balance', { token: CHILD })).json.data.balance;
  const approveAgain = await call('POST', `/task-instances/${instanceId}/approve`, { token: PARENT });
  const balAfterIdem = (await call('GET', '/points/balance', { token: CHILD })).json.data.balance;
  assert(approveAgain.json.success && balAfterIdem === balMid, 'B-已通过任务重复通过幂等(积分不再增加)');

  const afterBalance = (await call('GET', '/points/balance', { token: CHILD })).json.data.balance;
  assert(afterBalance === beforeBalance + 20, `B-孩子积分 +20 (${beforeBalance} -> ${afterBalance})`);

  const ledger = await call('GET', '/points/ledger', { token: CHILD });
  const rewards = ledger.json.data.filter((l) => l.bizType === 'TASK_REWARD' && l.bizId === instanceId);
  assert(rewards.length === 1, 'B-积分流水仅一条 TASK_REWARD(防重复发积分)');

  // 流程 C: 驳回 -> 重新提交 -> 通过(只一次积分)
  const cCreate = await call('POST', '/tasks', {
    token: PARENT,
    body: { childId: childUserId, title: '整理书桌C', rewardPoints: 10, taskType: 'HOUSEWORK', repeatType: 'NONE' },
  });
  const cInst = (await call('GET', '/child/tasks/today', { token: CHILD })).json.data.find((t) => t.task.id === cCreate.json.data.id);
  await call('POST', `/task-instances/${cInst.id}/submit`, { token: CHILD, body: { textProof: '整理好了' } });
  const reject = await call('POST', `/task-instances/${cInst.id}/reject`, { token: PARENT, body: { reason: '照片太模糊' } });
  assert(reject.json.success, 'C-家长驳回任务');
  const balAfterReject = (await call('GET', '/points/balance', { token: CHILD })).json.data.balance;
  assert(balAfterReject === afterBalance, 'C-驳回不发放积分');
  // 重新提交
  const resubmit = await call('POST', `/task-instances/${cInst.id}/submit`, { token: CHILD, body: { textProof: '重新拍了清晰照片' } });
  assert(resubmit.json.success, 'C-孩子重新提交成功');
  await call('POST', `/task-instances/${cInst.id}/approve`, { token: PARENT });
  await call('POST', `/task-instances/${cInst.id}/approve`, { token: PARENT }); // 幂等
  const balAfterC = (await call('GET', '/points/balance', { token: CHILD })).json.data.balance;
  assert(balAfterC === afterBalance + 10, `C-重新提交通过后只 +10 (${afterBalance} -> ${balAfterC})`);

  // 流程 D: 兑换奖励 -> 扣积分
  const rewardsList = await call('GET', '/child/rewards', { token: CHILD });
  const movie = rewardsList.json.data.find((r) => r.name === '看电影一次');
  assert(movie && movie.pointsCost === 200, 'D-孩子看到奖励「看电影一次」200积分');
  const balBeforeRedeem = (await call('GET', '/points/balance', { token: CHILD })).json.data.balance;
  const redeem = await call('POST', `/rewards/${movie.id}/redeem`, { token: CHILD });
  assert(redeem.json.success, 'D-孩子兑换成功');
  const balAfterRedeem = (await call('GET', '/points/balance', { token: CHILD })).json.data.balance;
  assert(balAfterRedeem === balBeforeRedeem - 200, `D-兑换后积分 -200 (${balBeforeRedeem} -> ${balAfterRedeem})`);

  // 流程 E: 家长拒绝兑换 -> 自动退款
  const parentReds = await call('GET', '/redemptions', { token: PARENT });
  const red = parentReds.json.data.find((r) => r.rewardId === movie.id && r.status === 'PENDING');
  assert(red, 'E-家长看到待确认兑换');
  const rejectRed = await call('POST', `/redemptions/${red.id}/reject`, { token: PARENT });
  if (!rejectRed.json.success) console.log('DEBUG reject raw:', JSON.stringify(rejectRed.json), 'status', rejectRed.status);
  assert(rejectRed.json.success, 'E-家长拒绝兑换');
  const balAfterRejectRed = (await call('GET', '/points/balance', { token: CHILD })).json.data.balance;
  assert(balAfterRejectRed === balBeforeRedeem, `E-拒绝后积分自动退回 (${balAfterRedeem} -> ${balAfterRejectRed})`);
  const ledger2 = await call('GET', '/points/ledger', { token: CHILD });
  const hasRedeem = ledger2.json.data.some((l) => l.bizId === red.id && l.type === 'REWARD_REDEEM');
  const hasRefund = ledger2.json.data.some((l) => l.bizId === red.id && l.type === 'REWARD_REFUND');
  assert(hasRedeem && hasRefund, 'E-积分流水同时存在 REDEEM 与 REFUND');

  // 额外：拒绝兑换不可重复退款
  const rejectAgain = await call('POST', `/redemptions/${red.id}/reject`, { token: PARENT });
  assert(!rejectAgain.json.success, 'E-已拒绝兑换重复拒绝被拒绝(幂等)');

  // 流程 F: 奖励任意状态可修改（草稿 -> 上架 -> 上架态修改成功 -> 下架 -> 下架态修改成功）
  const fCreate = await call('POST', '/rewards', {
    token: PARENT,
    body: { name: '临时奖励F', pointsCost: 120, stock: 1 },
  });
  assert(fCreate.json.success && fCreate.json.data.status === 'DRAFT', 'F-新建奖励默认为草稿(DRAFT)');
  const rewardFId = fCreate.json.data.id;

  // 草稿态孩子端不可见
  const childBeforePublish = await call('GET', '/child/rewards', { token: CHILD });
  assert(!childBeforePublish.json.data.some((r) => r.id === rewardFId), 'F-草稿态孩子端不可见');

  const fPublish = await call('POST', `/rewards/${rewardFId}/publish`, { token: PARENT });
  assert(fPublish.json.success && fPublish.json.data.status === 'ACTIVE', 'F-奖励上架成功(ACTIVE)');

  // 上架后孩子端可见
  const childAfterPublish = await call('GET', '/child/rewards', { token: CHILD });
  assert(childAfterPublish.json.data.some((r) => r.id === rewardFId), 'F-上架后孩子端可见');

  // 上架后修改内容应成功（任意状态均可改）
  const fEditOk = await call('PATCH', `/rewards/${rewardFId}`, {
    token: PARENT,
    body: { name: '改名成功', pointsCost: 130 },
  });
  assert(fEditOk.json.success && fEditOk.json.data.name === '改名成功' && fEditOk.json.data.status === 'ACTIVE', 'F-上架后仍可修改内容(返回ACTIVE)');

  // 修改后孩子端实时可见（名称已更新）
  const childAfterEdit = await call('GET', '/child/rewards', { token: CHILD });
  const edited = childAfterEdit.json.data.find((r) => r.id === rewardFId);
  assert(edited && edited.name === '改名成功', 'F-上架后修改对孩子端实时生效');

  // 下架
  const fUnpublish = await call('DELETE', `/rewards/${rewardFId}`, { token: PARENT });
  assert(fUnpublish.json.success && fUnpublish.json.data?.status === 'INACTIVE', 'F-奖励下架成功(INACTIVE)');
  const fEditAgain = await call('PATCH', `/rewards/${rewardFId}`, {
    token: PARENT,
    body: { name: '下架态也能改', pointsCost: 140 },
  });
  assert(fEditAgain.json.success && fEditAgain.json.data.name === '下架态也能改', 'F-下架态也可修改内容');

  // 重新上架
  const fRepublish = await call('POST', `/rewards/${rewardFId}/publish`, { token: PARENT });
  assert(fRepublish.json.success && fRepublish.json.data.status === 'ACTIVE', 'F-重新上架成功(ACTIVE)');

  // 流程 G: 手机号注册 + 验证码登录（仅家长）
  // 每次运行使用随机手机号，避免与历史数据冲突，保证脚本可重复执行
  const G_PHONE = '13' + String(Math.floor(Math.random() * 1e9)).padStart(9, '0');
  const gSend = await call('POST', '/auth/send-code', { body: { phone: G_PHONE, purpose: 'REGISTER' } });
  assert(gSend.json.success && /^\d{6}$/.test(gSend.json.data?.devCode || ''), 'G-发送注册验证码成功(返回6位开发码)');
  const gReg = await call('POST', '/auth/register', { body: { phone: G_PHONE, code: gSend.json.data.devCode, nickname: '手机家长' } });
  assert(gReg.json.success && gReg.json.data?.accessToken && gReg.json.data.user.role === 'PARENT', 'G-手机号注册成功(PARENT token)');
  const G_TOKEN = gReg.json.data.accessToken;

  const gDash = await call('GET', '/parent/dashboard', { token: G_TOKEN });
  assert(gDash.json.success, 'G-注册账号可调用家长接口');

  const gSend2 = await call('POST', '/auth/send-code', { body: { phone: G_PHONE, purpose: 'LOGIN' } });
  assert(gSend2.json.success, 'G-发送登录验证码成功');
  const gLogin = await call('POST', '/auth/phone-login', { body: { phone: G_PHONE, code: gSend2.json.data.devCode } });
  assert(gLogin.json.success && gLogin.json.data?.accessToken, 'G-手机号验证码登录成功');

  // 60 秒内重复发送同用途验证码应被限频
  const gSend3 = await call('POST', '/auth/send-code', { body: { phone: G_PHONE, purpose: 'REGISTER' } });
  assert(!gSend3.json.success && gSend3.json.code === 'SMS_RATE_LIMIT', 'G-频繁发送验证码被限频(SMS_RATE_LIMIT)');

  console.log('\n验收脚本执行完毕。退出码:', process.exitCode || 0);
};

run().catch((e) => { console.error('脚本异常:', e); process.exit(1); });
