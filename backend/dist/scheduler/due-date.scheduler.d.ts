import { TasksService } from '../tasks/tasks.service';
import { NotificationsService } from '../notifications/notifications.service';
export declare class DueDateScheduler {
    private tasksService;
    private notificationsService;
    private logger;
    constructor(tasksService: TasksService, notificationsService: NotificationsService);
    checkDueDates(): Promise<void>;
}
