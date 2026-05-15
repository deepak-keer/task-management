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
exports.TasksService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const uuid_1 = require("uuid");
const task_schema_1 = require("./task.schema");
const project_schema_1 = require("../projects/project.schema");
const app_gateway_1 = require("../gateway/app.gateway");
const notifications_service_1 = require("../notifications/notifications.service");
const users_service_1 = require("../users/users.service");
const permissions_service_1 = require("../permissions/permissions.service");
let TasksService = class TasksService {
    constructor(taskModel, projectModel, appGateway, notificationsService, usersService, permissionsService) {
        this.taskModel = taskModel;
        this.projectModel = projectModel;
        this.appGateway = appGateway;
        this.notificationsService = notificationsService;
        this.usersService = usersService;
        this.permissionsService = permissionsService;
    }
    async hasPermission(user, feature) {
        if (user.role === 'super_admin')
            return true;
        const permissions = await this.permissionsService.getForRole(user.role);
        return !!permissions.features[feature];
    }
    isAssignedTo(task, user) {
        const assignee = task.assignee;
        const assigneeId = assignee && typeof assignee === 'object' && '_id' in assignee
            ? assignee._id?.toString()
            : assignee?.toString();
        return assigneeId === user._id.toString();
    }
    async canManageTaskDetails(user, task) {
        if (user.role === 'super_admin')
            return true;
        if (user.role === 'member') {
            return !!task && this.isAssignedTo(task, user) && (await this.hasPermission(user, 'create_tasks'));
        }
        return user.role === 'admin' && (await this.hasPermission(user, 'create_tasks'));
    }
    async ensureAssigneeCanSeeProject(projectId, assigneeId) {
        if (!assigneeId)
            return;
        await this.projectModel.updateOne({ _id: new mongoose_2.Types.ObjectId(projectId.toString()) }, { $addToSet: { members: new mongoose_2.Types.ObjectId(assigneeId) } });
    }
    getObjectIdString(value) {
        if (!value)
            return null;
        if (value instanceof mongoose_2.Types.ObjectId)
            return value.toString();
        if (typeof value === 'string')
            return value;
        if (typeof value === 'object' && '_id' in value) {
            return this.getObjectIdString(value._id);
        }
        return null;
    }
    getTaskNotificationRecipients(task, actorId) {
        const ids = new Set();
        const assigneeId = this.getObjectIdString(task.assignee);
        const creatorId = this.getObjectIdString(task.createdBy);
        if (assigneeId)
            ids.add(assigneeId);
        if (creatorId)
            ids.add(creatorId);
        for (const watcher of task.watchers || []) {
            const watcherId = this.getObjectIdString(watcher);
            if (watcherId)
                ids.add(watcherId);
        }
        ids.delete(actorId);
        return [...ids];
    }
    async notifyTaskParticipants(task, actor, type, message, meta = {}) {
        const projectId = this.getObjectIdString(task.project);
        if (!projectId)
            return;
        for (const recipient of this.getTaskNotificationRecipients(task, actor._id.toString())) {
            await this.notificationsService.create({
                recipient,
                type,
                message,
                link: `/projects/${projectId}/tasks/${task._id}`,
                meta: { taskId: task._id, projectId, ...meta },
            });
        }
    }
    async findAll(query, user) {
        const filter = {};
        if (query.projectId)
            filter['project'] = new mongoose_2.Types.ObjectId(query.projectId);
        if (query.status)
            filter['status'] = query.status;
        if (query.assignee)
            filter['assignee'] = new mongoose_2.Types.ObjectId(query.assignee);
        if (query.priority)
            filter['priority'] = query.priority;
        if (query.search)
            filter['title'] = { $regex: query.search, $options: 'i' };
        if (user?.role === 'member')
            filter['assignee'] = user._id;
        return this.taskModel
            .find(filter)
            .populate('assignee', 'name email avatar')
            .populate('createdBy', 'name email avatar')
            .sort({ order: 1, createdAt: -1 })
            .exec();
    }
    async findMyTasks(userId) {
        return this.taskModel
            .find({ assignee: new mongoose_2.Types.ObjectId(userId) })
            .populate('project', 'name')
            .populate('assignee', 'name email avatar')
            .sort({ dueDate: 1, priority: 1 })
            .exec();
    }
    async findOverdue(userId) {
        return this.taskModel
            .find({
            assignee: new mongoose_2.Types.ObjectId(userId),
            dueDate: { $lt: new Date() },
            status: { $ne: 'done' },
        })
            .populate('project', 'name')
            .exec();
    }
    async findById(id, user) {
        const task = await this.taskModel
            .findById(id)
            .populate('assignee', 'name email avatar')
            .populate('createdBy', 'name email avatar')
            .populate('project', 'name columns')
            .populate('watchers', 'name email avatar')
            .populate('activityLog.performedBy', 'name email avatar')
            .exec();
        if (!task)
            throw new common_1.NotFoundException('Task not found');
        if (user.role === 'member' && !this.isAssignedTo(task, user)) {
            throw new common_1.ForbiddenException('Members can only access assigned tasks');
        }
        await this.usersService.addRecentlyViewed(user._id.toString(), id);
        return task;
    }
    async create(data, user) {
        if (!(await this.hasPermission(user, 'create_tasks'))) {
            throw new common_1.ForbiddenException('Cannot create tasks');
        }
        if (user.role === 'member' && data.assigneeId && data.assigneeId !== user._id.toString()) {
            throw new common_1.ForbiddenException('Members can only create tasks assigned to themselves');
        }
        const lastTask = await this.taskModel
            .findOne({ project: new mongoose_2.Types.ObjectId(data.projectId), column: data.column })
            .sort({ order: -1 })
            .exec();
        const order = lastTask ? lastTask.order + 1 : 0;
        const assigneeId = user.role === 'member' ? user._id.toString() : data.assigneeId;
        await this.ensureAssigneeCanSeeProject(data.projectId, assigneeId);
        const task = await this.taskModel.create({
            title: data.title,
            description: data.description || '',
            status: data.status,
            column: data.column,
            priority: data.priority || 'medium',
            project: new mongoose_2.Types.ObjectId(data.projectId),
            assignee: user.role === 'member'
                ? user._id
                : assigneeId
                    ? new mongoose_2.Types.ObjectId(assigneeId)
                    : null,
            createdBy: user._id,
            dueDate: data.dueDate || null,
            labels: data.labels || [],
            order,
            activityLog: [
                {
                    action: 'created',
                    performedBy: user._id,
                    performedAt: new Date(),
                    meta: {},
                },
            ],
        });
        const populated = await task.populate([
            { path: 'assignee', select: 'name email avatar' },
            { path: 'createdBy', select: 'name email avatar' },
            { path: 'activityLog.performedBy', select: 'name email avatar' },
        ]);
        this.appGateway.emitToProject(data.projectId, 'task-created', populated);
        if (assigneeId) {
            this.appGateway.emitToUser(assigneeId, 'task-created', populated);
        }
        if (user.role !== 'member' && assigneeId && assigneeId !== user._id.toString()) {
            await this.notificationsService.create({
                recipient: assigneeId,
                type: 'task_assigned',
                message: `${user.name} assigned you to "${data.title}"`,
                link: `/projects/${data.projectId}/tasks/${task._id}`,
                meta: { taskId: task._id, projectId: data.projectId },
            });
        }
        return populated;
    }
    async update(id, data, user) {
        const task = await this.taskModel.findById(id).exec();
        if (!task)
            throw new common_1.NotFoundException('Task not found');
        const changedFields = Object.keys(data);
        const statusOnlyFields = ['status', 'column'];
        const isStatusOnlyUpdate = changedFields.length > 0 && changedFields.every((field) => statusOnlyFields.includes(field));
        const canEditDetails = await this.canManageTaskDetails(user, task);
        const canAssignTasks = await this.hasPermission(user, 'assign_tasks');
        const canMoveTasks = await this.hasPermission(user, 'move_tasks');
        if (user.role === 'member') {
            if (!this.isAssignedTo(task, user)) {
                throw new common_1.ForbiddenException('Members can only update assigned tasks');
            }
            if ('assigneeId' in data) {
                throw new common_1.ForbiddenException('Members cannot reassign tasks');
            }
        }
        if ('assigneeId' in data && !canAssignTasks) {
            throw new common_1.ForbiddenException('Cannot assign tasks');
        }
        if (!canEditDetails && !(isStatusOnlyUpdate && (canMoveTasks || this.isAssignedTo(task, user)))) {
            throw new common_1.ForbiddenException('Cannot edit this task');
        }
        const changes = [];
        if (data.title && data.title !== task.title) {
            changes.push({ action: 'title_changed', performedBy: user._id, performedAt: new Date(), meta: { from: task.title, to: data.title } });
        }
        if (data.status && data.status !== task.status) {
            changes.push({ action: 'status_changed', performedBy: user._id, performedAt: new Date(), meta: { from: task.status, to: data.status } });
        }
        if (data.priority && data.priority !== task.priority) {
            changes.push({ action: 'priority_changed', performedBy: user._id, performedAt: new Date(), meta: { from: task.priority, to: data.priority } });
        }
        if (typeof data.description === 'string' && data.description !== task.description) {
            changes.push({ action: 'description_changed', performedBy: user._id, performedAt: new Date(), meta: {} });
        }
        if ('dueDate' in data) {
            const currentDueDate = task.dueDate ? task.dueDate.toISOString() : null;
            const nextDueDate = data.dueDate ? new Date(data.dueDate).toISOString() : null;
            if (currentDueDate !== nextDueDate) {
                changes.push({ action: 'due_date_changed', performedBy: user._id, performedAt: new Date(), meta: { from: currentDueDate, to: nextDueDate } });
            }
        }
        if (data.labels && JSON.stringify(data.labels) !== JSON.stringify(task.labels)) {
            changes.push({ action: 'labels_changed', performedBy: user._id, performedAt: new Date(), meta: { from: task.labels, to: data.labels } });
        }
        const updateData = { ...data };
        if ('assigneeId' in data) {
            updateData['assignee'] = data.assigneeId ? new mongoose_2.Types.ObjectId(data.assigneeId) : null;
            delete updateData['assigneeId'];
        }
        if ('assigneeId' in data && data.assigneeId) {
            await this.ensureAssigneeCanSeeProject(task.project, data.assigneeId);
        }
        if (changes.length > 0) {
            updateData['$push'] = { activityLog: { $each: changes } };
        }
        const updated = await this.taskModel
            .findByIdAndUpdate(id, updateData, { new: true })
            .populate('assignee', 'name email avatar')
            .populate('createdBy', 'name email avatar')
            .populate('activityLog.performedBy', 'name email avatar')
            .exec();
        if (!updated)
            throw new common_1.NotFoundException('Task not found');
        this.appGateway.emitToProject(task.project.toString(), 'task-updated', updated);
        if ('assigneeId' in data && data.assigneeId) {
            this.appGateway.emitToUser(data.assigneeId, 'task-updated', updated);
        }
        if ('assigneeId' in data && data.assigneeId && data.assigneeId !== user._id.toString()) {
            await this.notificationsService.create({
                recipient: data.assigneeId,
                type: 'task_assigned',
                message: `${user.name} assigned you to "${updated.title}"`,
                link: `/projects/${task.project}/tasks/${id}`,
            });
        }
        if (data.status && data.status !== task.status) {
            const completed = data.status === 'done';
            await this.notifyTaskParticipants(updated, user, completed ? 'task_completed' : 'task_status_changed', completed
                ? `${user.name} completed "${updated.title}"`
                : `${user.name} moved "${updated.title}" to ${data.status.replace(/_/g, ' ')}`, { from: task.status, to: data.status });
        }
        else if (changes.length > 0) {
            await this.notifyTaskParticipants(updated, user, 'task_updated', `${user.name} updated "${updated.title}"`, { fields: changes.map((change) => change.action) });
        }
        return updated;
    }
    async move(id, data, user) {
        const task = await this.taskModel.findById(id).exec();
        if (!task)
            throw new common_1.NotFoundException('Task not found');
        const canMoveTasks = await this.hasPermission(user, 'move_tasks');
        if (user.role === 'member') {
            if (!this.isAssignedTo(task, user)) {
                throw new common_1.ForbiddenException('Members can only move assigned tasks');
            }
            if (!canMoveTasks) {
                throw new common_1.ForbiddenException('Cannot move this task');
            }
        }
        if (!canMoveTasks && !this.isAssignedTo(task, user)) {
            throw new common_1.ForbiddenException('Cannot move this task');
        }
        const updated = await this.taskModel
            .findByIdAndUpdate(id, {
            column: data.column,
            status: data.status,
            order: data.order,
            $push: {
                activityLog: {
                    action: 'moved',
                    performedBy: user._id,
                    performedAt: new Date(),
                    meta: { from: task.column, to: data.column },
                },
            },
        }, { new: true })
            .populate('assignee', 'name email avatar')
            .populate('createdBy', 'name email avatar')
            .populate('activityLog.performedBy', 'name email avatar')
            .exec();
        if (!updated)
            throw new common_1.NotFoundException('Task not found');
        this.appGateway.emitToProject(task.project.toString(), 'task-moved', {
            taskId: id,
            column: data.column,
            status: data.status,
            order: data.order,
            task: updated,
        });
        if (data.status !== task.status) {
            const completed = data.status === 'done';
            await this.notifyTaskParticipants(updated, user, completed ? 'task_completed' : 'task_status_changed', completed
                ? `${user.name} completed "${updated.title}"`
                : `${user.name} moved "${updated.title}" to ${data.status.replace(/_/g, ' ')}`, { from: task.status, to: data.status });
        }
        return updated;
    }
    async delete(id, user) {
        const task = await this.taskModel.findById(id).exec();
        if (!task)
            throw new common_1.NotFoundException('Task not found');
        const canDelete = user.role === 'super_admin' ||
            user.role === 'admin' ||
            (this.isAssignedTo(task, user) && (await this.hasPermission(user, 'delete_own_tasks')));
        if (!canDelete)
            throw new common_1.ForbiddenException('Cannot delete this task');
        await this.taskModel.deleteOne({ _id: id });
        this.appGateway.emitToProject(task.project.toString(), 'task-deleted', { taskId: id });
    }
    async addSubtask(taskId, title, user) {
        const existingTask = await this.taskModel.findById(taskId).exec();
        if (!existingTask)
            throw new common_1.NotFoundException('Task not found');
        if (!(await this.canManageTaskDetails(user, existingTask))) {
            throw new common_1.ForbiddenException('Cannot edit this task');
        }
        const subtask = { id: (0, uuid_1.v4)(), title, done: false };
        const task = await this.taskModel
            .findByIdAndUpdate(taskId, { $push: { subtasks: subtask } }, { new: true })
            .exec();
        if (!task)
            throw new common_1.NotFoundException('Task not found');
        await this.notifyTaskParticipants(task, user, 'task_updated', `${user.name} added a subtask to "${task.title}"`, { subtaskId: subtask.id });
        return task;
    }
    async toggleSubtask(taskId, subtaskId, user) {
        const task = await this.taskModel.findById(taskId).exec();
        if (!task)
            throw new common_1.NotFoundException('Task not found');
        if (!(await this.canManageTaskDetails(user, task))) {
            throw new common_1.ForbiddenException('Cannot edit this task');
        }
        const subtaskIndex = task.subtasks.findIndex((s) => s.id === subtaskId);
        if (subtaskIndex === -1)
            throw new common_1.NotFoundException('Subtask not found');
        task.subtasks[subtaskIndex].done = !task.subtasks[subtaskIndex].done;
        await task.save();
        await this.notifyTaskParticipants(task, user, 'task_updated', `${user.name} ${task.subtasks[subtaskIndex].done ? 'completed' : 'reopened'} a subtask in "${task.title}"`, { subtaskId });
        return task;
    }
    async watch(taskId, userId) {
        await this.taskModel.updateOne({ _id: new mongoose_2.Types.ObjectId(taskId) }, { $addToSet: { watchers: new mongoose_2.Types.ObjectId(userId) } });
        const task = await this.taskModel.findById(taskId).exec();
        if (task) {
            await this.notificationsService.create({
                recipient: userId,
                type: 'task_watched',
                message: `You are now watching "${task.title}"`,
                link: `/projects/${task.project}/tasks/${taskId}`,
                meta: { taskId, projectId: task.project },
            });
        }
    }
    async unwatch(taskId, userId) {
        await this.taskModel.updateOne({ _id: new mongoose_2.Types.ObjectId(taskId) }, { $pull: { watchers: new mongoose_2.Types.ObjectId(userId) } });
    }
    async addAttachment(taskId, attachment, user) {
        const existingTask = await this.taskModel.findById(taskId).exec();
        if (!existingTask)
            throw new common_1.NotFoundException('Task not found');
        if (user.role === 'member' && !this.isAssignedTo(existingTask, user)) {
            throw new common_1.ForbiddenException('Members can only attach files to assigned tasks');
        }
        if (!(await this.hasPermission(user, 'upload_attachments'))) {
            throw new common_1.ForbiddenException('Cannot upload attachments');
        }
        const task = await this.taskModel
            .findByIdAndUpdate(taskId, {
            $push: {
                attachments: {
                    ...attachment,
                    uploadedBy: user._id,
                    uploadedAt: new Date(),
                },
            },
        }, { new: true })
            .exec();
        if (!task)
            throw new common_1.NotFoundException('Task not found');
        await this.notifyTaskParticipants(task, user, 'attachment_added', `${user.name} added an attachment to "${task.title}"`, { attachmentName: attachment.name });
        return task;
    }
    async findDueWithin24h() {
        const now = new Date();
        const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        return this.taskModel
            .find({
            dueDate: { $gte: now, $lte: in24h },
            status: { $ne: 'done' },
            assignee: { $ne: null },
        })
            .populate('assignee', 'name email notificationPrefs')
            .exec();
    }
};
exports.TasksService = TasksService;
exports.TasksService = TasksService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(task_schema_1.Task.name)),
    __param(1, (0, mongoose_1.InjectModel)(project_schema_1.Project.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        app_gateway_1.AppGateway,
        notifications_service_1.NotificationsService,
        users_service_1.UsersService,
        permissions_service_1.PermissionsService])
], TasksService);
//# sourceMappingURL=tasks.service.js.map