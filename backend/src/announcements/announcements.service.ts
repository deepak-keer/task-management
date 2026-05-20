import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NotificationsService } from '../notifications/notifications.service';
import { PermissionsService } from '../permissions/permissions.service';
import { User, UserDocument } from '../users/user.schema';
import { AppGateway } from '../gateway/app.gateway';
import { Announcement, AnnouncementDocument } from './announcement.schema';

type AnnouncementTarget = {
  targetType?: 'all' | 'role' | 'users';
  targetRole?: 'super_admin' | 'admin' | 'member' | null;
  recipients?: string[];
};

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectModel(Announcement.name) private announcementModel: Model<AnnouncementDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private appGateway: AppGateway,
    private notificationsService: NotificationsService,
    private permissionsService: PermissionsService,
  ) {}

  async findAll(user: UserDocument, limit = 8, managed = false): Promise<AnnouncementDocument[]> {
    const userId = user._id.toString();
    const canSeeManaged = managed && (await this.canManage(user));
    const filter = canSeeManaged
      ? {}
      : {
          $or: [
            { targetType: { $in: ['all', null] } },
            { targetType: 'role', targetRole: user.role },
            { targetType: 'users', recipients: new Types.ObjectId(userId) },
            { createdBy: new Types.ObjectId(userId) },
          ],
        };

    return this.announcementModel
      .find(filter)
      .populate('createdBy', 'name avatar role')
      .populate('recipients', 'name avatar role email')
      .sort({ pinned: -1, createdAt: -1 })
      .limit(Math.min(Math.max(limit, 1), 30))
      .exec();
  }

  async create(
    user: UserDocument,
    data: { title: string; body: string; tone?: string; pinned?: boolean } & AnnouncementTarget,
  ): Promise<AnnouncementDocument> {
    await this.assertCanManage(user);
    const target = this.normalizeTarget(data);

    const announcement = await this.announcementModel.create({
      title: data.title.trim(),
      body: data.body.trim(),
      tone: data.tone || 'info',
      pinned: !!data.pinned,
      targetType: target.targetType,
      targetRole: target.targetRole,
      recipients: target.recipients.map((id) => new Types.ObjectId(id)),
      createdBy: new Types.ObjectId(user._id.toString()),
    });

    const populated = await announcement.populate([
      { path: 'createdBy', select: 'name avatar role' },
      { path: 'recipients', select: 'name avatar role email' },
    ]);

    const recipientIds = await this.resolveRecipientIds(target);
    await Promise.all(
      recipientIds.map((recipientId) =>
        this.notificationsService.create({
          recipient: recipientId,
          type: 'announcement',
          message: `${populated.title}: ${populated.body}`,
          link: '/notifications',
          meta: { announcementId: populated._id.toString(), targetType: target.targetType },
        }),
      ),
    );

    this.emitToAnnouncementAudience(target, 'announcement-created', populated);
    return populated;
  }

  async update(
    id: string,
    user: UserDocument,
    data: Partial<{ title: string; body: string; tone: string; pinned: boolean } & AnnouncementTarget>,
  ): Promise<AnnouncementDocument> {
    await this.assertCanManage(user);

    const update: Partial<Announcement> = {};
    if (typeof data.title === 'string') update.title = data.title.trim();
    if (typeof data.body === 'string') update.body = data.body.trim();
    if (typeof data.tone === 'string') update.tone = data.tone;
    if (typeof data.pinned === 'boolean') update.pinned = data.pinned;
    if (data.targetType) {
      const target = this.normalizeTarget(data as AnnouncementTarget);
      update.targetType = target.targetType;
      update.targetRole = target.targetRole;
      update.recipients = target.recipients.map((recipientId) => new Types.ObjectId(recipientId));
    }

    const announcement = await this.announcementModel
      .findByIdAndUpdate(id, update, { new: true })
      .populate('createdBy', 'name avatar role')
      .populate('recipients', 'name avatar role email')
      .exec();

    if (!announcement) throw new NotFoundException('Announcement not found');
    this.appGateway.emitToAll('announcement-updated', announcement);
    return announcement;
  }

  async delete(id: string, user: UserDocument): Promise<void> {
    await this.assertCanManage(user);
    await this.announcementModel.deleteOne({ _id: new Types.ObjectId(id) });
    this.appGateway.emitToAll('announcement-deleted', { id });
  }

  private async assertCanManage(user: UserDocument) {
    if (!(await this.canManage(user))) {
      throw new ForbiddenException('Only workspace admins can manage announcements');
    }
  }

  private async canManage(user: UserDocument): Promise<boolean> {
    if (user.role === 'super_admin') return true;
    const permissions = await this.permissionsService.getForRole(user.role);
    return !!(permissions.features as Record<string, boolean>).manage_announcements;
  }

  private normalizeTarget(data: AnnouncementTarget): Required<AnnouncementTarget> {
    const targetType = data.targetType || 'all';
    if (!['all', 'role', 'users'].includes(targetType)) {
      throw new ForbiddenException('Invalid announcement target');
    }

    if (targetType === 'role') {
      const targetRole = data.targetRole || 'member';
      if (!['super_admin', 'admin', 'member'].includes(targetRole)) {
        throw new ForbiddenException('Invalid announcement role');
      }
      return { targetType, targetRole, recipients: [] };
    }

    if (targetType === 'users') {
      const recipients = Array.from(new Set(data.recipients || [])).filter((id) => Types.ObjectId.isValid(id));
      if (recipients.length === 0) {
        throw new ForbiddenException('Choose at least one recipient');
      }
      return { targetType, targetRole: null, recipients };
    }

    return { targetType: 'all', targetRole: null, recipients: [] };
  }

  private async resolveRecipientIds(target: Required<AnnouncementTarget>): Promise<string[]> {
    if (target.targetType === 'users') return target.recipients;

    const filter =
      target.targetType === 'role'
        ? { role: target.targetRole, status: 'active' }
        : { status: 'active' };

    const users = await this.userModel.find(filter).select('_id').lean().exec();
    return users.map((user) => user._id.toString());
  }

  private emitToAnnouncementAudience(target: Required<AnnouncementTarget>, event: string, data: unknown) {
    if (target.targetType === 'all') {
      this.appGateway.emitToAll(event, data);
      return;
    }

    if (target.targetType === 'role' && target.targetRole) {
      this.appGateway.emitToRole(target.targetRole, event, data);
      return;
    }

    target.recipients.forEach((recipientId) => this.appGateway.emitToUser(recipientId, event, data));
  }
}
