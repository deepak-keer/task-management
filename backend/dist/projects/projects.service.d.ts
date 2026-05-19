import { Model } from 'mongoose';
import { ProjectDocument } from './project.schema';
import { TaskDocument } from '../tasks/task.schema';
import { UserDocument } from '../users/user.schema';
import { AppGateway } from '../gateway/app.gateway';
export declare class ProjectsService {
    private projectModel;
    private taskModel;
    private appGateway;
    constructor(projectModel: Model<ProjectDocument>, taskModel: Model<TaskDocument>, appGateway: AppGateway);
    private canManageColumns;
    private normalizeColumns;
    private ensureColumns;
    private getProjectForColumnUpdate;
    private saveColumns;
    findAll(user: UserDocument): Promise<ProjectDocument[]>;
    findById(id: string, user: UserDocument): Promise<ProjectDocument>;
    create(data: {
        name: string;
        description?: string;
    }, user: UserDocument): Promise<ProjectDocument>;
    update(id: string, data: Partial<{
        name: string;
        description: string;
        columns: unknown[];
    }>, user: UserDocument): Promise<ProjectDocument>;
    addColumn(projectId: string, data: {
        name: string;
        color?: string;
    }, user: UserDocument): Promise<ProjectDocument>;
    updateColumn(projectId: string, columnId: string, data: {
        name?: string;
        color?: string;
    }, user: UserDocument): Promise<ProjectDocument>;
    deleteColumn(projectId: string, columnId: string, user: UserDocument): Promise<ProjectDocument>;
    archiveColumn(projectId: string, columnId: string, user: UserDocument): Promise<ProjectDocument>;
    restoreColumn(projectId: string, columnId: string, user: UserDocument): Promise<ProjectDocument>;
    reorderColumns(projectId: string, columnIds: string[], user: UserDocument): Promise<ProjectDocument>;
    archive(id: string, user: UserDocument): Promise<ProjectDocument>;
    delete(id: string, user: UserDocument): Promise<void>;
    addMember(projectId: string, userId: string, requester: UserDocument): Promise<ProjectDocument>;
    removeMember(projectId: string, userId: string, requester: UserDocument): Promise<ProjectDocument>;
}
