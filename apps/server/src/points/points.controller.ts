import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { PointsService } from './points.service';
import { JwtAuthGuard, ParentGuard, ChildGuard } from '../common/guards';
import { CurrentUser } from '../common/current-user.decorator';

@Controller('points')
export class PointsController {
  constructor(private readonly points: PointsService) {}

  @Get('balance')
  @UseGuards(JwtAuthGuard, ChildGuard)
  balance(@CurrentUser() user: { userId: string }) {
    return this.points.getBalance(user.userId);
  }

  @Get('ledger')
  @UseGuards(JwtAuthGuard, ChildGuard)
  ledger(@CurrentUser() user: { userId: string }) {
    return this.points.getLedger(user.userId);
  }
}

@Controller('children')
export class ChildPointsController {
  constructor(private readonly points: PointsService) {}

  @Get(':id/points')
  @UseGuards(JwtAuthGuard, ParentGuard)
  childBalance(@Param('id') id: string) {
    return this.points.getBalance(id);
  }

  @Get(':id/points/ledger')
  @UseGuards(JwtAuthGuard, ParentGuard)
  childLedger(@Param('id') id: string) {
    return this.points.getLedger(id);
  }
}
