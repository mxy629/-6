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
import { ChildrenService } from './children.service';
import { JwtAuthGuard, ParentGuard } from '../common/guards';
import { CurrentUser } from '../common/current-user.decorator';
import { CreateChildDto, UpdateChildDto, ResetPinDto, SetGoalDto } from './dto';

@Controller('children')
@UseGuards(JwtAuthGuard, ParentGuard)
export class ChildrenController {
  constructor(private readonly children: ChildrenService) {}

  @Post()
  create(@CurrentUser() user: { userId: string }, @Body() dto: CreateChildDto) {
    return this.children.create(user.userId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: { userId: string }) {
    return this.children.findAll(user.userId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.children.findOne(user.userId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: UpdateChildDto,
  ) {
    return this.children.update(user.userId, id, dto);
  }

  @Post(':id/reset-pin')
  resetPin(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: ResetPinDto,
  ) {
    return this.children.resetPin(user.userId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.children.remove(user.userId, id);
  }

  @Patch(':id/goal')
  setGoal(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: SetGoalDto,
  ) {
    return this.children.setGoal(user.userId, id, dto.rewardId);
  }
}
