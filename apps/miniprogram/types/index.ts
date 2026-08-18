export interface AuthUser {
  id: string;
  role: 'PARENT' | 'CHILD';
  nickname: string;
  avatarUrl: string;
}

export interface ChildDto {
  id: string;
  profileId: string;
  nickname: string;
  avatarUrl: string;
  loginName: string;
  pointsBalance: number;
  level: number;
}

export interface TaskInstanceDto {
  id: string;
  taskId: string;
  childId: string;
  date: string;
  deadlineAt: string | null;
  status: string;
  task: {
    id: string;
    title: string;
    description: string | null;
    rewardPoints: number;
    taskType: string;
    requireTextProof: boolean;
    requireImageProof: boolean;
  };
}

export interface RewardDto {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  pointsCost: number;
  stock: number;
  status: string;
}

export interface PointsLedgerDto {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string | null;
  createdAt: string;
}

export interface RedemptionDto {
  id: string;
  rewardId: string;
  reward?: { name: string };
  child?: { nickname: string; avatarUrl?: string };
  pointsCost: number;
  status: string;
  createdAt: string;
}

export interface ChildDashboard {
  profile: { nickname: string; avatarUrl: string };
  points: { balance: number };
  todayTasks: TaskInstanceDto[];
  rewardGoal: { name: string; cost: number; remaining: number } | null;
  goalRewardId: string | null;
  recentActivities: Array<{ type: string; text: string; status: string; at: string }>;
}

export interface ParentDashboard {
  child: { id: string; nickname: string; avatarUrl: string; pointsBalance: number; streak: number } | null;
  todayCompleted: number;
  todayEarned: number;
  pendingReviews: number;
  pendingRedemptions: number;
  todayTasks: TaskInstanceDto[];
  pendingReviewItems: Array<{
    id: string;
    task: { title: string; rewardPoints: number };
    childId: string;
    child: { nickname: string; avatarUrl: string };
    submittedAt: string;
    submissions: Array<{ textProof: string | null; images: Array<{ url: string }> }> | null;
  }>;
  pendingRedemptionItems: Array<{
    id: string;
    rewardId: string;
    reward: { name: string; imageUrl: string | null };
    child: { id: string; nickname: string; avatarUrl: string };
    pointsCost: number;
    createdAt: string;
  }>;
  recentActivities: Array<{ type: string; text: string; status: string; at: string }>;
}
