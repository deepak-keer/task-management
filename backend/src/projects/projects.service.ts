import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Project, ProjectDocument } from './project.schema';
import { Task, TaskDocument } from '../tasks/task.schema';
import { UserDocument } from '../users/user.schema';
import { AppGateway } from '../gateway/app.gateway';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    private appGateway: AppGateway,
  ) {}

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

    return project;
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
