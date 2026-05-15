import { Document, Types } from 'mongoose';
export type RolePermissionsDocument = RolePermissions & Document;
export declare class RolePermissions {
    role: string;
    features: {
        invite_members: boolean;
        remove_members: boolean;
        create_projects: boolean;
        delete_projects: boolean;
        archive_projects: boolean;
        assign_roles: boolean;
        view_analytics: boolean;
        manage_columns: boolean;
        create_tasks: boolean;
        delete_own_tasks: boolean;
        delete_any_task: boolean;
        move_tasks: boolean;
        assign_tasks: boolean;
        comment_on_tasks: boolean;
        view_all_projects: boolean;
        export_tasks: boolean;
        watch_tasks: boolean;
        upload_attachments: boolean;
    };
    updatedBy: Types.ObjectId | null;
    updatedAt: Date;
    auditLog: Array<{
        feature: string;
        oldValue: boolean;
        newValue: boolean;
        changedBy: Types.ObjectId;
        changedAt: Date;
    }>;
}
export declare const RolePermissionsSchema: import("mongoose").Schema<RolePermissions, import("mongoose").Model<RolePermissions, any, any, any, Document<unknown, any, RolePermissions> & RolePermissions & {
    _id: Types.ObjectId;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, RolePermissions, Document<unknown, {}, import("mongoose").FlatRecord<RolePermissions>> & import("mongoose").FlatRecord<RolePermissions> & {
    _id: Types.ObjectId;
}>;
