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
import { TasksService } from './tasks.service';
import { JwtAuthGuard, ParentGuard, ChildGuard } from '../common/guards';
import { CurrentUser } from '../common/current-user.decorator';
import { CreateTaskDto, UpdateTaskDto } from './dto';

@Controller()
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  // 家长端
  @Post('tasks')
  @UseGuards(JwtAuthGuard, ParentGuard)
  create(@CurrentUser() user: { userId: string }, @Body() dto: CreateTaskDto) {
    return this.tasks.create(user.userId, dto);
  }

  @Get('tasks')
  @UseGuards(JwtAuthGuard, ParentGuard)
  findAll(@CurrentUser() user: { userId: string }) {
    return this.tasks.findAllForParent(user.userId);
  }

  @Get('tasks/:id')
  @UseGuards(JwtAuthGuard, ParentGuard)
  findOne(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.tasks.findOneForParent(user.userId, id);
  }

  @Patch('tasks/:id')
  @UseGuards(JwtAuthGuard, ParentGuard)
  update(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasks.update(user.userId, id, dto);
  }

  @Delete('tasks/:id')
  @UseGuards(JwtAuthGuard, ParentGuard)
  remove(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.tasks.remove(user.userId, id);
  }

  // 孩子端
  @Get('child/tasks/today')
  @UseGuards(JwtAuthGuard, ChildGuard)
  today(@CurrentUser() user: { userId: string }) {
    return this.tasks.childToday(user.userId);
  }

  @Get('child/tasks')
  @UseGuards(JwtAuthGuard, ChildGuard)
  all(@CurrentUser() user: { userId: string }) {
    return this.tasks.childAll(user.userId);
  }

  @Get('child/tasks/:instanceId')
  @UseGuards(JwtAuthGuard, ChildGuard)
  detail(@CurrentUser() user: { userId: string }, @Param('instanceId') instanceId: string) {
    return this.tasks.childInstanceDetail(user.userId, instanceId);
  }
}
