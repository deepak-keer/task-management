import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Task, TaskDocument } from './task.schema';
import { UserDocument } from '../users/user.schema';
import { Project, ProjectDocument } from '../projects/project.schema';
import { AppGateway } from '../gateway/app.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { PermissionsService } from '../permissions/permissions.service';

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    private appGateway: AppGateway,
    private notificationsService: NotificationsService,
    private usersService: UsersService,
    private permissionsService: PermissionsService,
  ) {}

  private async hasPermission(user: UserDocument, feature: string): Promise<boolean> {
    if (user.role === 'super_admin') return true;
    const permissions = await this.permissionsService.getForRole(user.role);
    return !!(permissions.features as Record<string, boolean>)[feature];
  }

  private isAssignedTo(task: TaskDocument, user: UserDocument): boolean {
    const assignee = task.assignee as Types.ObjectId | { _id?: Types.ObjectId | string } | null;
    const assigneeId =
      assignee && typeof assignee === 'object' && '_id' in assignee
        ? assignee._id?.toString()
        : assignee?.toString();

    return assigneeId === user._id.toString();
  }

  private async canManageTaskDetails(user: UserDocument, task?: TaskDocument): Promise<boolean> {
    if (user.role === 'super_admin') return true;
    if (user.role === 'member') {
      return !!task && this.isAssignedTo(task, user) && (await this.hasPermission(user, 'create_tasks'));
    }
    return user.role === 'admin' && (await this.hasPermission(user, 'create_tasks'));
  }

  private async ensureAssigneeCanSeeProject(
    projectId: Types.ObjectId | string,
    assigneeId?: string | null,
  ): Promise<void> {
    if (!assigneeId) return;

    await this.projectModel.updateOne(
      { _id: new Types.ObjectId(projectId.toString()) },
      { $addToSet: { members: new Types.ObjectId(assigneeId) } },
    );
  }

  private async ensureActiveProjectColumn(projectId: Types.ObjectId | string, columnId: string): Promise<void> {
    const project = await this.projectModel.findById(projectId).select('columns').exec();
    if (!project) throw new NotFoundException('Project not found');

    const column = project.columns?.find((item) => item.id === columnId);
    if (!column || column.archived) {
      throw new ForbiddenException('Column is not available');
    }
  }

  private getObjectIdString(value: unknown): string | null {
    if (!value) return null;
    if (value instanceof Types.ObjectId) return value.toString();
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && '_id' in value) {
      return this.getObjectIdString((value as { _id?: unknown })._id);
    }
    return null;
  }

  private getTaskNotificationRecipients(task: TaskDocument, actorId: string): string[] {
    const ids = new Set<string>();
    const assigneeId = this.getObjectIdString(task.assignee);
    const creatorId = this.getObjectIdString(task.createdBy);

    if (assigneeId) ids.add(assigneeId);
    if (creatorId) ids.add(creatorId);
    for (const watcher of task.watchers || []) {
      const watcherId = this.getObjectIdString(watcher);
      if (watcherId) ids.add(watcherId);
    }

    ids.delete(actorId);
    return [...ids];
  }

  private async notifyTaskParticipants(
    task: TaskDocument,
    actor: UserDocument,
    type: string,
    message: string,
    meta: Record<string, unknown> = {},
  ): Promise<void> {
    const projectId = this.getObjectIdString(task.project);
    if (!projectId) return;

    for (const recipient of this.getTaskNotificationRecipients(task, actor._id.toString())) {
      await this.notificationsService.create({
        recipient,
        type,
        message,
        link: `/projects/${projectId}?task=${task._id}`,
        meta: { taskId: task._id, projectId, ...meta },
      });
    }
  }

  async findAll(query: {
    projectId?: string;
    status?: string;
    assignee?: string;
    priority?: string;
    search?: string;
  }, user?: UserDocument): Promise<TaskDocument[]> {
    const filter: Record<string, unknown> = {};

    if (query.projectId) filter['project'] = new Types.ObjectId(query.projectId);
    if (query.status) filter['status'] = query.status;
    if (query.assignee) filter['assignee'] = new Types.ObjectId(query.assignee);
    if (query.priority) filter['priority'] = query.priority;
    if (query.search) filter['title'] = { $regex: query.search, $options: 'i' };
    if (user?.role === 'member') filter['assignee'] = user._id;

    return this.taskModel
      .find(filter)
      .populate('assignee', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .sort({ order: 1, createdAt: -1 })
      .exec();
  }

  async exportTasks(query: {
    projectId?: string;
    status?: string;
    assignee?: string;
    priority?: string;
    search?: string;
  }, user: UserDocument): Promise<{ filename: string; rows: Array<Record<string, string | number>> }> {
    if (!(await this.hasPermission(user, 'export_tasks'))) {
      throw new ForbiddenException('Cannot export tasks');
    }

    const tasks = await this.findAll(query, user);
    const projectName =
      query.projectId
        ? (await this.projectModel.findById(query.projectId).select('name').lean().exec())?.name || 'board'
        : 'tasks';

    const rows = tasks.map((task) => {
      const assignee = task.assignee as unknown as { name?: string; email?: string } | null;
      const createdBy = task.createdBy as unknown as { name?: string; email?: string } | null;
      const timestamps = task as TaskDocument & { createdAt?: Date; updatedAt?: Date };
      return {
        id: task._id.toString(),
        title: task.title,
        status: task.status,
        column: task.column,
        priority: task.priority,
        assignee: assignee?.name || '',
        createdBy: createdBy?.name || '',
        dueDate: task.dueDate ? task.dueDate.toISOString() : '',
        labels: (task.labels || []).join(', '),
        subtasks: task.subtasks?.length || 0,
        attachments: task.attachments?.length || 0,
        createdAt: timestamps.createdAt ? timestamps.createdAt.toISOString() : '',
        updatedAt: timestamps.updatedAt ? timestamps.updatedAt.toISOString() : '',
      };
    });

    return {
      filename: `${projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'tasks'}-tasks.csv`,
      rows,
    };
  }

  async findMyTasks(userId: string): Promise<TaskDocument[]> {
    const tasks = await this.taskModel
      .find({ assignee: new Types.ObjectId(userId) })
      .populate('project', 'name columns')
      .populate('assignee', 'name email avatar')
      .sort({ dueDate: 1, priority: 1 })
      .exec();
    return tasks.filter((task) => !!task.project);
  }

  async findOverdue(userId: string): Promise<TaskDocument[]> {
    const tasks = await this.taskModel
      .find({
        assignee: new Types.ObjectId(userId),
        dueDate: { $lt: new Date() },
        status: { $ne: 'done' },
      })
      .populate('project', 'name columns')
      .exec();
    return tasks.filter((task) => !!task.project);
  }

  async findById(id: string, user: UserDocument): Promise<TaskDocument> {
    const task = await this.taskModel
      .findById(id)
      .populate('assignee', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('project', 'name columns')
      .populate('watchers', 'name email avatar')
      .populate('activityLog.performedBy', 'name email avatar')
      .exec();

    if (!task) throw new NotFoundException('Task not found');
    if (user.role === 'member' && !this.isAssignedTo(task, user)) {
      throw new ForbiddenException('Members can only access assigned tasks');
    }

    await this.usersService.addRecentlyViewed(user._id.toString(), id);
    return task;
  }

  async create(
    data: {
      title: string;
      description?: string;
      status: string;
      column: string;
      priority?: string;
      projectId: string;
      assigneeId?: string;
      dueDate?: Date;
      labels?: string[];
    },
    user: UserDocument,
  ): Promise<TaskDocument> {
    if (!(await this.hasPermission(user, 'create_tasks'))) {
      throw new ForbiddenException('Cannot create tasks');
    }

    if (user.role === 'member' && data.assigneeId && data.assigneeId !== user._id.toString()) {
      throw new ForbiddenException('Members can only create tasks assigned to themselves');
    }

    const lastTask = await this.taskModel
      .findOne({ project: new Types.ObjectId(data.projectId), column: data.column })
      .sort({ order: -1 })
      .exec();

    await this.ensureActiveProjectColumn(data.projectId, data.column);

    const order = lastTask ? lastTask.order + 1 : 0;
    const assigneeId = user.role === 'member' ? user._id.toString() : data.assigneeId;

    await this.ensureAssigneeCanSeeProject(data.projectId, assigneeId);

    const task = await this.taskModel.create({
      title: data.title,
      description: data.description || '',
      status: data.status,
      column: data.column,
      priority: data.priority || 'medium',
      project: new Types.ObjectId(data.projectId),
      assignee:
        user.role === 'member'
          ? user._id
          : assigneeId
            ? new Types.ObjectId(assigneeId)
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
        link: `/projects/${data.projectId}?task=${task._id}`,
        meta: { taskId: task._id, projectId: data.projectId },
      });
    }

    return populated;
  }

  async update(
    id: string,
    data: Partial<{
      title: string;
      description: string;
      status: string;
      column: string;
      priority: string;
      assigneeId: string | null;
      dueDate: Date | null;
      labels: string[];
      subtasks: unknown[];
    }>,
    user: UserDocument,
  ): Promise<TaskDocument> {
    const task = await this.taskModel.findById(id).exec();
    if (!task) throw new NotFoundException('Task not found');

    if (data.column) {
      await this.ensureActiveProjectColumn(task.project, data.column);
    }
    const changedFields = Object.keys(data);
    const statusOnlyFields = ['status', 'column'];
    const isStatusOnlyUpdate =
      changedFields.length > 0 && changedFields.every((field) => statusOnlyFields.includes(field));
    const canEditDetails = await this.canManageTaskDetails(user, task);
    const canAssignTasks = await this.hasPermission(user, 'assign_tasks');
    const canMoveTasks = await this.hasPermission(user, 'move_tasks');

    if (user.role === 'member') {
      if (!this.isAssignedTo(task, user)) {
        throw new ForbiddenException('Members can only update assigned tasks');
      }

      if ('assigneeId' in data) {
        throw new ForbiddenException('Members cannot reassign tasks');
      }
    }

    if ('assigneeId' in data && !canAssignTasks) {
      throw new ForbiddenException('Cannot assign tasks');
    }

    if (!canEditDetails && !(isStatusOnlyUpdate && (canMoveTasks || this.isAssignedTo(task, user)))) {
      throw new ForbiddenException('Cannot edit this task');
    }

    const changes: Array<{ action: string; performedBy: Types.ObjectId; performedAt: Date; meta: Record<string, unknown> }> = [];

    if (data.title && data.title !== task.title) {
      changes.push({ action: 'title_changed', performedBy: user._id as Types.ObjectId, performedAt: new Date(), meta: { from: task.title, to: data.title } });
    }
    if (data.status && data.status !== task.status) {
      changes.push({ action: 'status_changed', performedBy: user._id as Types.ObjectId, performedAt: new Date(), meta: { from: task.status, to: data.status } });
    }
    if (data.priority && data.priority !== task.priority) {
      changes.push({ action: 'priority_changed', performedBy: user._id as Types.ObjectId, performedAt: new Date(), meta: { from: task.priority, to: data.priority } });
    }
    if (typeof data.description === 'string' && data.description !== task.description) {
      changes.push({ action: 'description_changed', performedBy: user._id as Types.ObjectId, performedAt: new Date(), meta: {} });
    }
    if ('dueDate' in data) {
      const currentDueDate = task.dueDate ? task.dueDate.toISOString() : null;
      const nextDueDate = data.dueDate ? new Date(data.dueDate).toISOString() : null;
      if (currentDueDate !== nextDueDate) {
        changes.push({ action: 'due_date_changed', performedBy: user._id as Types.ObjectId, performedAt: new Date(), meta: { from: currentDueDate, to: nextDueDate } });
      }
    }
    if (data.labels && JSON.stringify(data.labels) !== JSON.stringify(task.labels)) {
      changes.push({ action: 'labels_changed', performedBy: user._id as Types.ObjectId, performedAt: new Date(), meta: { from: task.labels, to: data.labels } });
    }

    const updateData: Record<string, unknown> = { ...data };
    if ('assigneeId' in data) {
      updateData['assignee'] = data.assigneeId ? new Types.ObjectId(data.assigneeId) : null;
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

    if (!updated) throw new NotFoundException('Task not found');

    this.appGateway.emitToProject(task.project.toString(), 'task-updated', updated);
    if ('assigneeId' in data && data.assigneeId) {
      this.appGateway.emitToUser(data.assigneeId, 'task-updated', updated);
    }

    if ('assigneeId' in data && data.assigneeId && data.assigneeId !== user._id.toString()) {
      await this.notificationsService.create({
        recipient: data.assigneeId,
        type: 'task_assigned',
        message: `${user.name} assigned you to "${updated.title}"`,
        link: `/projects/${task.project}?task=${id}`,
      });
    }

    if (data.status && data.status !== task.status) {
      const completed = data.status === 'done';
      await this.notifyTaskParticipants(
        updated,
        user,
        completed ? 'task_completed' : 'task_status_changed',
        completed
          ? `${user.name} completed "${updated.title}"`
          : `${user.name} moved "${updated.title}" to ${data.status.replace(/_/g, ' ')}`,
        { from: task.status, to: data.status },
      );
    } else if (changes.length > 0) {
      await this.notifyTaskParticipants(
        updated,
        user,
        'task_updated',
        `${user.name} updated "${updated.title}"`,
        { fields: changes.map((change) => change.action) },
      );
    }

    return updated;
  }

  async move(
    id: string,
    data: { column: string; status: string; order: number },
    user: UserDocument,
  ): Promise<TaskDocument> {
    const task = await this.taskModel.findById(id).exec();
    if (!task) throw new NotFoundException('Task not found');

    const canMoveTasks = await this.hasPermission(user, 'move_tasks');
    if (user.role === 'member') {
      if (!this.isAssignedTo(task, user)) {
        throw new ForbiddenException('Members can only move assigned tasks');
      }
      if (!canMoveTasks) {
        throw new ForbiddenException('Cannot move this task');
      }
    }

    if (!canMoveTasks && !this.isAssignedTo(task, user)) {
      throw new ForbiddenException('Cannot move this task');
    }

    await this.ensureActiveProjectColumn(task.project, data.column);
    const fromColumn = task.column;
    const fromOrder = task.order ?? 0;
    const toOrder = Math.max(0, data.order ?? 0);

    if (fromColumn === data.column && fromOrder !== toOrder) {
      if (fromOrder < toOrder) {
        await this.taskModel.updateMany(
          {
            project: task.project,
            column: fromColumn,
            _id: { $ne: task._id },
            order: { $gt: fromOrder, $lte: toOrder },
          },
          { $inc: { order: -1 } },
        );
      } else {
        await this.taskModel.updateMany(
          {
            project: task.project,
            column: fromColumn,
            _id: { $ne: task._id },
            order: { $gte: toOrder, $lt: fromOrder },
          },
          { $inc: { order: 1 } },
        );
      }
    }

    if (fromColumn !== data.column) {
      await this.taskModel.updateMany(
        {
          project: task.project,
          column: fromColumn,
          _id: { $ne: task._id },
          order: { $gt: fromOrder },
        },
        { $inc: { order: -1 } },
      );
      await this.taskModel.updateMany(
        {
          project: task.project,
          column: data.column,
          _id: { $ne: task._id },
          order: { $gte: toOrder },
        },
        { $inc: { order: 1 } },
      );
    }

    const updated = await this.taskModel
      .findByIdAndUpdate(
        id,
        {
          column: data.column,
          status: data.status,
          order: toOrder,
          $push: {
            activityLog: {
              action: 'moved',
              performedBy: user._id,
              performedAt: new Date(),
              meta: { from: task.column, to: data.column },
            },
          },
        },
        { new: true },
      )
      .populate('assignee', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('activityLog.performedBy', 'name email avatar')
      .exec();

    if (!updated) throw new NotFoundException('Task not found');

    this.appGateway.emitToProject(task.project.toString(), 'task-moved', {
      taskId: id,
      column: data.column,
      status: data.status,
      order: data.order,
      task: updated,
    });

    if (data.status !== task.status) {
      const completed = data.status === 'done';
      await this.notifyTaskParticipants(
        updated,
        user,
        completed ? 'task_completed' : 'task_status_changed',
        completed
          ? `${user.name} completed "${updated.title}"`
          : `${user.name} moved "${updated.title}" to ${data.status.replace(/_/g, ' ')}`,
        { from: task.status, to: data.status },
      );
    }

    return updated;
  }

  async delete(id: string, user: UserDocument): Promise<void> {
    const task = await this.taskModel.findById(id).exec();
    if (!task) throw new NotFoundException('Task not found');

    const canDelete =
      user.role === 'super_admin' ||
      user.role === 'admin' ||
      (this.isAssignedTo(task, user) && (await this.hasPermission(user, 'delete_own_tasks')));
    if (!canDelete) throw new ForbiddenException('Cannot delete this task');

    await this.taskModel.deleteOne({ _id: id });
    this.appGateway.emitToProject(task.project.toString(), 'task-deleted', { taskId: id });
  }

  async addSubtask(taskId: string, title: string, user: UserDocument): Promise<TaskDocument> {
    const existingTask = await this.taskModel.findById(taskId).exec();
    if (!existingTask) throw new NotFoundException('Task not found');
    if (!(await this.canManageTaskDetails(user, existingTask))) {
      throw new ForbiddenException('Cannot edit this task');
    }

    const subtask = { id: uuidv4(), title, done: false };
    const task = await this.taskModel
      .findByIdAndUpdate(taskId, { $push: { subtasks: subtask } }, { new: true })
      .exec();
    if (!task) throw new NotFoundException('Task not found');
    await this.notifyTaskParticipants(
      task,
      user,
      'task_updated',
      `${user.name} added a subtask to "${task.title}"`,
      { subtaskId: subtask.id },
    );
    return task;
  }

  async toggleSubtask(taskId: string, subtaskId: string, user: UserDocument): Promise<TaskDocument> {
    const task = await this.taskModel.findById(taskId).exec();
    if (!task) throw new NotFoundException('Task not found');
    if (!(await this.canManageTaskDetails(user, task))) {
      throw new ForbiddenException('Cannot edit this task');
    }

    const subtaskIndex = task.subtasks.findIndex((s) => s.id === subtaskId);
    if (subtaskIndex === -1) throw new NotFoundException('Subtask not found');

    task.subtasks[subtaskIndex].done = !task.subtasks[subtaskIndex].done;
    await task.save();
    await this.notifyTaskParticipants(
      task,
      user,
      'task_updated',
      `${user.name} ${task.subtasks[subtaskIndex].done ? 'completed' : 'reopened'} a subtask in "${task.title}"`,
      { subtaskId },
    );
    return task;
  }

  async watch(taskId: string, userId: string): Promise<void> {
    await this.taskModel.updateOne(
      { _id: new Types.ObjectId(taskId) },
      { $addToSet: { watchers: new Types.ObjectId(userId) } },
    );

    const task = await this.taskModel.findById(taskId).exec();
    if (task) {
      await this.notificationsService.create({
        recipient: userId,
        type: 'task_watched',
        message: `You are now watching "${task.title}"`,
        link: `/projects/${task.project}?task=${taskId}`,
        meta: { taskId, projectId: task.project },
      });
    }
  }

  async unwatch(taskId: string, userId: string): Promise<void> {
    await this.taskModel.updateOne(
      { _id: new Types.ObjectId(taskId) },
      { $pull: { watchers: new Types.ObjectId(userId) } },
    );
  }

  async addAttachment(
    taskId: string,
    attachment: { url: string; name: string; size: number },
    user: UserDocument,
  ): Promise<TaskDocument> {
    const existingTask = await this.taskModel.findById(taskId).exec();
    if (!existingTask) throw new NotFoundException('Task not found');
    if (user.role === 'member' && !this.isAssignedTo(existingTask, user)) {
      throw new ForbiddenException('Members can only attach files to assigned tasks');
    }
    if (!(await this.hasPermission(user, 'upload_attachments'))) {
      throw new ForbiddenException('Cannot upload attachments');
    }

    const task = await this.taskModel
      .findByIdAndUpdate(
        taskId,
        {
          $push: {
            attachments: {
              ...attachment,
              uploadedBy: user._id,
              uploadedAt: new Date(),
            },
            activityLog: {
              action: 'attachment_added',
              performedBy: user._id,
              performedAt: new Date(),
              meta: { attachmentName: attachment.name },
            },
          },
        },
        { new: true },
      )
      .populate('assignee', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('activityLog.performedBy', 'name email avatar')
      .exec();
    if (!task) throw new NotFoundException('Task not found');
    this.appGateway.emitToProject(task.project.toString(), 'task-updated', task);
    await this.notifyTaskParticipants(
      task,
      user,
      'attachment_added',
      `${user.name} added an attachment to "${task.title}"`,
      { attachmentName: attachment.name },
    );
    return task;
  }

  async findDueWithin24h(): Promise<TaskDocument[]> {
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
}
