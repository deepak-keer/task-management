import { SuperAdminService } from './super-admin.service';
import { UserDocument } from '../users/user.schema';
export declare class SuperAdminController {
    private superAdminService;
    constructor(superAdminService: SuperAdminService);
    getAllUsers(search?: string, role?: string, status?: string, page?: number, limit?: number): Promise<{
        users: Omit<import("mongoose").Document<unknown, {}, UserDocument> & import("../users/user.schema").User & import("mongoose").Document<any, any, any> & {
            _id: import("mongoose").Types.ObjectId;
        }, never>[];
        total: number;
        page: number;
        limit: number;
    }>;
    getPendingApprovals(): Promise<UserDocument[]>;
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
            byStatus: {
                _id: any;
                name: string;
                count: any;
            }[];
            byPriority: any[];
        };
    }>;
    getAllProjects(): Promise<import("../projects/project.schema").ProjectDocument[]>;
    approveUser(id: string, req: {
        user: UserDocument;
    }): Promise<UserDocument>;
    rejectUser(id: string, body: {
        reason?: string;
    }): Promise<UserDocument>;
    banUser(id: string): Promise<UserDocument>;
    unbanUser(id: string): Promise<UserDocument>;
    deleteUser(id: string): Promise<void>;
    archiveProject(id: string): Promise<import("../projects/project.schema").ProjectDocument>;
    restoreProject(id: string): Promise<import("../projects/project.schema").ProjectDocument>;
    deleteProject(id: string): Promise<void>;
}
