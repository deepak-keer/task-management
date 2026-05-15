import { Document, Types } from 'mongoose';
export type NotificationDocument = Notification & Document & {
    createdAt: Date;
    updatedAt: Date;
};
export declare class Notification {
    recipient: Types.ObjectId;
    type: string;
    message: string;
    read: boolean;
    link: string;
    meta: Record<string, unknown>;
}
export declare const NotificationSchema: import("mongoose").Schema<Notification, import("mongoose").Model<Notification, any, any, any, Document<unknown, any, Notification> & Notification & {
    _id: Types.ObjectId;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Notification, Document<unknown, {}, import("mongoose").FlatRecord<Notification>> & import("mongoose").FlatRecord<Notification> & {
    _id: Types.ObjectId;
}>;
