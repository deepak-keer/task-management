import { TasksService } from './tasks.service';
import { UserDocument } from '../users/user.schema';
export declare class TasksController {
    private tasksService;
    constructor(tasksService: TasksService);
    findAll(projectId?: string, status?: string, assignee?: string, priority?: string, search?: string, req?: {
        user: UserDocument;
    }): Promise<import("./task.schema").TaskDocument[]>;
    findMyTasks(req: {
        user: UserDocument;
    }): Promise<import("./task.schema").TaskDocument[]>;
    findOverdue(req: {
        user: UserDocument;
    }): Promise<import("./task.schema").TaskDocument[]>;
    findOne(id: string, req: {
        user: UserDocument;
    }): Promise<import("./task.schema").TaskDocument>;
    create(body: {
        title: string;
        description?: string;
        status: string;
        column: string;
        priority?: string;
        projectId: string;
        assigneeId?: string;
        dueDate?: Date;
        labels?: string[];
    }, req: {
        user: UserDocument;
    }): Promise<import("./task.schema").TaskDocument>;
    update(id: string, body: Partial<{
        title: string;
        description: string;
        status: string;
        column: string;
        priority: string;
        assigneeId: string | null;
        dueDate: Date | null;
        labels: string[];
        subtasks: unknown[];
    }>, req: {
        user: UserDocument;
    }): Promise<import("./task.schema").TaskDocument>;
    move(id: string, body: {
        column: string;
        status: string;
        order: number;
    }, req: {
        user: UserDocument;
    }): Promise<import("./task.schema").TaskDocument>;
    remove(id: string, req: {
        user: UserDocument;
    }): Promise<void>;
    addSubtask(id: string, body: {
        title: string;
    }, req: {
        user: UserDocument;
    }): Promise<import("./task.schema").TaskDocument>;
    toggleSubtask(id: string, subtaskId: string, req: {
        user: UserDocument;
    }): Promise<import("./task.schema").TaskDocument>;
    watch(id: string, req: {
        user: UserDocument;
    }): Promise<void>;
    unwatch(id: string, req: {
        user: UserDocument;
    }): Promise<void>;
    addAttachment(id: string, body: {
        url: string;
        name: string;
        size: number;
    }, req: {
        user: UserDocument;
    }): Promise<import("./task.schema").TaskDocument>;
}
