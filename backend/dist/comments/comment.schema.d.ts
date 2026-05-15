import { Document, Types } from 'mongoose';
export type CommentDocument = Comment & Document;
export declare class Comment {
    text: string;
    task: Types.ObjectId;
    author: Types.ObjectId;
    mentions: Types.ObjectId[];
    reactions: Array<{
        emoji: string;
        users: Types.ObjectId[];
    }>;
}
export declare const CommentSchema: import("mongoose").Schema<Comment, import("mongoose").Model<Comment, any, any, any, Document<unknown, any, Comment> & Comment & {
    _id: Types.ObjectId;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Comment, Document<unknown, {}, import("mongoose").FlatRecord<Comment>> & import("mongoose").FlatRecord<Comment> & {
    _id: Types.ObjectId;
}>;
