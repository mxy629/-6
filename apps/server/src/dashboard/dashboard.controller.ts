import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { ChildrenService } from '../children/children.service';
import { JwtAuthGuard, ParentGuard, ChildGuard } from '../common/guards';
import { CurrentUser } from '../common/current-user.decorator';

@Controller()
export class DashboardController {
  constructor(
    private readonly dashboard: DashboardService,
    private readonly children: ChildrenService,
  ) {}

  @Get('child/dashboard')
  @UseGuards(JwtAuthGuard, ChildGuard)
  child(@CurrentUser() user: { userId: string }) {
    return this.dashboard.childDashboard(user.userId);
  }

  @Post('child/goal')
  @UseGuards(JwtAuthGuard, ChildGuard)
  setChildGoal(@CurrentUser() user: { userId: string }, @Body() body: { rewardId: string }) {
    return this.children.setChildGoal(user.userId, body?.rewardId ?? '');
  }

  @Get('parent/dashboard')
  @UseGuards(JwtAuthGuard, ParentGuard)
  parent(@CurrentUser() user: { userId: string }, @Query('childId') childId?: string) {
    return this.dashboard.parentDashboard(user.userId, childId);
  }
}
