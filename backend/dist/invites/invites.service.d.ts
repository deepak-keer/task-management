import { Model } from 'mongoose';
import { InviteLinkDocument } from './invite-link.schema';
import { UserDocument } from '../users/user.schema';
export interface CreateInviteDto {
    role: 'admin' | 'member';
    projectId?: string;
    expiresIn?: number | null;
    maxUses?: number;
}
export declare class InvitesService {
    private inviteModel;
    constructor(inviteModel: Model<InviteLinkDocument>);
    create(dto: CreateInviteDto, creator: UserDocument): Promise<InviteLinkDocument>;
    findAll(user: UserDocument): Promise<InviteLinkDocument[]>;
    validate(token: string): Promise<{
        valid: boolean;
        role?: string;
        invite?: unknown;
    }>;
    revoke(id: string, user: UserDocument): Promise<void>;
    delete(id: string, user: UserDocument): Promise<void>;
    getByToken(token: string): Promise<InviteLinkDocument>;
}
