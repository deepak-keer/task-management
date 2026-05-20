import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../users/user.schema';
import { Task, TaskDocument } from '../tasks/task.schema';
import { Project, ProjectDocument } from '../projects/project.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { AppGateway } from '../gateway/app.gateway';

@Injectable()
export class SuperAdminService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    private notificationsService: NotificationsService,
    private appGateway: AppGateway,
  ) {}

  async getAllUsers(query: {
    search?: string;
    role?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const filter: Record<string, unknown> = {};
    if (query.search) {
      filter['$or'] = [
        { name: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
      ];
    }
    if (query.role) filter['role'] = query.role;
    if (query.status) filter['status'] = query.status;

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select('-password')
        .populate('invitedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(filter),
    ]);

    return { users, total, page, limit };
  }

  async getPendingApprovals(): Promise<UserDocument[]> {
    return this.userModel
      .find({ status: 'pending' })
      .select('-password')
      .populate('invitedBy', 'name email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async approveUser(id: string, approverId: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.userModel
      .findByIdAndUpdate(id, { status: 'active' }, { new: true })
      .select('-password')
      .exec();
    if (!updated) throw new NotFoundException('User not found');

    await this.notificationsService.create({
      recipient: id,
      type: 'user_approved',
      message: 'Your account has been approved! Welcome aboard.',
      link: '/dashboard',
    });

    this.appGateway.emitToUser(id, 'user-approved', { userId: id });
    return updated;
  }

  async rejectUser(id: string, reason?: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.userModel
      .findByIdAndUpdate(id, { status: 'rejected' }, { new: true })
      .select('-password')
      .exec();
    if (!updated) throw new NotFoundException('User not found');

    await this.notificationsService.create({
      recipient: id,
      type: 'user_rejected',
      message: reason || 'Your account registration has been rejected.',
      link: '',
    });

    this.appGateway.emitToUser(id, 'user-rejected', { userId: id });
    return updated;
  }

  async banUser(id: string): Promise<UserDocument> {
    const updated = await this.userModel
      .findByIdAndUpdate(id, { status: 'banned' }, { new: true })
      .select('-password')
      .exec();
    if (!updated) throw new NotFoundException('User not found');
    this.appGateway.forceLogoutUser(id, 'user-banned', { userId: id });
    return updated;
  }

  async unbanUser(id: string): Promise<UserDocument> {
    const updated = await this.userModel
      .findByIdAndUpdate(id, { status: 'active' }, { new: true })
      .select('-password')
      .exec();
    if (!updated) throw new NotFoundException('User not found');
    return updated;
  }

  async deleteUser(id: string): Promise<void> {
    await this.userModel.deleteOne({ _id: new Types.ObjectId(id) });
  }

  async getStats() {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      usersByRole,
      totalProjects,
      activeProjects,
      archivedProjects,
      totalTasks,
      tasksByStatus,
      tasksByPriority,
      newUsersThisWeek,
      activeToday,
      projectsForStatusLabels,
    ] = await Promise.all([
      this.userModel.countDocuments(),
      this.userModel.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      this.projectModel.countDocuments(),
      this.projectModel.countDocuments({ isArchived: false }),
      this.projectModel.countDocuments({ isArchived: true }),
      this.taskModel.countDocuments(),
      this.taskModel.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      this.taskModel.aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }]),
      this.userModel.countDocuments({ createdAt: { $gte: weekAgo } }),
      this.userModel.countDocuments({ lastActiveAt: { $gte: today } }),
      this.projectModel.find().select('columns').lean().exec(),
    ]);

    const statusLabelMap = new Map<string, string>();
    for (const project of projectsForStatusLabels) {
      for (const column of project.columns || []) {
        if (column?.id && column?.name && !statusLabelMap.has(column.id)) {
          statusLabelMap.set(column.id, column.name);
        }
      }
    }

    const formatStatusLabel = (status: string | null | undefined) => {
      if (!status) return 'Unknown';
      return statusLabelMap.get(status) || status.replace(/[_-]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
    };

    const formattedTasksByStatus = tasksByStatus.map((item) => ({
      _id: item._id,
      name: formatStatusLabel(item._id),
      count: item.count,
    }));

    return {
      users: { total: totalUsers, byRole: usersByRole, newThisWeek: newUsersThisWeek, activeToday },
      projects: { total: totalProjects, active: activeProjects, archived: archivedProjects },
      tasks: { total: totalTasks, byStatus: formattedTasksByStatus, byPriority: tasksByPriority },
    };
  }

  async getAllProjects(): Promise<ProjectDocument[]> {
    return this.projectModel
      .find()
      .populate('owner', 'name email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async archiveProject(id: string): Promise<ProjectDocument> {
    const updated = await this.projectModel
      .findByIdAndUpdate(id, { isArchived: true }, { new: true })
      .exec();
    if (!updated) throw new NotFoundException('Project not found');
    return updated;
  }

  async restoreProject(id: string): Promise<ProjectDocument> {
    const updated = await this.projectModel
      .findByIdAndUpdate(id, { isArchived: false }, { new: true })
      .exec();
    if (!updated) throw new NotFoundException('Project not found');
    return updated;
  }

  async deleteProject(id: string): Promise<void> {
    await this.projectModel.deleteOne({ _id: new Types.ObjectId(id) });
    await this.taskModel.deleteMany({ project: new Types.ObjectId(id) });
  }
}
