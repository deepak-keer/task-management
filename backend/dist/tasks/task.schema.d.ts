import { Document, Types } from 'mongoose';
export type TaskDocument = Task & Document;
export declare class Task {
    title: string;
    description: string;
    status: string;
    priority: string;
    project: Types.ObjectId;
    column: string;
    order: number;
    assignee: Types.ObjectId | null;
    createdBy: Types.ObjectId;
    dueDate: Date | null;
    labels: string[];
    subtasks: Array<{
        id: string;
        title: string;
        done: boolean;
    }>;
    attachments: Array<{
        url: string;
        name: string;
        size: number;
        uploadedBy: Types.ObjectId;
        uploadedAt: Date;
    }>;
    watchers: Types.ObjectId[];
    activityLog: Array<{
        action: string;
        performedBy: Types.ObjectId;
        performedAt: Date;
        meta: Record<string, unknown>;
    }>;
}
export declare const TaskSchema: import("mongoose").Schema<Task, import("mongoose").Model<Task, any, any, any, Document<unknown, any, Task> & Task & {
    _id: Types.ObjectId;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Task, Document<unknown, {}, import("mongoose").FlatRecord<Task>> & import("mongoose").FlatRecord<Task> & {
    _id: Types.ObjectId;
}>;
