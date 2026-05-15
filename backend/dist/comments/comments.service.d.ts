import { Model } from 'mongoose';
import { CommentDocument } from './comment.schema';
import { UserDocument } from '../users/user.schema';
import { AppGateway } from '../gateway/app.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { TaskDocument } from '../tasks/task.schema';
export declare class CommentsService {
    private commentModel;
    private taskModel;
    private appGateway;
    private notificationsService;
    constructor(commentModel: Model<CommentDocument>, taskModel: Model<TaskDocument>, appGateway: AppGateway, notificationsService: NotificationsService);
    findByTask(taskId: string): Promise<CommentDocument[]>;
    create(data: {
        text: string;
        taskId: string;
        mentionIds?: string[];
    }, user: UserDocument): Promise<CommentDocument>;
    update(id: string, text: string, user: UserDocument): Promise<CommentDocument>;
    delete(id: string, user: UserDocument): Promise<void>;
    toggleReaction(id: string, emoji: string, userId: string): Promise<CommentDocument>;
}
