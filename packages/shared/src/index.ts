export enum UserRole {
  PARENT = 'PARENT',
  CHILD = 'CHILD',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
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
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export const TaskStatusLabel: Record<TaskStatus, string> = {
  [TaskStatus.PENDING]: '待完成',
  [TaskStatus.SUBMITTED]: '审核中',
  [TaskStatus.APPROVED]: '已完成',
  [TaskStatus.REJECTED]: '需重新提交',
  [TaskStatus.EXPIRED]: '已过期',
  [TaskStatus.CANCELLED]: '已取消',
};

export const TaskTypeLabel: Record<TaskType, string> = {
  [TaskType.DAILY]: '日常',
  [TaskType.STUDY]: '学习',
  [TaskType.HOUSEWORK]: '家务',
  [TaskType.SPORT]: '运动',
  [TaskType.HABIT]: '习惯',
  [TaskType.OTHER]: '其他',
};

export const RedemptionStatusLabel: Record<RedemptionStatus, string> = {
  [RedemptionStatus.PENDING]: '待确认',
  [RedemptionStatus.APPROVED]: '已同意',
  [RedemptionStatus.REJECTED]: '已拒绝',
  [RedemptionStatus.FULFILLED]: '已完成',
  [RedemptionStatus.CANCELLED]: '已取消',
};

export const PointsTypeLabel: Record<PointsType, string> = {
  [PointsType.TASK_REWARD]: '任务奖励',
  [PointsType.REWARD_REDEEM]: '兑换奖励',
  [PointsType.REWARD_REFUND]: '兑换退款',
  [PointsType.MANUAL_ADJUST]: '人工调整',
};
