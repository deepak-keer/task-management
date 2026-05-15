import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto): Promise<{
        message: string;
    }>;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        user: Record<string, unknown>;
        permissions: Record<string, import("../permissions/role-permissions.schema").RolePermissions["features"]>;
    }>;
    me(req: {
        user: {
            _id: string;
        };
    }): Promise<{
        user: import("../users/user.schema").UserDocument;
        permissions: Record<string, import("../permissions/role-permissions.schema").RolePermissions["features"]>;
    }>;
    validateInvite(body: {
        token: string;
    }): Promise<import("../invites/invite-link.schema").InviteLinkDocument>;
}
