import { Module } from '@nestjs/common';
import { DueDateScheduler } from './due-date.scheduler';
import { TasksModule } from '../tasks/tasks.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TasksModule, NotificationsModule],
  providers: [DueDateScheduler],
})
export class SchedulerModule {}
