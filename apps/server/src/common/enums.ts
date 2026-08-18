// 后端业务枚举（与 packages/shared 保持一致，作为服务端运行的本地副本，
// 避免跨 workspace 包在 prod 构建/运行时需要额外的路径别名解析）。
export enum UserRole {
  PARENT = 'PARENT',
  CHILD = 'CHILD',
}

export enum TaskType {
  DAILY = 'DAILY',
  STUDY = 'STUDY',
  HOUSEWORK = 'HOUSEWORK',
  SPORT = 'SPORT',
  HABIT = 'HABIT',
  OTHER = 'OTHER',
}

export enum TaskRepeatType {
  NONE = 'NONE',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
}

export enum TaskStatus {
  PENDING = 'PENDING',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum RedemptionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  FULFILLED = 'FULFILLED',
  CANCELLED = 'CANCELLED',
}

export enum PointsType {
  TASK_REWARD = 'TASK_REWARD',
  REWARD_REDEEM = 'REWARD_REDEEM',
  REWARD_REFUND = 'REWARD_REFUND',
  MANUAL_ADJUST = 'MANUAL_ADJUST',
}

export enum RewardStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export const RewardStatusLabel: Record<RewardStatus, string> = {
  [RewardStatus.DRAFT]: '草稿',
  [RewardStatus.ACTIVE]: '上架中',
  [RewardStatus.INACTIVE]: '已下架',
};

export const TaskStatusLabel: Record<TaskStatus, string> = {
  [TaskStatus.PENDING]: '待完成',
  [TaskStatus.SUBMITTED]: '审核中',
  [TaskStatus.APPROVED]: '已完成',
  [TaskStatus.REJECTED]: '需重新提交',
  [TaskStatus.EXPIRED]: '已过期',
  [TaskStatus.CANCELLED]: '已取消',
};

export const RedemptionStatusLabel: Record<RedemptionStatus, string> = {
  [RedemptionStatus.PENDING]: '待确认',
  [RedemptionStatus.APPROVED]: '已同意',
  [RedemptionStatus.REJECTED]: '已拒绝',
  [RedemptionStatus.FULFILLED]: '已完成',
  [RedemptionStatus.CANCELLED]: '已取消',
};
