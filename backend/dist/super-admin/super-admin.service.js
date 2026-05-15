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
exports.SuperAdminService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const user_schema_1 = require("../users/user.schema");
const task_schema_1 = require("../tasks/task.schema");
const project_schema_1 = require("../projects/project.schema");
const notifications_service_1 = require("../notifications/notifications.service");
const app_gateway_1 = require("../gateway/app.gateway");
let SuperAdminService = class SuperAdminService {
    constructor(userModel, taskModel, projectModel, notificationsService, appGateway) {
        this.userModel = userModel;
        this.taskModel = taskModel;
        this.projectModel = projectModel;
        this.notificationsService = notificationsService;
        this.appGateway = appGateway;
    }
    async getAllUsers(query) {
        const filter = {};
        if (query.search) {
            filter['$or'] = [
                { name: { $regex: query.search, $options: 'i' } },
                { email: { $regex: query.search, $options: 'i' } },
            ];
        }
        if (query.role)
            filter['role'] = query.role;
        if (query.status)
            filter['status'] = query.status;
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
    async getPendingApprovals() {
        return this.userModel
            .find({ status: 'pending' })
            .select('-password')
            .populate('invitedBy', 'name email')
            .sort({ createdAt: -1 })
            .exec();
    }
    async approveUser(id, approverId) {
        const user = await this.userModel.findById(id).exec();
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const updated = await this.userModel
            .findByIdAndUpdate(id, { status: 'active' }, { new: true })
            .select('-password')
            .exec();
        if (!updated)
            throw new common_1.NotFoundException('User not found');
        await this.notificationsService.create({
            recipient: id,
            type: 'user_approved',
            message: 'Your account has been approved! Welcome aboard.',
            link: '/dashboard',
        });
        this.appGateway.emitToUser(id, 'user-approved', { userId: id });
        return updated;
    }
    async rejectUser(id, reason) {
        const user = await this.userModel.findById(id).exec();
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const updated = await this.userModel
            .findByIdAndUpdate(id, { status: 'rejected' }, { new: true })
            .select('-password')
            .exec();
        if (!updated)
            throw new common_1.NotFoundException('User not found');
        await this.notificationsService.create({
            recipient: id,
            type: 'user_rejected',
            message: reason || 'Your account registration has been rejected.',
            link: '',
        });
        this.appGateway.emitToUser(id, 'user-rejected', { userId: id });
        return updated;
    }
    async banUser(id) {
        const updated = await this.userModel
            .findByIdAndUpdate(id, { status: 'banned' }, { new: true })
            .select('-password')
            .exec();
        if (!updated)
            throw new common_1.NotFoundException('User not found');
        return updated;
    }
    async unbanUser(id) {
        const updated = await this.userModel
            .findByIdAndUpdate(id, { status: 'active' }, { new: true })
            .select('-password')
            .exec();
        if (!updated)
            throw new common_1.NotFoundException('User not found');
        return updated;
    }
    async deleteUser(id) {
        await this.userModel.deleteOne({ _id: new mongoose_2.Types.ObjectId(id) });
    }
    async getStats() {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        const [totalUsers, usersByRole, totalProjects, activeProjects, archivedProjects, totalTasks, tasksByStatus, tasksByPriority, newUsersThisWeek, activeToday,] = await Promise.all([
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
        ]);
        return {
            users: { total: totalUsers, byRole: usersByRole, newThisWeek: newUsersThisWeek, activeToday },
            projects: { total: totalProjects, active: activeProjects, archived: archivedProjects },
            tasks: { total: totalTasks, byStatus: tasksByStatus, byPriority: tasksByPriority },
        };
    }
    async getAllProjects() {
        return this.projectModel
            .find()
            .populate('owner', 'name email')
            .sort({ createdAt: -1 })
            .exec();
    }
    async archiveProject(id) {
        const updated = await this.projectModel
            .findByIdAndUpdate(id, { isArchived: true }, { new: true })
            .exec();
        if (!updated)
            throw new common_1.NotFoundException('Project not found');
        return updated;
    }
    async deleteProject(id) {
        await this.projectModel.deleteOne({ _id: new mongoose_2.Types.ObjectId(id) });
        await this.taskModel.deleteMany({ project: new mongoose_2.Types.ObjectId(id) });
    }
};
exports.SuperAdminService = SuperAdminService;
exports.SuperAdminService = SuperAdminService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __param(1, (0, mongoose_1.InjectModel)(task_schema_1.Task.name)),
    __param(2, (0, mongoose_1.InjectModel)(project_schema_1.Project.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        notifications_service_1.NotificationsService,
        app_gateway_1.AppGateway])
], SuperAdminService);
//# sourceMappingURL=super-admin.service.js.map