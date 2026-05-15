import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument } from './notification.schema';
import { AppGateway } from '../gateway/app.gateway';
export declare class NotificationsService {
    private notificationModel;
    private appGateway;
    constructor(notificationModel: Model<NotificationDocument>, appGateway: AppGateway);
    create(data: {
        recipient: string;
        type: string;
        message: string;
        link?: string;
        meta?: Record<string, unknown>;
    }): Promise<NotificationDocument>;
    getUserNotifications(userId: string, page?: number, limit?: number): Promise<{
        notifications: (import("mongoose").Document<unknown, {}, NotificationDocument> & Notification & import("mongoose").Document<any, any, any> & {
            createdAt: Date;
            updatedAt: Date;
        } & {
            _id: Types.ObjectId;
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
    getUnreadCount(userId: string): Promise<number>;
    markAsRead(notificationId: string, userId: string): Promise<void>;
    markAllAsRead(userId: string): Promise<void>;
    delete(notificationId: string, userId: string): Promise<void>;
}
