import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { RedemptionsService } from './redemptions.service';
import { JwtAuthGuard, ParentGuard, ChildGuard } from '../common/guards';
import { CurrentUser } from '../common/current-user.decorator';

@Controller()
export class RedemptionsController {
  constructor(private readonly redemptions: RedemptionsService) {}

  @Post('rewards/:id/redeem')
  @UseGuards(JwtAuthGuard, ChildGuard)
  redeem(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.redemptions.redeem(user.userId, id);
  }

  @Get('child/redemptions')
  @UseGuards(JwtAuthGuard, ChildGuard)
  childList(@CurrentUser() user: { userId: string }) {
    return this.redemptions.listForChild(user.userId);
  }

  @Get('redemptions')
  @UseGuards(JwtAuthGuard, ParentGuard)
  parentList(@CurrentUser() user: { userId: string }) {
    return this.redemptions.listForParent(user.userId);
  }

  @Post('redemptions/:id/approve')
  @UseGuards(JwtAuthGuard, ParentGuard)
  approve(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.redemptions.approve(user.userId, id);
  }

  @Post('redemptions/:id/reject')
  @UseGuards(JwtAuthGuard, ParentGuard)
  reject(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.redemptions.reject(user.userId, id);
  }

  @Post('redemptions/:id/fulfill')
  @UseGuards(JwtAuthGuard, ParentGuard)
  fulfill(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.redemptions.fulfill(user.userId, id);
  }
}
