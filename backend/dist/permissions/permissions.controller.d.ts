import { PermissionsService } from './permissions.service';
import { RolePermissions } from './role-permissions.schema';
import { UserDocument } from '../users/user.schema';
export declare class PermissionsController {
    private permissionsService;
    constructor(permissionsService: PermissionsService);
    getAll(): Promise<Record<string, import("./role-permissions.schema").RolePermissionsDocument>>;
    getAuditLog(): Promise<unknown[]>;
    update(role: string, body: Partial<RolePermissions['features']>, req: {
        user: UserDocument;
    }): Promise<import("./role-permissions.schema").RolePermissionsDocument>;
}
