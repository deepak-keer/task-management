import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from './user.schema';
import { AppGateway } from '../gateway/app.gateway';
import { EMAIL_NOTIFICATION_TYPES, EmailNotificationType } from '../emails/email-types';
import { NotificationPreference, NotificationPreferenceDocument } from '../emails/notification-preference.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(NotificationPreference.name)
    private notificationPreferenceModel: Model<NotificationPreferenceDocument>,
    private appGateway: AppGateway,
  ) {}

  async findAll(): Promise<UserDocument[]> {
    return this.userModel.find().select('-password').sort({ createdAt: -1 }).exec();
  }

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id).select('-password').exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, requesterId: string, data: Partial<User>): Promise<UserDocument> {
    if (id !== requesterId) throw new ForbiddenException('Cannot update other users');
    delete (data as Record<string, unknown>)['password'];
    delete (data as Record<string, unknown>)['role'];
    delete (data as Record<string, unknown>)['status'];

    const user = await this.userModel
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .select('-password')
      .exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async changePassword(
    id: string,
    requesterId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    if (id !== requesterId) throw new ForbiddenException('Cannot update other users');

    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('User not found');

    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid) throw new ForbiddenException('Old password is incorrect');

    const hashed = await bcrypt.hash(newPassword, 12);
    await this.userModel.updateOne({ _id: id }, { password: hashed });
  }

  async getRecentlyViewed(userId: string): Promise<unknown[]> {
    const user = await this.userModel
      .findById(userId)
      .populate({
        path: 'recentlyViewed.task',
        select: 'title priority status project',
        populate: { path: 'project', select: 'name' },
      })
      .exec();

    return user?.recentlyViewed || [];
  }

  async addRecentlyViewed(userId: string, taskId: string): Promise<void> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) return;

    const filtered = user.recentlyViewed.filter(
      (rv) => rv.task.toString() !== taskId,
    );
    filtered.unshift({ task: new Types.ObjectId(taskId), viewedAt: new Date() });
    const trimmed = filtered.slice(0, 10);

    await this.userModel.updateOne({ _id: userId }, { recentlyViewed: trimmed });
  }

  async getMyStats(userId: string): Promise<Record<string, unknown>> {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // These are simple aggregation stubs — the tasks module can build on this
    return {
      userId,
      period: '7d',
      weekStart: weekAgo,
      weekEnd: now,
    };
  }

  async getNotificationPreferences(userId: string): Promise<NotificationPreference[]> {
    const existing = await this.notificationPreferenceModel
      .find({ userId: new Types.ObjectId(userId) })
      .lean()
      .exec();
    const byType = new Map(existing.map((preference) => [preference.notificationType, preference]));

    return EMAIL_NOTIFICATION_TYPES.map((notificationType) => {
      const preference = byType.get(notificationType);
      return {
        userId: new Types.ObjectId(userId),
        notificationType,
        emailEnabled: preference?.emailEnabled ?? true,
        inAppEnabled: preference?.inAppEnabled ?? true,
      } as NotificationPreference;
    });
  }

  async updateNotificationPreference(
    id: string,
    requesterId: string,
    data: {
      notificationType: EmailNotificationType;
      emailEnabled?: boolean;
      inAppEnabled?: boolean;
    },
  ): Promise<NotificationPreferenceDocument> {
    if (id !== requesterId) throw new ForbiddenException('Cannot update other users');
    if (!EMAIL_NOTIFICATION_TYPES.includes(data.notificationType)) {
      throw new ForbiddenException('Unknown notification type');
    }

    const update: Partial<Pick<NotificationPreference, 'emailEnabled' | 'inAppEnabled'>> = {};
    if (typeof data.emailEnabled === 'boolean') update.emailEnabled = data.emailEnabled;
    if (typeof data.inAppEnabled === 'boolean') update.inAppEnabled = data.inAppEnabled;

    const preference = await this.notificationPreferenceModel
      .findOneAndUpdate(
        { userId: new Types.ObjectId(id), notificationType: data.notificationType },
        { $set: update },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();

    this.appGateway.emitToUser(id, 'notification-preferences-updated', preference);
    return preference;
  }
}
