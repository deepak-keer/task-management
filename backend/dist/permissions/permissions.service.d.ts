import { Model } from 'mongoose';
import { RolePermissions, RolePermissionsDocument } from './role-permissions.schema';
import { UserDocument } from '../users/user.schema';
import { AppGateway } from '../gateway/app.gateway';
export declare class PermissionsService {
    private permModel;
    private appGateway;
    private cache;
    constructor(permModel: Model<RolePermissionsDocument>, appGateway: AppGateway);
    seedDefaults(): Promise<void>;
    getAll(): Promise<Record<string, RolePermissionsDocument>>;
    getForRole(role: string): Promise<RolePermissionsDocument>;
    private ensureFeatureDefaults;
    update(role: string, features: Partial<RolePermissions['features']>, updatedBy: UserDocument): Promise<RolePermissionsDocument>;
    getAuditLog(): Promise<unknown[]>;
    invalidateCache(role: string): void;
}
