import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument } from './notification.schema';
import { AppGateway } from '../gateway/app.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
    private appGateway: AppGateway,
  ) {}

  async create(data: {
    recipient: string;
    type: string;
    message: string;
    link?: string;
    meta?: Record<string, unknown>;
  }): Promise<NotificationDocument> {
    const notification = await this.notificationModel.create({
      recipient: new Types.ObjectId(data.recipient),
      type: data.type,
      message: data.message,
      link: data.link || '',
      meta: data.meta || {},
    });

    this.appGateway.emitToUser(data.recipient, 'notification', {
      _id: notification._id,
      type: notification.type,
      message: notification.message,
      link: notification.link,
      read: notification.read,
      createdAt: notification.createdAt,
      meta: notification.meta,
    });

    return notification;
  }

  async getUserNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [notifications, total] = await Promise.all([
      this.notificationModel
        .find({ recipient: new Types.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.notificationModel.countDocuments({ recipient: new Types.ObjectId(userId) }),
    ]);
    return { notifications, total, page, limit };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({
      recipient: new Types.ObjectId(userId),
      read: false,
    });
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await this.notificationModel.updateOne(
      { _id: new Types.ObjectId(notificationId), recipient: new Types.ObjectId(userId) },
      { read: true },
    );
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationModel.updateMany(
      { recipient: new Types.ObjectId(userId), read: false },
      { read: true },
    );
  }

  async delete(notificationId: string, userId: string): Promise<void> {
    await this.notificationModel.deleteOne({
      _id: new Types.ObjectId(notificationId),
      recipient: new Types.ObjectId(userId),
    });
  }
}
