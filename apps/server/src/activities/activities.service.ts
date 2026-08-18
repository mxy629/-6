import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

export interface ActivityInput {
  type: string;
  text: string;
  status?: string;
  refType?: string;
  refId?: string;
}

export interface ActivityView {
  type: string;
  text: string;
  status: string;
  at: Date;
}

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  // User.id → ChildProfile.id（Activity.childId 存 ChildProfile.id，与 ledger/wallet 一致）
  private async profileId(userId: string): Promise<string | null> {
    const p = await this.prisma.childProfile.findUnique({ where: { userId } });
    return p?.id ?? null;
  }

  async record(childId: string, parentId: string, input: ActivityInput) {
    if (!childId) return;
    await this.prisma.activity.create({
      data: {
        childId,
        parentId,
        type: input.type,
        text: input.text,
        status: input.status ?? null,
        refType: input.refType ?? null,
        refId: input.refId ?? null,
      },
    });
  }

  // 已知 User.id 时自动解析 ChildProfile.id 再落库（写入点多为 User.id 上下文）
  async recordByUser(userId: string, parentId: string, input: ActivityInput) {
    const cid = await this.profileId(userId);
    if (!cid) return;
    return this.record(cid, parentId, input);
  }

  async listForParent(parentId: string, childUserId?: string, take = 8): Promise<ActivityView[]> {
    const where: Record<string, unknown> = { parentId };
    if (childUserId) {
      const cid = await this.profileId(childUserId);
      if (cid) where.childId = cid;
    }
    const rows = await this.prisma.activity.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
    });
    return rows.map((r) => ({ type: r.type, text: r.text, status: r.status ?? '', at: r.createdAt }));
  }

  async listForChild(childUserId: string, take = 8): Promise<ActivityView[]> {
    const cid = await this.profileId(childUserId);
    if (!cid) return [];
    const rows = await this.prisma.activity.findMany({
      where: { childId: cid },
      orderBy: { createdAt: 'desc' },
      take,
    });
    return rows.map((r) => ({ type: r.type, text: r.text, status: r.status ?? '', at: r.createdAt }));
  }
}
