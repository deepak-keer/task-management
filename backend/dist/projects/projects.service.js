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
const uuid_1 = require("uuid");
const project_schema_1 = require("./project.schema");
const task_schema_1 = require("../tasks/task.schema");
const app_gateway_1 = require("../gateway/app.gateway");
const permissions_service_1 = require("../permissions/permissions.service");
const DEFAULT_COLUMNS = [
    { id: 'todo', name: 'To Do', order: 0, color: '#64748b', archived: false },
    { id: 'in_progress', name: 'In Progress', order: 1, color: '#3b82f6', archived: false },
    { id: 'in_review', name: 'In Review', order: 2, color: '#f59e0b', archived: false },
    { id: 'done', name: 'Done', order: 3, color: '#22c55e', archived: false },
];
let ProjectsService = class ProjectsService {
    constructor(projectModel, taskModel, appGateway, permissionsService) {
        this.projectModel = projectModel;
        this.taskModel = taskModel;
        this.appGateway = appGateway;
        this.permissionsService = permissionsService;
    }
    async hasPermission(user, feature) {
        if (user.role === 'super_admin')
            return true;
        const permissions = await this.permissionsService.getForRole(user.role);
        return !!permissions.features[feature];
    }
    async canManageColumns(user) {
        return this.hasPermission(user, 'manage_columns');
    }
    normalizeColumns(columns) {
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
    async ensureColumns(project) {
        const normalized = this.normalizeColumns(project.columns);
        const needsUpdate = !project.columns?.length ||
            JSON.stringify(project.columns.map((column) => ({
                id: column.id,
                name: column.name,
                order: column.order,
                color: column.color,
                archived: !!column.archived,
            }))) !== JSON.stringify(normalized);
        if (!needsUpdate)
            return project;
        const updated = await this.projectModel.findByIdAndUpdate(project._id, { $set: { columns: normalized } }, { new: true }).exec();
        if (!updated)
            throw new common_1.NotFoundException('Project not found');
        await this.taskModel.updateMany({
            project: project._id,
            $or: [{ column: { $exists: false } }, { column: '' }, { column: null }],
        }, [{ $set: { column: { $ifNull: ['$status', 'todo'] } } }]);
        return updated;
    }
    async getProjectForColumnUpdate(id, user) {
        if (!(await this.canManageColumns(user))) {
            throw new common_1.ForbiddenException('Only admins can manage columns');
        }
        const project = await this.projectModel.findById(id).exec();
        if (!project)
            throw new common_1.NotFoundException('Project not found');
        return this.ensureColumns(project);
    }
    async saveColumns(projectId, columns) {
        const normalized = this.normalizeColumns(columns);
        const activeCount = normalized.filter((column) => !column.archived).length;
        if (activeCount < 1) {
            throw new common_1.BadRequestException('Every project must have at least 1 column');
        }
        const names = normalized.map((column) => column.name.trim().toLowerCase());
        const colors = normalized.map((column) => column.color.trim().toLowerCase());
        if (new Set(names).size !== names.length) {
            throw new common_1.BadRequestException('Column names cannot repeat');
        }
        if (new Set(colors).size !== colors.length) {
            throw new common_1.BadRequestException('Column colors cannot repeat');
        }
        const updated = await this.projectModel
            .findByIdAndUpdate(projectId, { $set: { columns: normalized } }, { new: true })
            .populate('owner', 'name email avatar')
            .populate('members', 'name email avatar onlineStatus role')
            .exec();
        if (!updated)
            throw new common_1.NotFoundException('Project not found');
        this.appGateway.emitToProject(projectId, 'project-updated', updated);
        return updated;
    }
    async findAll(user) {
        let filter = {};
        if (user.role !== 'super_admin') {
            if (!(await this.hasPermission(user, 'view_boards'))) {
                return [];
            }
            const canViewAll = await this.hasPermission(user, 'view_all_projects');
            const assignedProjectIds = await this.taskModel.distinct('project', {
                assignee: user._id,
            });
            if (assignedProjectIds.length > 0) {
                await this.projectModel.updateMany({ _id: { $in: assignedProjectIds } }, { $addToSet: { members: user._id } });
            }
            filter = canViewAll
                ? { isArchived: false }
                : {
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
        if (!(await this.hasPermission(user, 'view_boards'))) {
            throw new common_1.ForbiddenException('Cannot view boards');
        }
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
        return this.ensureColumns(project);
    }
    async create(data, user) {
        if (!(await this.hasPermission(user, 'create_projects'))) {
            throw new common_1.ForbiddenException('Cannot create boards');
        }
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
    async addColumn(projectId, data, user) {
        const name = data.name?.trim();
        if (!name)
            throw new common_1.BadRequestException('Column name is required');
        const project = await this.getProjectForColumnUpdate(projectId, user);
        const columns = this.normalizeColumns(project.columns);
        columns.push({
            id: (0, uuid_1.v4)(),
            name,
            color: data.color || '#3b82f6',
            order: columns.length,
            archived: false,
        });
        return this.saveColumns(projectId, columns);
    }
    async updateColumn(projectId, columnId, data, user) {
        const project = await this.getProjectForColumnUpdate(projectId, user);
        const columns = this.normalizeColumns(project.columns);
        const column = columns.find((item) => item.id === columnId);
        if (!column)
            throw new common_1.NotFoundException('Column not found');
        if ('name' in data) {
            const name = data.name?.trim();
            if (!name)
                throw new common_1.BadRequestException('Column name is required');
            column.name = name;
        }
        if (data.color)
            column.color = data.color;
        return this.saveColumns(projectId, columns);
    }
    async deleteColumn(projectId, columnId, user) {
        const project = await this.getProjectForColumnUpdate(projectId, user);
        const columns = this.normalizeColumns(project.columns);
        const column = columns.find((item) => item.id === columnId);
        if (!column)
            throw new common_1.NotFoundException('Column not found');
        const taskCount = await this.taskModel.countDocuments({ project: project._id, column: columnId }).exec();
        if (taskCount > 0)
            throw new common_1.BadRequestException('Move tasks first');
        return this.saveColumns(projectId, columns.filter((item) => item.id !== columnId));
    }
    async archiveColumn(projectId, columnId, user) {
        const project = await this.getProjectForColumnUpdate(projectId, user);
        const columns = this.normalizeColumns(project.columns);
        const column = columns.find((item) => item.id === columnId);
        if (!column)
            throw new common_1.NotFoundException('Column not found');
        const activeCount = columns.filter((item) => !item.archived).length;
        if (!column.archived && activeCount <= 1) {
            throw new common_1.BadRequestException('Every project must have at least 1 column');
        }
        column.archived = true;
        return this.saveColumns(projectId, columns);
    }
    async restoreColumn(projectId, columnId, user) {
        const project = await this.getProjectForColumnUpdate(projectId, user);
        const columns = this.normalizeColumns(project.columns);
        const column = columns.find((item) => item.id === columnId);
        if (!column)
            throw new common_1.NotFoundException('Column not found');
        column.archived = false;
        return this.saveColumns(projectId, columns);
    }
    async reorderColumns(projectId, columnIds, user) {
        if (!Array.isArray(columnIds) || columnIds.length === 0) {
            throw new common_1.BadRequestException('Column order is required');
        }
        const project = await this.getProjectForColumnUpdate(projectId, user);
        const columns = this.normalizeColumns(project.columns);
        const orderMap = new Map(columnIds.map((id, index) => [id, index]));
        const reordered = columns
            .map((column) => ({
            ...column,
            order: orderMap.has(column.id) ? orderMap.get(column.id) : column.order + columnIds.length,
        }))
            .sort((a, b) => a.order - b.order)
            .map((column, index) => ({ ...column, order: index }));
        return this.saveColumns(projectId, reordered);
    }
    async archive(id, user) {
        const project = await this.projectModel.findById(id).exec();
        if (!project)
            throw new common_1.NotFoundException('Project not found');
        if (!(await this.hasPermission(user, 'archive_projects'))) {
            throw new common_1.ForbiddenException('Cannot archive boards');
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
        if (!(await this.hasPermission(user, 'delete_projects'))) {
            throw new common_1.ForbiddenException('Cannot delete boards');
        }
        await this.projectModel.deleteOne({ _id: id });
    }
    async addMember(projectId, userId, requester) {
        if (!(await this.hasPermission(requester, 'manage_board_members'))) {
            throw new common_1.ForbiddenException('Cannot manage board members');
        }
        const project = await this.projectModel.findById(projectId).exec();
        if (!project)
            throw new common_1.NotFoundException('Project not found');
        const isAlreadyMember = project.members.some((memberId) => memberId.toString() === userId);
        if (!isAlreadyMember) {
            await this.projectModel.updateOne({ _id: projectId }, { $addToSet: { members: new mongoose_2.Types.ObjectId(userId) } });
        }
        const updated = await this.findById(projectId, requester);
        this.appGateway.emitToProject(projectId, 'project-updated', updated);
        return updated;
    }
    async removeMember(projectId, userId, requester) {
        if (!(await this.hasPermission(requester, 'manage_board_members'))) {
            throw new common_1.ForbiddenException('Cannot manage board members');
        }
        const project = await this.projectModel.findById(projectId).exec();
        if (!project)
            throw new common_1.NotFoundException('Project not found');
        if (project.owner.toString() === userId) {
            throw new common_1.BadRequestException('Board owner cannot be removed');
        }
        await this.projectModel.updateOne({ _id: projectId }, { $pull: { members: new mongoose_2.Types.ObjectId(userId) } });
        const updated = await this.findById(projectId, requester);
        this.appGateway.emitToProject(projectId, 'project-updated', updated);
        return updated;
    }
};
exports.ProjectsService = ProjectsService;
exports.ProjectsService = ProjectsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(project_schema_1.Project.name)),
    __param(1, (0, mongoose_1.InjectModel)(task_schema_1.Task.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        app_gateway_1.AppGateway,
        permissions_service_1.PermissionsService])
], ProjectsService);
//# sourceMappingURL=projects.service.js.map