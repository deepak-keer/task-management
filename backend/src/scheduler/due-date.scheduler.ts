import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TasksService } from '../tasks/tasks.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class DueDateScheduler {
  private logger = new Logger('DueDateScheduler');

  constructor(
    private tasksService: TasksService,
    private notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async checkDueDates(): Promise<void> {
    this.logger.log('Checking due dates...');

    try {
      const tasks = await this.tasksService.findDueWithin24h();

      for (const task of tasks) {
        const assignee = task.assignee as unknown as {
          _id: string;
          name: string;
          notificationPrefs: { dueDateReminder: boolean };
        };

        if (!assignee || !assignee.notificationPrefs?.dueDateReminder) continue;

        const dueDate = task.dueDate as Date;
        const hoursLeft = Math.round((dueDate.getTime() - Date.now()) / (1000 * 60 * 60));

        await this.notificationsService.create({
          recipient: assignee._id.toString(),
          type: 'due_reminder',
          message: `Task "${task.title}" is due in ${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}`,
          link: `/projects/${task.project}?task=${task._id}`,
          meta: {
            taskId: task._id,
            projectId: task.project,
            dueDate: task.dueDate,
            taskTitle: task.title,
            actorName: 'TaskFlow reminder',
          },
        });
      }

      this.logger.log(`Sent due date reminders for ${tasks.length} tasks`);
    } catch (error) {
      this.logger.error('Error checking due dates', error);
    }
  }
}
