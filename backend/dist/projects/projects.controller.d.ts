import { ProjectsService } from './projects.service';
import { UserDocument } from '../users/user.schema';
export declare class ProjectsController {
    private projectsService;
    constructor(projectsService: ProjectsService);
    findAll(req: {
        user: UserDocument;
    }): Promise<import("./project.schema").ProjectDocument[]>;
    findOne(id: string, req: {
        user: UserDocument;
    }): Promise<import("./project.schema").ProjectDocument>;
    create(body: {
        name: string;
        description?: string;
    }, req: {
        user: UserDocument;
    }): Promise<import("./project.schema").ProjectDocument>;
    update(id: string, body: Partial<{
        name: string;
        description: string;
        columns: unknown[];
    }>, req: {
        user: UserDocument;
    }): Promise<import("./project.schema").ProjectDocument>;
    archive(id: string, req: {
        user: UserDocument;
    }): Promise<import("./project.schema").ProjectDocument>;
    remove(id: string, req: {
        user: UserDocument;
    }): Promise<void>;
    addMember(id: string, body: {
        userId: string;
    }, req: {
        user: UserDocument;
    }): Promise<import("./project.schema").ProjectDocument>;
    removeMember(id: string, userId: string, req: {
        user: UserDocument;
    }): Promise<import("./project.schema").ProjectDocument>;
}
