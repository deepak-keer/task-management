import { Document, Types } from 'mongoose';
export type UserDocument = User & Document;
export declare class User {
    name: string;
    email: string;
    password: string;
    avatar: string;
    role: string;
    status: string;
    theme: string;
    onlineStatus: string;
    notificationPrefs: {
        taskAssigned: boolean;
        commentAdded: boolean;
        mentioned: boolean;
        dueDateReminder: boolean;
    };
    recentlyViewed: Array<{
        task: Types.ObjectId;
        viewedAt: Date;
    }>;
    invitedBy: Types.ObjectId | null;
    lastActiveAt: Date;
}
export declare const UserSchema: import("mongoose").Schema<User, import("mongoose").Model<User, any, any, any, Document<unknown, any, User> & User & {
    _id: Types.ObjectId;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, User, Document<unknown, {}, import("mongoose").FlatRecord<User>> & import("mongoose").FlatRecord<User> & {
    _id: Types.ObjectId;
}>;
