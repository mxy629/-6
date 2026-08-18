import { Module } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { SubmissionsController } from './submissions.controller';
import { PointsModule } from '../points/points.module';
import { ActivitiesModule } from '../activities/activities.module';

@Module({
  imports: [PointsModule, ActivitiesModule],
  controllers: [SubmissionsController],
  providers: [SubmissionsService],
})
export class SubmissionsModule {}
