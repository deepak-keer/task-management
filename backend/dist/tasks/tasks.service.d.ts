import { Model } from 'mongoose';
import { TaskDocument } from './task.schema';
import { UserDocument } from '../users/user.schema';
import { ProjectDocument } from '../projects/project.schema';
import { AppGateway } from '../gateway/app.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { PermissionsService } from '../permissions/permissions.service';
export declare class TasksService {
    private taskModel;
    private projectModel;
    private appGateway;
    private notificationsService;
    private usersService;
    private permissionsService;
    constructor(taskModel: Model<TaskDocument>, projectModel: Model<ProjectDocument>, appGateway: AppGateway, notificationsService: NotificationsService, usersService: UsersService, permissionsService: PermissionsService);
    private hasPermission;
    private isAssignedTo;
    private canManageTaskDetails;
    private ensureAssigneeCanSeeProject;
    private ensureActiveProjectColumn;
    private getObjectIdString;
    private getTaskNotificationRecipients;
    private notifyTaskParticipants;
    findAll(query: {
        projectId?: string;
        status?: string;
        assignee?: string;
        priority?: string;
        search?: string;
    }, user?: UserDocument): Promise<TaskDocument[]>;
    exportTasks(query: {
        projectId?: string;
        status?: string;
        assignee?: string;
        priority?: string;
        search?: string;
    }, user: UserDocument): Promise<{
        filename: string;
        rows: Array<Record<string, string | number>>;
    }>;
    findMyTasks(userId: string): Promise<TaskDocument[]>;
    findOverdue(userId: string): Promise<TaskDocument[]>;
    findById(id: string, user: UserDocument): Promise<TaskDocument>;
    create(data: {
        title: string;
        description?: string;
        status: string;
        column: string;
        priority?: string;
        projectId: string;
        assigneeId?: string;
        dueDate?: Date;
        labels?: string[];
    }, user: UserDocument): Promise<TaskDocument>;
    update(id: string, data: Partial<{
        title: string;
        description: string;
        status: string;
        column: string;
        priority: string;
        assigneeId: string | null;
        dueDate: Date | null;
        labels: string[];
        subtasks: unknown[];
    }>, user: UserDocument): Promise<TaskDocument>;
    move(id: string, data: {
        column: string;
        status: string;
        order: number;
    }, user: UserDocument): Promise<TaskDocument>;
    delete(id: string, user: UserDocument): Promise<void>;
    addSubtask(taskId: string, title: string, user: UserDocument): Promise<TaskDocument>;
    toggleSubtask(taskId: string, subtaskId: string, user: UserDocument): Promise<TaskDocument>;
    watch(taskId: string, userId: string): Promise<void>;
    unwatch(taskId: string, userId: string): Promise<void>;
    addAttachment(taskId: string, attachment: {
        url: string;
        name: string;
        size: number;
    }, user: UserDocument): Promise<TaskDocument>;
    findDueWithin24h(): Promise<TaskDocument[]>;
}
