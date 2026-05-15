import { Document, Types } from 'mongoose';
export type InviteLinkDocument = InviteLink & Document;
export declare class InviteLink {
    token: string;
    role: string;
    projectId: Types.ObjectId | null;
    createdBy: Types.ObjectId;
    expiresAt: Date | null;
    maxUses: number;
    usedCount: number;
    status: string;
    usedBy: Types.ObjectId[];
}
export declare const InviteLinkSchema: import("mongoose").Schema<InviteLink, import("mongoose").Model<InviteLink, any, any, any, Document<unknown, any, InviteLink> & InviteLink & {
    _id: Types.ObjectId;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, InviteLink, Document<unknown, {}, import("mongoose").FlatRecord<InviteLink>> & import("mongoose").FlatRecord<InviteLink> & {
    _id: Types.ObjectId;
}>;
