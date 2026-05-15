import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Comment, CommentDocument } from './comment.schema';
import { UserDocument } from '../users/user.schema';
import { AppGateway } from '../gateway/app.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { Task, TaskDocument } from '../tasks/task.schema';

@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(Comment.name) private commentModel: Model<CommentDocument>,
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    private appGateway: AppGateway,
    private notificationsService: NotificationsService,
  ) {}

  async findByTask(taskId: string): Promise<CommentDocument[]> {
    return this.commentModel
      .find({ task: new Types.ObjectId(taskId) })
      .populate('author', 'name email avatar')
      .populate('mentions', 'name email avatar')
      .sort({ createdAt: 1 })
      .exec();
  }

  async create(
    data: { text: string; taskId: string; mentionIds?: string[] },
    user: UserDocument,
  ): Promise<CommentDocument> {
    const mentions = (data.mentionIds || []).map((id) => new Types.ObjectId(id));

    const comment = await this.commentModel.create({
      text: data.text,
      task: new Types.ObjectId(data.taskId),
      author: user._id,
      mentions,
    });

    const populated = await comment.populate([
      { path: 'author', select: 'name email avatar' },
      { path: 'mentions', select: 'name email avatar' },
    ]);

    const task = await this.taskModel.findById(data.taskId).populate('project', '_id').exec();

    if (task) {
      const projectId = (task.project as unknown as { _id: string })._id?.toString() || task.project.toString();
      this.appGateway.emitToProject(projectId, 'comment-added', {
        comment: populated,
        taskId: data.taskId,
      });

      const recipients = new Set<string>();
      const assigneeId = task.assignee?.toString();
      const creatorId = task.createdBy?.toString();
      if (assigneeId) recipients.add(assigneeId);
      if (creatorId) recipients.add(creatorId);
      for (const watcher of task.watchers || []) {
        recipients.add(watcher.toString());
      }
      for (const mentionId of data.mentionIds || []) {
        recipients.delete(mentionId);
      }
      recipients.delete(user._id.toString());

      for (const recipient of recipients) {
        await this.notificationsService.create({
          recipient,
          type: 'comment_added',
          message: `${user.name} commented on "${task.title}"`,
          link: `/projects/${projectId}/tasks/${data.taskId}`,
          meta: { taskId: data.taskId, projectId, commentId: comment._id },
        });
      }

      for (const mentionId of data.mentionIds || []) {
        if (mentionId !== user._id.toString()) {
          await this.notificationsService.create({
            recipient: mentionId,
            type: 'mentioned',
            message: `${user.name} mentioned you in a comment`,
            link: `/projects/${projectId}/tasks/${data.taskId}`,
            meta: { taskId: data.taskId, projectId, commentId: comment._id },
          });
        }
      }
    }

    return populated;
  }

  async update(id: string, text: string, user: UserDocument): Promise<CommentDocument> {
    const comment = await this.commentModel.findById(id).exec();
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.author.toString() !== user._id.toString()) {
      throw new ForbiddenException('Cannot edit others comments');
    }

    const updated = await this.commentModel
      .findByIdAndUpdate(id, { text }, { new: true })
      .populate('author', 'name email avatar')
      .exec();

    if (!updated) throw new NotFoundException('Comment not found');
    return updated;
  }

  async delete(id: string, user: UserDocument): Promise<void> {
    const comment = await this.commentModel.findById(id).exec();
    if (!comment) throw new NotFoundException('Comment not found');

    const canDelete =
      user.role === 'super_admin' ||
      user.role === 'admin' ||
      comment.author.toString() === user._id.toString();
    if (!canDelete) throw new ForbiddenException('Cannot delete this comment');

    await this.commentModel.deleteOne({ _id: id });
  }

  async toggleReaction(id: string, emoji: string, userId: string): Promise<CommentDocument> {
    const comment = await this.commentModel.findById(id).exec();
    if (!comment) throw new NotFoundException('Comment not found');

    const reactionIndex = comment.reactions.findIndex((r) => r.emoji === emoji);
    if (reactionIndex === -1) {
      comment.reactions.push({ emoji, users: [new Types.ObjectId(userId)] });
    } else {
      const userIdObj = new Types.ObjectId(userId);
      const userIndex = comment.reactions[reactionIndex].users.findIndex(
        (u) => u.toString() === userId,
      );
      if (userIndex === -1) {
        comment.reactions[reactionIndex].users.push(userIdObj);
      } else {
        comment.reactions[reactionIndex].users.splice(userIndex, 1);
        if (comment.reactions[reactionIndex].users.length === 0) {
          comment.reactions.splice(reactionIndex, 1);
        }
      }
    }

    await comment.save();
    return comment;
  }
}
