import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import { UserDocument } from '../users/user.schema';
interface AuthenticatedSocket extends Socket {
    userId?: string;
    userRole?: string;
}
export declare class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private jwtService;
    private userModel;
    server: Server;
    private logger;
    private userSocketMap;
    constructor(jwtService: JwtService, userModel: Model<UserDocument>);
    handleConnection(client: AuthenticatedSocket): Promise<void>;
    handleDisconnect(client: AuthenticatedSocket): void;
    handleJoinBoard(client: AuthenticatedSocket, data: {
        projectId: string;
    }): void;
    handleLeaveBoard(client: AuthenticatedSocket, data: {
        projectId: string;
    }): void;
    handleTypingComment(client: AuthenticatedSocket, data: {
        projectId: string;
        taskId: string;
        isTyping: boolean;
    }): void;
    handleOnlineStatusChanged(client: AuthenticatedSocket, data: {
        status: string;
    }): void;
    emitToProject(projectId: string, event: string, data: unknown): void;
    emitToUser(userId: string, event: string, data: unknown): void;
    forceLogoutUser(userId: string, event: string, data: unknown): void;
    emitToAll(event: string, data: unknown): void;
}
export {};
