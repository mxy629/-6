import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { ChildrenModule } from '../children/children.module';
import { PointsModule } from '../points/points.module';
import { RewardsModule } from '../rewards/rewards.module';
import { ActivitiesModule } from '../activities/activities.module';

@Module({
  imports: [ChildrenModule, PointsModule, RewardsModule, ActivitiesModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
