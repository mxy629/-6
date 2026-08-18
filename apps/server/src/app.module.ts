import { Module } from '@nestjs/common';
import { CoreModule } from './common/core.module';
import { AuthModule } from './auth/auth.module';
import { ChildrenModule } from './children/children.module';
import { TasksModule } from './tasks/tasks.module';
import { SubmissionsModule } from './task-submissions/submissions.module';
import { PointsModule } from './points/points.module';
import { RewardsModule } from './rewards/rewards.module';
import { RedemptionsModule } from './redemptions/redemptions.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ActivitiesModule } from './activities/activities.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    CoreModule,
    AuthModule,
    ChildrenModule,
    TasksModule,
    SubmissionsModule,
    PointsModule,
    RewardsModule,
    RedemptionsModule,
    DashboardModule,
    ActivitiesModule,
    HealthModule,
  ],
})
export class AppModule {}
