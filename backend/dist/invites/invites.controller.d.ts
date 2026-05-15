import { InvitesService, CreateInviteDto } from './invites.service';
import { UserDocument } from '../users/user.schema';
export declare class InvitesController {
    private invitesService;
    constructor(invitesService: InvitesService);
    validate(token: string): Promise<{
        valid: boolean;
        role?: string;
        invite?: unknown;
    }>;
    create(dto: CreateInviteDto, req: {
        user: UserDocument;
    }): Promise<import("./invite-link.schema").InviteLinkDocument>;
    findAll(req: {
        user: UserDocument;
    }): Promise<import("./invite-link.schema").InviteLinkDocument[]>;
    revoke(id: string, req: {
        user: UserDocument;
    }): Promise<void>;
    delete(id: string, req: {
        user: UserDocument;
    }): Promise<void>;
}
