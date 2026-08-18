export const TaskStatusLabel: Record<string, string> = {
  PENDING: '待完成',
  SUBMITTED: '审核中',
  APPROVED: '已完成',
  REJECTED: '需重新提交',
  EXPIRED: '已过期',
  CANCELLED: '已取消',
};

export const TaskTypeLabel: Record<string, string> = {
  DAILY: '日常',
  STUDY: '学习',
  HOUSEWORK: '家务',
  SPORT: '运动',
  HABIT: '习惯',
  OTHER: '其他',
};

export const RedemptionStatusLabel: Record<string, string> = {
  PENDING: '待确认',
  APPROVED: '已同意',
  REJECTED: '已拒绝',
  FULFILLED: '已完成',
  CANCELLED: '已取消',
};

export function formatDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
