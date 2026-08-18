import { Module } from '@nestjs/common';
import { ChildrenService } from './children.service';
import { ChildrenController } from './children.controller';
import { ActivitiesModule } from '../activities/activities.module';

@Module({
  controllers: [ChildrenController],
  providers: [ChildrenService],
  exports: [ChildrenService],
  imports: [ActivitiesModule],
})
export class ChildrenModule {}
