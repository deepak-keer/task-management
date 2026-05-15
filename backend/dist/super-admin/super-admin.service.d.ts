import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../users/user.schema';
import { TaskDocument } from '../tasks/task.schema';
import { ProjectDocument } from '../projects/project.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { AppGateway } from '../gateway/app.gateway';
export declare class SuperAdminService {
    private userModel;
    private taskModel;
    private projectModel;
    private notificationsService;
    private appGateway;
    constructor(userModel: Model<UserDocument>, taskModel: Model<TaskDocument>, projectModel: Model<ProjectDocument>, notificationsService: NotificationsService, appGateway: AppGateway);
    getAllUsers(query: {
        search?: string;
        role?: string;
        status?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        users: Omit<import("mongoose").Document<unknown, {}, UserDocument> & User & import("mongoose").Document<any, any, any> & {
            _id: Types.ObjectId;
        }, never>[];
        total: number;
        page: number;
        limit: number;
    }>;
    getPendingApprovals(): Promise<UserDocument[]>;
    approveUser(id: string, approverId: string): Promise<UserDocument>;
    rejectUser(id: string, reason?: string): Promise<UserDocument>;
    banUser(id: string): Promise<UserDocument>;
    unbanUser(id: string): Promise<UserDocument>;
    deleteUser(id: string): Promise<void>;
    getStats(): Promise<{
        users: {
            total: number;
            byRole: any[];
            newThisWeek: number;
            activeToday: number;
        };
        projects: {
            total: number;
            active: number;
            archived: number;
        };
        tasks: {
            total: number;
            byStatus: any[];
            byPriority: any[];
        };
    }>;
    getAllProjects(): Promise<ProjectDocument[]>;
    archiveProject(id: string): Promise<ProjectDocument>;
    deleteProject(id: string): Promise<void>;
}
