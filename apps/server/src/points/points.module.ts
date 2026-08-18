import { Module } from '@nestjs/common';
import { PointsService } from './points.service';
import { PointsController, ChildPointsController } from './points.controller';

@Module({
  controllers: [PointsController, ChildPointsController],
  providers: [PointsService],
  exports: [PointsService],
})
export class PointsModule {}
