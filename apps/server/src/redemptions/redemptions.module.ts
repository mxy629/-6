import { Module } from '@nestjs/common';
import { RedemptionsService } from './redemptions.service';
import { RedemptionsController } from './redemptions.controller';
import { PointsModule } from '../points/points.module';
import { ActivitiesModule } from '../activities/activities.module';

@Module({
  imports: [PointsModule, ActivitiesModule],
  controllers: [RedemptionsController],
  providers: [RedemptionsService],
})
export class RedemptionsModule {}
