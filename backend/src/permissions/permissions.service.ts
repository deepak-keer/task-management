import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RolePermissions, RolePermissionsDocument } from './role-permissions.schema';
import { UserDocument } from '../users/user.schema';
import { AppGateway } from '../gateway/app.gateway';

const FEATURE_DEFAULTS: RolePermissions['features'] = {
  invite_members: true,
  remove_members: false,
  view_workspaces: false,
  manage_workspaces: false,
  view_boards: true,
  create_projects: true,
  delete_projects: false,
  archive_projects: false,
  manage_board_members: false,
  manage_announcements: false,
  assign_roles: false,
  view_analytics: true,
  manage_columns: true,
  create_tasks: true,
  delete_own_tasks: true,
  delete_any_task: false,
  move_tasks: true,
  assign_tasks: true,
  comment_on_tasks: true,
  view_user_task_overview: false,
  view_all_projects: false,
  export_tasks: false,
  watch_tasks: true,
  upload_attachments: true,
};

@Injectable()
export class PermissionsService {
  private cache: Map<string, RolePermissionsDocument> = new Map();

  constructor(
    @InjectModel(RolePermissions.name) private permModel: Model<RolePermissionsDocument>,
    private appGateway: AppGateway,
  ) {}

  async seedDefaults(): Promise<void> {
    const roles = ['admin', 'member'];
    for (const role of roles) {
      const existing = await this.permModel.findOne({ role }).exec();
      if (!existing) {
        await this.permModel.create({ role });
      }
    }
  }

  async getAll(): Promise<Record<string, RolePermissionsDocument>> {
    const perms = await this.permModel.find().exec();
    const result: Record<string, RolePermissionsDocument> = {};
    for (const p of perms) {
      await this.ensureFeatureDefaults(p);
      result[p.role] = p;
    }
    return result;
  }

  async getForRole(role: string): Promise<RolePermissionsDocument> {
    if (this.cache.has(role)) return this.cache.get(role)!;

    const perm = await this.permModel.findOne({ role }).exec();
    if (!perm) {
      const created = await this.permModel.create({ role, features: FEATURE_DEFAULTS });
      this.cache.set(role, created);
      return created;
    }
    await this.ensureFeatureDefaults(perm);
    this.cache.set(role, perm);
    return perm;
  }

  private async ensureFeatureDefaults(perm: RolePermissionsDocument): Promise<void> {
    const current = (perm.features || {}) as Record<string, boolean>;
    const missing = Object.entries(FEATURE_DEFAULTS).filter(([feature]) => typeof current[feature] !== 'boolean');
    if (missing.length === 0) return;

    for (const [feature, value] of missing) {
      current[feature] = value;
      perm.set(`features.${feature}`, value);
    }

    await perm.save();
    this.cache.delete(perm.role);
  }

  async update(
    role: string,
    features: Partial<RolePermissions['features']>,
    updatedBy: UserDocument,
  ): Promise<RolePermissionsDocument> {
    const perm = await this.permModel.findOne({ role }).exec();
    if (!perm) throw new NotFoundException('Role permissions not found');

    const auditEntries = Object.entries(features).map(([feature, newValue]) => ({
      feature,
      oldValue: (perm.features as Record<string, boolean>)[feature],
      newValue: newValue as boolean,
      changedBy: new Types.ObjectId(updatedBy._id.toString()),
      changedAt: new Date(),
    }));

    const setData: Record<string, unknown> = { updatedBy: updatedBy._id, updatedAt: new Date() };
    for (const [feature, value] of Object.entries(features)) {
      setData[`features.${feature}`] = value;
    }

    const updated = await this.permModel
      .findOneAndUpdate(
        { role },
        { $set: setData, $push: { auditLog: { $each: auditEntries } } },
        { new: true },
      )
      .exec();

    if (!updated) throw new NotFoundException('Role permissions not found');

    this.cache.delete(role);
    this.appGateway.emitToAll('permissions-updated', {
      role,
      features: updated.features,
    });

    return updated;
  }

  async getAuditLog(): Promise<unknown[]> {
    const perms = await this.permModel.find().populate('auditLog.changedBy', 'name email').exec();
    const logs: unknown[] = [];
    for (const p of perms) {
      for (const entry of p.auditLog) {
        const maybeDocument = entry as unknown as { toObject?: () => unknown };
        const logEntry = typeof maybeDocument.toObject === 'function' ? maybeDocument.toObject() : entry;

        logs.push({ ...(logEntry as Record<string, unknown>), role: p.role });
      }
    }
    return logs.sort(
      (a: unknown, b: unknown) =>
        new Date((b as { changedAt: string }).changedAt).getTime() -
        new Date((a as { changedAt: string }).changedAt).getTime(),
    );
  }

  invalidateCache(role: string): void {
    this.cache.delete(role);
  }
}
