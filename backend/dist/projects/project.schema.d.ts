import { Document, Types } from 'mongoose';
export type ProjectDocument = Project & Document;
export declare class Project {
    name: string;
    description: string;
    owner: Types.ObjectId;
    members: Types.ObjectId[];
    columns: Array<{
        id: string;
        name: string;
        order: number;
        color: string;
        archived?: boolean;
    }>;
    isArchived: boolean;
}
export declare const ProjectSchema: import("mongoose").Schema<Project, import("mongoose").Model<Project, any, any, any, Document<unknown, any, Project> & Project & {
    _id: Types.ObjectId;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Project, Document<unknown, {}, import("mongoose").FlatRecord<Project>> & import("mongoose").FlatRecord<Project> & {
    _id: Types.ObjectId;
}>;
