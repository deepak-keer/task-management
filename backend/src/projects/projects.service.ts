import { BadRequestException, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Project, ProjectDocument } from './project.schema';
import { Task, TaskDocument } from '../tasks/task.schema';
import { UserDocument } from '../users/user.schema';
import { AppGateway } from '../gateway/app.gateway';

const DEFAULT_COLUMNS = [
  { id: 'todo', name: 'To Do', order: 0, color: '#64748b', archived: false },
  { id: 'in_progress', name: 'In Progress', order: 1, color: '#3b82f6', archived: false },
  { id: 'in_review', name: 'In Review', order: 2, color: '#f59e0b', archived: false },
  { id: 'done', name: 'Done', order: 3, color: '#22c55e', archived: false },
];

type ProjectColumn = { id: string; name: string; order: number; color: string; archived?: boolean };

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    private appGateway: AppGateway,
  ) {}

  private canManageColumns(user: UserDocument): boolean {
    return user.role === 'super_admin';
  }

  private normalizeColumns(columns?: ProjectColumn[]): ProjectColumn[] {
    const source = columns && columns.length > 0 ? columns : DEFAULT_COLUMNS;
    return source
      .map((column, index) => ({
        id: column.id,
        name: column.name,
        order: typeof column.order === 'number' ? column.order : index,
        color: column.color || '#6366f1',
        archived: !!column.archived,
      }))
      .sort((a, b) => a.order - b.order)
      .map((column, index) => ({ ...column, order: index }));
  }

  private async ensureColumns(project: ProjectDocument): Promise<ProjectDocument> {
    const normalized = this.normalizeColumns(project.columns as ProjectColumn[] | undefined);
    const needsUpdate =
      !project.columns?.length ||
      JSON.stringify(project.columns.map((column) => ({
        id: column.id,
        name: column.name,
        order: column.order,
        color: column.color,
        archived: !!column.archived,
      }))) !== JSON.stringify(normalized);

    if (!needsUpdate) return project;

    const updated = await this.projectModel.findByIdAndUpdate(
      project._id,
      { $set: { columns: normalized } },
      { new: true },
    ).exec();

    if (!updated) throw new NotFoundException('Project not found');

    await this.taskModel.updateMany(
      {
        project: project._id,
        $or: [{ column: { $exists: false } }, { column: '' }, { column: null }],
      },
      [{ $set: { column: { $ifNull: ['$status', 'todo'] } } }],
    );

    return updated;
  }

  private async getProjectForColumnUpdate(id: string, user: UserDocument): Promise<ProjectDocument> {
    if (!this.canManageColumns(user)) {
      throw new ForbiddenException('Only admins can manage columns');
    }

    const project = await this.projectModel.findById(id).exec();
    if (!project) throw new NotFoundException('Project not found');
    return this.ensureColumns(project);
  }

  private async saveColumns(projectId: string, columns: ProjectColumn[]): Promise<ProjectDocument> {
    const normalized = this.normalizeColumns(columns);
    const activeCount = normalized.filter((column) => !column.archived).length;
    if (activeCount < 1) {
      throw new BadRequestException('Every project must have at least 1 column');
    }

    const names = normalized.map((column) => column.name.trim().toLowerCase());
    const colors = normalized.map((column) => column.color.trim().toLowerCase());
    if (new Set(names).size !== names.length) {
      throw new BadRequestException('Column names cannot repeat');
    }
    if (new Set(colors).size !== colors.length) {
      throw new BadRequestException('Column colors cannot repeat');
    }

    const updated = await this.projectModel
      .findByIdAndUpdate(projectId, { $set: { columns: normalized } }, { new: true })
      .populate('owner', 'name email avatar')
      .populate('members', 'name email avatar onlineStatus role')
      .exec();

    if (!updated) throw new NotFoundException('Project not found');

    this.appGateway.emitToProject(projectId, 'project-updated', updated);
    return updated;
  }

  async findAll(user: UserDocument): Promise<ProjectDocument[]> {
    let filter: Record<string, unknown> = {};

    if (user.role !== 'super_admin') {
      const assignedProjectIds = await this.taskModel.distinct('project', {
        assignee: user._id,
      });

      if (assignedProjectIds.length > 0) {
        await this.projectModel.updateMany(
          { _id: { $in: assignedProjectIds } },
          { $addToSet: { members: user._id } },
        );
      }

      filter = {
        isArchived: false,
        $or: [
          { members: user._id },
          { _id: { $in: assignedProjectIds } },
        ],
      };
    }

    return this.projectModel
      .find(filter)
      .populate('owner', 'name email avatar')
      .populate('members', 'name email avatar onlineStatus')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findById(id: string, user: UserDocument): Promise<ProjectDocument> {
    const project = await this.projectModel
      .findById(id)
      .populate('owner', 'name email avatar')
      .populate('members', 'name email avatar onlineStatus role')
      .exec();

    if (!project) throw new NotFoundException('Project not found');

    const isMember = project.members.some(
      (m: unknown) =>
        (m as { _id: { toString(): string } })._id.toString() === user._id.toString(),
    );
    const hasAssignedTask =
      !isMember &&
      user.role !== 'super_admin' &&
      !!(await this.taskModel.exists({
        project: new Types.ObjectId(id),
        assignee: user._id,
      }));

    if (hasAssignedTask) {
      await this.projectModel.updateOne(
        { _id: new Types.ObjectId(id) },
        { $addToSet: { members: user._id } },
      );
    }

    if (user.role !== 'super_admin' && !isMember && !hasAssignedTask) {
      throw new ForbiddenException('Not a member of this project');
    }

    return this.ensureColumns(project);
  }

  async create(
    data: { name: string; description?: string },
    user: UserDocument,
  ): Promise<ProjectDocument> {
    const project = await this.projectModel.create({
      name: data.name,
      description: data.description || '',
      owner: user._id,
      members: [user._id],
    });

    return project.populate('owner', 'name email avatar');
  }

  async update(
    id: string,
    data: Partial<{ name: string; description: string; columns: unknown[] }>,
    user: UserDocument,
  ): Promise<ProjectDocument> {
    const project = await this.projectModel.findById(id).exec();
    if (!project) throw new NotFoundException('Project not found');

    const updated = await this.projectModel
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .populate('owner', 'name email avatar')
      .populate('members', 'name email avatar onlineStatus')
      .exec();

    if (!updated) throw new NotFoundException('Project not found');

    this.appGateway.emitToProject(id, 'project-updated', updated);
    return updated;
  }

  async addColumn(
    projectId: string,
    data: { name: string; color?: string },
    user: UserDocument,
  ): Promise<ProjectDocument> {
    const name = data.name?.trim();
    if (!name) throw new BadRequestException('Column name is required');

    const project = await this.getProjectForColumnUpdate(projectId, user);
    const columns = this.normalizeColumns(project.columns as ProjectColumn[]);
    columns.push({
      id: uuidv4(),
      name,
      color: data.color || '#3b82f6',
      order: columns.length,
      archived: false,
    });

    return this.saveColumns(projectId, columns);
  }

  async updateColumn(
    projectId: string,
    columnId: string,
    data: { name?: string; color?: string },
    user: UserDocument,
  ): Promise<ProjectDocument> {
    const project = await this.getProjectForColumnUpdate(projectId, user);
    const columns = this.normalizeColumns(project.columns as ProjectColumn[]);
    const column = columns.find((item) => item.id === columnId);
    if (!column) throw new NotFoundException('Column not found');

    if ('name' in data) {
      const name = data.name?.trim();
      if (!name) throw new BadRequestException('Column name is required');
      column.name = name;
    }
    if (data.color) column.color = data.color;

    return this.saveColumns(projectId, columns);
  }

  async deleteColumn(projectId: string, columnId: string, user: UserDocument): Promise<ProjectDocument> {
    const project = await this.getProjectForColumnUpdate(projectId, user);
    const columns = this.normalizeColumns(project.columns as ProjectColumn[]);
    const column = columns.find((item) => item.id === columnId);
    if (!column) throw new NotFoundException('Column not found');

    const taskCount = await this.taskModel.countDocuments({ project: project._id, column: columnId }).exec();
    if (taskCount > 0) throw new BadRequestException('Move tasks first');

    return this.saveColumns(projectId, columns.filter((item) => item.id !== columnId));
  }

  async archiveColumn(projectId: string, columnId: string, user: UserDocument): Promise<ProjectDocument> {
    const project = await this.getProjectForColumnUpdate(projectId, user);
    const columns = this.normalizeColumns(project.columns as ProjectColumn[]);
    const column = columns.find((item) => item.id === columnId);
    if (!column) throw new NotFoundException('Column not found');

    const activeCount = columns.filter((item) => !item.archived).length;
    if (!column.archived && activeCount <= 1) {
      throw new BadRequestException('Every project must have at least 1 column');
    }

    column.archived = true;
    return this.saveColumns(projectId, columns);
  }

  async restoreColumn(projectId: string, columnId: string, user: UserDocument): Promise<ProjectDocument> {
    const project = await this.getProjectForColumnUpdate(projectId, user);
    const columns = this.normalizeColumns(project.columns as ProjectColumn[]);
    const column = columns.find((item) => item.id === columnId);
    if (!column) throw new NotFoundException('Column not found');

    column.archived = false;
    return this.saveColumns(projectId, columns);
  }

  async reorderColumns(projectId: string, columnIds: string[], user: UserDocument): Promise<ProjectDocument> {
    if (!Array.isArray(columnIds) || columnIds.length === 0) {
      throw new BadRequestException('Column order is required');
    }

    const project = await this.getProjectForColumnUpdate(projectId, user);
    const columns = this.normalizeColumns(project.columns as ProjectColumn[]);
    const orderMap = new Map(columnIds.map((id, index) => [id, index]));

    const reordered = columns
      .map((column) => ({
        ...column,
        order: orderMap.has(column.id) ? orderMap.get(column.id)! : column.order + columnIds.length,
      }))
      .sort((a, b) => a.order - b.order)
      .map((column, index) => ({ ...column, order: index }));

    return this.saveColumns(projectId, reordered);
  }

  async archive(id: string, user: UserDocument): Promise<ProjectDocument> {
    const project = await this.projectModel.findById(id).exec();
    if (!project) throw new NotFoundException('Project not found');

    if (project.owner.toString() !== user._id.toString() && user.role !== 'super_admin') {
      throw new ForbiddenException('Only the project owner can archive');
    }

    const updated = await this.projectModel
      .findByIdAndUpdate(id, { isArchived: true }, { new: true })
      .exec();
    if (!updated) throw new NotFoundException('Project not found');
    return updated;
  }

  async delete(id: string, user: UserDocument): Promise<void> {
    const project = await this.projectModel.findById(id).exec();
    if (!project) throw new NotFoundException('Project not found');

    if (project.owner.toString() !== user._id.toString() && user.role !== 'super_admin') {
      throw new ForbiddenException('Only the project owner can delete');
    }

    await this.projectModel.deleteOne({ _id: id });
  }

  async addMember(projectId: string, userId: string, requester: UserDocument): Promise<ProjectDocument> {
    const project = await this.projectModel.findById(projectId).exec();
    if (!project) throw new NotFoundException('Project not found');

    if (!project.members.includes(new Types.ObjectId(userId))) {
      await this.projectModel.updateOne(
        { _id: projectId },
        { $addToSet: { members: new Types.ObjectId(userId) } },
      );
    }

    return this.findById(projectId, requester);
  }

  async removeMember(projectId: string, userId: string, requester: UserDocument): Promise<ProjectDocument> {
    const project = await this.projectModel.findById(projectId).exec();
    if (!project) throw new NotFoundException('Project not found');

    await this.projectModel.updateOne(
      { _id: projectId },
      { $pull: { members: new Types.ObjectId(userId) } },
    );

    return this.findById(projectId, requester);
  }
}
