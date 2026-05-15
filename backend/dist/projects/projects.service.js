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
exports.ProjectsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const project_schema_1 = require("./project.schema");
const task_schema_1 = require("../tasks/task.schema");
const app_gateway_1 = require("../gateway/app.gateway");
let ProjectsService = class ProjectsService {
    constructor(projectModel, taskModel, appGateway) {
        this.projectModel = projectModel;
        this.taskModel = taskModel;
        this.appGateway = appGateway;
    }
    async findAll(user) {
        let filter = {};
        if (user.role !== 'super_admin') {
            const assignedProjectIds = await this.taskModel.distinct('project', {
                assignee: user._id,
            });
            if (assignedProjectIds.length > 0) {
                await this.projectModel.updateMany({ _id: { $in: assignedProjectIds } }, { $addToSet: { members: user._id } });
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
    async findById(id, user) {
        const project = await this.projectModel
            .findById(id)
            .populate('owner', 'name email avatar')
            .populate('members', 'name email avatar onlineStatus role')
            .exec();
        if (!project)
            throw new common_1.NotFoundException('Project not found');
        const isMember = project.members.some((m) => m._id.toString() === user._id.toString());
        const hasAssignedTask = !isMember &&
            user.role !== 'super_admin' &&
            !!(await this.taskModel.exists({
                project: new mongoose_2.Types.ObjectId(id),
                assignee: user._id,
            }));
        if (hasAssignedTask) {
            await this.projectModel.updateOne({ _id: new mongoose_2.Types.ObjectId(id) }, { $addToSet: { members: user._id } });
        }
        if (user.role !== 'super_admin' && !isMember && !hasAssignedTask) {
            throw new common_1.ForbiddenException('Not a member of this project');
        }
        return project;
    }
    async create(data, user) {
        const project = await this.projectModel.create({
            name: data.name,
            description: data.description || '',
            owner: user._id,
            members: [user._id],
        });
        return project.populate('owner', 'name email avatar');
    }
    async update(id, data, user) {
        const project = await this.projectModel.findById(id).exec();
        if (!project)
            throw new common_1.NotFoundException('Project not found');
        const updated = await this.projectModel
            .findByIdAndUpdate(id, { $set: data }, { new: true })
            .populate('owner', 'name email avatar')
            .populate('members', 'name email avatar onlineStatus')
            .exec();
        if (!updated)
            throw new common_1.NotFoundException('Project not found');
        this.appGateway.emitToProject(id, 'project-updated', updated);
        return updated;
    }
    async archive(id, user) {
        const project = await this.projectModel.findById(id).exec();
        if (!project)
            throw new common_1.NotFoundException('Project not found');
        if (project.owner.toString() !== user._id.toString() && user.role !== 'super_admin') {
            throw new common_1.ForbiddenException('Only the project owner can archive');
        }
        const updated = await this.projectModel
            .findByIdAndUpdate(id, { isArchived: true }, { new: true })
            .exec();
        if (!updated)
            throw new common_1.NotFoundException('Project not found');
        return updated;
    }
    async delete(id, user) {
        const project = await this.projectModel.findById(id).exec();
        if (!project)
            throw new common_1.NotFoundException('Project not found');
        if (project.owner.toString() !== user._id.toString() && user.role !== 'super_admin') {
            throw new common_1.ForbiddenException('Only the project owner can delete');
        }
        await this.projectModel.deleteOne({ _id: id });
    }
    async addMember(projectId, userId, requester) {
        const project = await this.projectModel.findById(projectId).exec();
        if (!project)
            throw new common_1.NotFoundException('Project not found');
        if (!project.members.includes(new mongoose_2.Types.ObjectId(userId))) {
            await this.projectModel.updateOne({ _id: projectId }, { $addToSet: { members: new mongoose_2.Types.ObjectId(userId) } });
        }
        return this.findById(projectId, requester);
    }
    async removeMember(projectId, userId, requester) {
        const project = await this.projectModel.findById(projectId).exec();
        if (!project)
            throw new common_1.NotFoundException('Project not found');
        await this.projectModel.updateOne({ _id: projectId }, { $pull: { members: new mongoose_2.Types.ObjectId(userId) } });
        return this.findById(projectId, requester);
    }
};
exports.ProjectsService = ProjectsService;
exports.ProjectsService = ProjectsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(project_schema_1.Project.name)),
    __param(1, (0, mongoose_1.InjectModel)(task_schema_1.Task.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        app_gateway_1.AppGateway])
], ProjectsService);
//# sourceMappingURL=projects.service.js.map