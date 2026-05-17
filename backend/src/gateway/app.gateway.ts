import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/user.schema';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'https://task-management-karmyug.vercel.app',
    credentials: true,
  },
})
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('AppGateway');
  private userSocketMap = new Map<string, Set<string>>(); // userId -> socketIds

  constructor(
    private jwtService: JwtService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify<{ userId: string; role: string }>(token);
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

      // Join user's personal room
      client.join(`user:${payload.userId}`);

      // Track socket
      if (!this.userSocketMap.has(payload.userId)) {
        this.userSocketMap.set(payload.userId, new Set());
      }
      this.userSocketMap.get(payload.userId)!.add(client.id);

      this.logger.log(`Client connected: ${client.id} (user: ${payload.userId})`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
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

  @SubscribeMessage('join-board')
  handleJoinBoard(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { projectId: string },
  ) {
    client.join(`project:${data.projectId}`);
    client.to(`project:${data.projectId}`).emit('user-joined-board', {
      userId: client.userId,
    });
  }

  @SubscribeMessage('leave-board')
  handleLeaveBoard(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { projectId: string },
  ) {
    client.leave(`project:${data.projectId}`);
    client.to(`project:${data.projectId}`).emit('user-left-board', {
      userId: client.userId,
    });
  }

  @SubscribeMessage('typing-comment')
  handleTypingComment(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { projectId: string; taskId: string; isTyping: boolean },
  ) {
    client.to(`project:${data.projectId}`).emit('typing-comment', {
      userId: client.userId,
      taskId: data.taskId,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage('online-status-changed')
  handleOnlineStatusChanged(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { status: string },
  ) {
    this.server.emit('online-status-changed', {
      userId: client.userId,
      status: data.status,
    });
  }

  emitToProject(projectId: string, event: string, data: unknown) {
    this.server.to(`project:${projectId}`).emit(event, data);
  }

  emitToUser(userId: string, event: string, data: unknown) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  forceLogoutUser(userId: string, event: string, data: unknown) {
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

  emitToAll(event: string, data: unknown) {
    this.server.emit(event, data);
  }
}
