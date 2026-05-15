import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { UserDocument } from '../users/user.schema';
import { InviteLinkDocument } from '../invites/invite-link.schema';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { AppGateway } from '../gateway/app.gateway';
import { PermissionsService } from '../permissions/permissions.service';
import { RolePermissions } from '../permissions/role-permissions.schema';
import { NotificationsService } from '../notifications/notifications.service';
export declare class AuthService {
    private userModel;
    private inviteModel;
    private jwtService;
    private appGateway;
    private permissionsService;
    private notificationsService;
    constructor(userModel: Model<UserDocument>, inviteModel: Model<InviteLinkDocument>, jwtService: JwtService, appGateway: AppGateway, permissionsService: PermissionsService, notificationsService: NotificationsService);
    validateInviteToken(token: string): Promise<InviteLinkDocument>;
    register(dto: RegisterDto): Promise<{
        message: string;
    }>;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        user: Record<string, unknown>;
        permissions: Record<string, RolePermissions['features']>;
    }>;
    getMe(userId: string): Promise<{
        user: UserDocument;
        permissions: Record<string, RolePermissions['features']>;
    }>;
}
