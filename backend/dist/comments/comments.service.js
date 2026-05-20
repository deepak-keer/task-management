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
exports.CommentsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const comment_schema_1 = require("./comment.schema");
const app_gateway_1 = require("../gateway/app.gateway");
const notifications_service_1 = require("../notifications/notifications.service");
const task_schema_1 = require("../tasks/task.schema");
let CommentsService = class CommentsService {
    constructor(commentModel, taskModel, appGateway, notificationsService) {
        this.commentModel = commentModel;
        this.taskModel = taskModel;
        this.appGateway = appGateway;
        this.notificationsService = notificationsService;
    }
    async findByTask(taskId) {
        return this.commentModel
            .find({ task: new mongoose_2.Types.ObjectId(taskId) })
            .populate('author', 'name email avatar')
            .populate('mentions', 'name email avatar')
            .sort({ createdAt: 1 })
            .exec();
    }
    async create(data, user) {
        const mentions = (data.mentionIds || []).map((id) => new mongoose_2.Types.ObjectId(id));
        const comment = await this.commentModel.create({
            text: data.text,
            task: new mongoose_2.Types.ObjectId(data.taskId),
            author: user._id,
            mentions,
        });
        const populated = await comment.populate([
            { path: 'author', select: 'name email avatar' },
            { path: 'mentions', select: 'name email avatar' },
        ]);
        const task = await this.taskModel.findById(data.taskId).populate('project', '_id').exec();
        if (task) {
            const projectId = task.project._id?.toString() || task.project.toString();
            this.appGateway.emitToProject(projectId, 'comment-added', {
                comment: populated,
                taskId: data.taskId,
            });
            const recipients = new Set();
            const assigneeId = task.assignee?.toString();
            const creatorId = task.createdBy?.toString();
            if (assigneeId)
                recipients.add(assigneeId);
            if (creatorId)
                recipients.add(creatorId);
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
                    link: `/projects/${projectId}?task=${data.taskId}`,
                    meta: { taskId: data.taskId, projectId, commentId: comment._id },
                });
            }
            for (const mentionId of data.mentionIds || []) {
                if (mentionId !== user._id.toString()) {
                    await this.notificationsService.create({
                        recipient: mentionId,
                        type: 'mentioned',
                        message: `${user.name} mentioned you in a comment`,
                        link: `/projects/${projectId}?task=${data.taskId}`,
                        meta: { taskId: data.taskId, projectId, commentId: comment._id },
                    });
                }
            }
        }
        return populated;
    }
    async update(id, text, user) {
        const comment = await this.commentModel.findById(id).exec();
        if (!comment)
            throw new common_1.NotFoundException('Comment not found');
        if (comment.author.toString() !== user._id.toString()) {
            throw new common_1.ForbiddenException('Cannot edit others comments');
        }
        const updated = await this.commentModel
            .findByIdAndUpdate(id, { text }, { new: true })
            .populate('author', 'name email avatar')
            .exec();
        if (!updated)
            throw new common_1.NotFoundException('Comment not found');
        return updated;
    }
    async delete(id, user) {
        const comment = await this.commentModel.findById(id).exec();
        if (!comment)
            throw new common_1.NotFoundException('Comment not found');
        const canDelete = user.role === 'super_admin' ||
            user.role === 'admin' ||
            comment.author.toString() === user._id.toString();
        if (!canDelete)
            throw new common_1.ForbiddenException('Cannot delete this comment');
        await this.commentModel.deleteOne({ _id: id });
    }
    async toggleReaction(id, emoji, userId) {
        const comment = await this.commentModel.findById(id).exec();
        if (!comment)
            throw new common_1.NotFoundException('Comment not found');
        const reactionIndex = comment.reactions.findIndex((r) => r.emoji === emoji);
        if (reactionIndex === -1) {
            comment.reactions.push({ emoji, users: [new mongoose_2.Types.ObjectId(userId)] });
        }
        else {
            const userIdObj = new mongoose_2.Types.ObjectId(userId);
            const userIndex = comment.reactions[reactionIndex].users.findIndex((u) => u.toString() === userId);
            if (userIndex === -1) {
                comment.reactions[reactionIndex].users.push(userIdObj);
            }
            else {
                comment.reactions[reactionIndex].users.splice(userIndex, 1);
                if (comment.reactions[reactionIndex].users.length === 0) {
                    comment.reactions.splice(reactionIndex, 1);
                }
            }
        }
        await comment.save();
        return comment;
    }
};
exports.CommentsService = CommentsService;
exports.CommentsService = CommentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(comment_schema_1.Comment.name)),
    __param(1, (0, mongoose_1.InjectModel)(task_schema_1.Task.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        app_gateway_1.AppGateway,
        notifications_service_1.NotificationsService])
], CommentsService);
//# sourceMappingURL=comments.service.js.map