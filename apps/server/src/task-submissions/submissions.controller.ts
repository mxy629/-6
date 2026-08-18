import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { JwtAuthGuard, ParentGuard, ChildGuard } from '../common/guards';
import { CurrentUser } from '../common/current-user.decorator';
import { SubmitTaskDto, RejectTaskDto } from './dto';

@Controller()
export class SubmissionsController {
  constructor(private readonly submissions: SubmissionsService) {}

  @Post('task-instances/:id/submit')
  @UseGuards(JwtAuthGuard, ChildGuard)
  submit(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: SubmitTaskDto,
  ) {
    return this.submissions.submit(user.userId, id, dto);
  }

  @Get('reviews/tasks')
  @UseGuards(JwtAuthGuard, ParentGuard)
  reviews(@CurrentUser() user: { userId: string }) {
    return this.submissions.listReviews(user.userId);
  }

  @Post('task-instances/:id/approve')
  @UseGuards(JwtAuthGuard, ParentGuard)
  approve(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.submissions.approve(user.userId, id);
  }

  @Post('task-instances/:id/reject')
  @UseGuards(JwtAuthGuard, ParentGuard)
  reject(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: RejectTaskDto,
  ) {
    return this.submissions.reject(user.userId, id, dto);
  }
}
