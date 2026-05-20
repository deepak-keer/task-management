"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DueDateScheduler = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const tasks_service_1 = require("../tasks/tasks.service");
const notifications_service_1 = require("../notifications/notifications.service");
let DueDateScheduler = class DueDateScheduler {
    constructor(tasksService, notificationsService) {
        this.tasksService = tasksService;
        this.notificationsService = notificationsService;
        this.logger = new common_1.Logger('DueDateScheduler');
    }
    async checkDueDates() {
        this.logger.log('Checking due dates...');
        try {
            const tasks = await this.tasksService.findDueWithin24h();
            for (const task of tasks) {
                const assignee = task.assignee;
                if (!assignee || !assignee.notificationPrefs?.dueDateReminder)
                    continue;
                const dueDate = task.dueDate;
                const hoursLeft = Math.round((dueDate.getTime() - Date.now()) / (1000 * 60 * 60));
                await this.notificationsService.create({
                    recipient: assignee._id.toString(),
                    type: 'due_reminder',
                    message: `Task "${task.title}" is due in ${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}`,
                    link: `/projects/${task.project}?task=${task._id}`,
                    meta: { taskId: task._id, dueDate: task.dueDate },
                });
            }
            this.logger.log(`Sent due date reminders for ${tasks.length} tasks`);
        }
        catch (error) {
            this.logger.error('Error checking due dates', error);
        }
    }
};
exports.DueDateScheduler = DueDateScheduler;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DueDateScheduler.prototype, "checkDueDates", null);
exports.DueDateScheduler = DueDateScheduler = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tasks_service_1.TasksService,
        notifications_service_1.NotificationsService])
], DueDateScheduler);
//# sourceMappingURL=due-date.scheduler.js.map