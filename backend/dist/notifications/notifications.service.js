"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const notification_schema_1 = require("./notification.schema");
const app_gateway_1 = require("../gateway/app.gateway");
let NotificationsService = class NotificationsService {
    constructor(notificationModel, appGateway) {
        this.notificationModel = notificationModel;
        this.appGateway = appGateway;
    }
    async create(data) {
        const notification = await this.notificationModel.create({
            recipient: new mongoose_2.Types.ObjectId(data.recipient),
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
    async getUserNotifications(userId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [notifications, total] = await Promise.all([
            this.notificationModel
                .find({ recipient: new mongoose_2.Types.ObjectId(userId) })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            this.notificationModel.countDocuments({ recipient: new mongoose_2.Types.ObjectId(userId) }),
        ]);
        return { notifications, total, page, limit };
    }
    async getUnreadCount(userId) {
        return this.notificationModel.countDocuments({
            recipient: new mongoose_2.Types.ObjectId(userId),
            read: false,
        });
    }
    async markAsRead(notificationId, userId) {
        await this.notificationModel.updateOne({ _id: new mongoose_2.Types.ObjectId(notificationId), recipient: new mongoose_2.Types.ObjectId(userId) }, { read: true });
    }
    async markAllAsRead(userId) {
        await this.notificationModel.updateMany({ recipient: new mongoose_2.Types.ObjectId(userId), read: false }, { read: true });
    }
    async delete(notificationId, userId) {
        await this.notificationModel.deleteOne({
            _id: new mongoose_2.Types.ObjectId(notificationId),
            recipient: new mongoose_2.Types.ObjectId(userId),
        });
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(notification_schema_1.Notification.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        app_gateway_1.AppGateway])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map