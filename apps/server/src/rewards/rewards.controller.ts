import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RewardsService } from './rewards.service';
import { JwtAuthGuard, ParentGuard, ChildGuard } from '../common/guards';
import { CurrentUser } from '../common/current-user.decorator';
import { CreateRewardDto, UpdateRewardDto } from './dto';

@Controller()
export class RewardsController {
  constructor(private readonly rewards: RewardsService) {}

  @Post('rewards')
  @UseGuards(JwtAuthGuard, ParentGuard)
  create(@CurrentUser() user: { userId: string }, @Body() dto: CreateRewardDto) {
    return this.rewards.create(user.userId, dto);
  }

  @Get('rewards')
  @UseGuards(JwtAuthGuard, ParentGuard)
  findAll(@CurrentUser() user: { userId: string }) {
    return this.rewards.findAllForParent(user.userId);
  }

  @Get('rewards/:id')
  @UseGuards(JwtAuthGuard, ParentGuard)
  findOne(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.rewards.findOneForParent(user.userId, id);
  }

  @Patch('rewards/:id')
  @UseGuards(JwtAuthGuard, ParentGuard)
  update(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: UpdateRewardDto,
  ) {
    return this.rewards.update(user.userId, id, dto);
  }

  @Delete('rewards/:id')
  @UseGuards(JwtAuthGuard, ParentGuard)
  remove(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.rewards.remove(user.userId, id);
  }

  @Delete('rewards/:id/permanent')
  @UseGuards(JwtAuthGuard, ParentGuard)
  hardRemove(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.rewards.hardRemove(user.userId, id);
  }

  @Post('rewards/:id/publish')
  @UseGuards(JwtAuthGuard, ParentGuard)
  publish(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.rewards.publish(user.userId, id);
  }

  @Get('child/rewards')
  @UseGuards(JwtAuthGuard, ChildGuard)
  childList(@CurrentUser() user: { userId: string }) {
    return this.rewards.listForChild(user.userId);
  }

  @Get('child/rewards/:id')
  @UseGuards(JwtAuthGuard, ChildGuard)
  childDetail(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.rewards.findOneForChild(user.userId, id);
  }
}
