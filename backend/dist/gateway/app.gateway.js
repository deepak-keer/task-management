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
exports.AppGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const jwt_1 = require("@nestjs/jwt");
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const user_schema_1 = require("../users/user.schema");
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000,https://task-management-karmyug.vercel.app')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
let AppGateway = class AppGateway {
    constructor(jwtService, userModel) {
        this.jwtService = jwtService;
        this.userModel = userModel;
        this.logger = new common_1.Logger('AppGateway');
        this.userSocketMap = new Map();
    }
    async handleConnection(client) {
        try {
            const token = client.handshake.auth?.token ||
                client.handshake.headers?.authorization?.replace('Bearer ', '');
            if (!token) {
                client.disconnect();
                return;
            }
            const payload = this.jwtService.verify(token);
            const user = await this.userModel.findById(payload.userId).select('status').exec();
            if (!user || user.status !== 'active') {
                if (user?.status === 'banned') {
                    client.emit('user-banned', { userId: payload.userId });
                    setTimeout(() => client.disconnect(), 250);
                    return;
                }
                client.disconnect();
                return;
            }
            client.userId = payload.userId;
            client.userRole = payload.role;
            client.join(`user:${payload.userId}`);
            if (!this.userSocketMap.has(payload.userId)) {
                this.userSocketMap.set(payload.userId, new Set());
            }
            this.userSocketMap.get(payload.userId).add(client.id);
            this.logger.log(`Client connected: ${client.id} (user: ${payload.userId})`);
        }
        catch {
            client.disconnect();
        }
    }
    handleDisconnect(client) {
        if (client.userId) {
            const sockets = this.userSocketMap.get(client.userId);
            if (sockets) {
                sockets.delete(client.id);
                if (sockets.size === 0) {
                    this.userSocketMap.delete(client.userId);
                }
            }
        }
        this.logger.log(`Client disconnected: ${client.id}`);
    }
    handleJoinBoard(client, data) {
        client.join(`project:${data.projectId}`);
        client.to(`project:${data.projectId}`).emit('user-joined-board', {
            userId: client.userId,
        });
    }
    handleLeaveBoard(client, data) {
        client.leave(`project:${data.projectId}`);
        client.to(`project:${data.projectId}`).emit('user-left-board', {
            userId: client.userId,
        });
    }
    handleTypingComment(client, data) {
        client.to(`project:${data.projectId}`).emit('typing-comment', {
            userId: client.userId,
            taskId: data.taskId,
            isTyping: data.isTyping,
        });
    }
    handleOnlineStatusChanged(client, data) {
        this.server.emit('online-status-changed', {
            userId: client.userId,
            status: data.status,
        });
    }
    emitToProject(projectId, event, data) {
        this.server.to(`project:${projectId}`).emit(event, data);
    }
    emitToUser(userId, event, data) {
        this.server.to(`user:${userId}`).emit(event, data);
    }
    forceLogoutUser(userId, event, data) {
        const room = `user:${userId}`;
        const sockets = this.userSocketMap.get(userId);
        this.server.to(room).emit(event, data);
        this.server.emit('account-status-changed', { userId, status: 'banned' });
        sockets?.forEach((socketId) => {
            this.server.sockets.sockets.get(socketId)?.emit(event, data);
        });
        setTimeout(() => {
            sockets?.forEach((socketId) => {
                this.server.sockets.sockets.get(socketId)?.disconnect(true);
            });
            this.server.in(room).disconnectSockets(true);
            this.userSocketMap.delete(userId);
        }, 1000);
    }
    emitToAll(event, data) {
        this.server.emit(event, data);
    }
};
exports.AppGateway = AppGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], AppGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('join-board'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AppGateway.prototype, "handleJoinBoard", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('leave-board'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AppGateway.prototype, "handleLeaveBoard", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('typing-comment'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AppGateway.prototype, "handleTypingComment", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('online-status-changed'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AppGateway.prototype, "handleOnlineStatusChanged", null);
exports.AppGateway = AppGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: allowedOrigins,
            credentials: true,
        },
    }),
    __param(1, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        mongoose_2.Model])
], AppGateway);
//# sourceMappingURL=app.gateway.js.map