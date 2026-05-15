import { CommentsService } from './comments.service';
import { UserDocument } from '../users/user.schema';
export declare class CommentsController {
    private commentsService;
    constructor(commentsService: CommentsService);
    findByTask(taskId: string): Promise<import("./comment.schema").CommentDocument[]>;
    create(body: {
        text: string;
        taskId: string;
        mentionIds?: string[];
    }, req: {
        user: UserDocument;
    }): Promise<import("./comment.schema").CommentDocument>;
    update(id: string, body: {
        text: string;
    }, req: {
        user: UserDocument;
    }): Promise<import("./comment.schema").CommentDocument>;
    remove(id: string, req: {
        user: UserDocument;
    }): Promise<void>;
    toggleReaction(id: string, body: {
        emoji: string;
    }, req: {
        user: UserDocument;
    }): Promise<import("./comment.schema").CommentDocument>;
}
