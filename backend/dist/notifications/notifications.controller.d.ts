import { NotificationsService } from './notifications.service';
import { UserDocument } from '../users/user.schema';
export declare class NotificationsController {
    private notificationsService;
    constructor(notificationsService: NotificationsService);
    getAll(req: {
        user: UserDocument;
    }, page?: number, limit?: number): Promise<{
        notifications: (import("mongoose").Document<unknown, {}, import("./notification.schema").NotificationDocument> & import("./notification.schema").Notification & import("mongoose").Document<any, any, any> & {
            createdAt: Date;
            updatedAt: Date;
        } & {
            _id: import("mongoose").Types.ObjectId;
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
    getUnreadCount(req: {
        user: UserDocument;
    }): Promise<number>;
    markAsRead(id: string, req: {
        user: UserDocument;
    }): Promise<void>;
    markAllAsRead(req: {
        user: UserDocument;
    }): Promise<void>;
    delete(id: string, req: {
        user: UserDocument;
    }): Promise<void>;
}
