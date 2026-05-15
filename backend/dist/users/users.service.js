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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const bcrypt = require("bcryptjs");
const user_schema_1 = require("./user.schema");
let UsersService = class UsersService {
    constructor(userModel) {
        this.userModel = userModel;
    }
    async findAll() {
        return this.userModel.find().select('-password').sort({ createdAt: -1 }).exec();
    }
    async findById(id) {
        const user = await this.userModel.findById(id).select('-password').exec();
        if (!user)
            throw new common_1.NotFoundException('User not found');
        return user;
    }
    async update(id, requesterId, data) {
        if (id !== requesterId)
            throw new common_1.ForbiddenException('Cannot update other users');
        delete data['password'];
        delete data['role'];
        delete data['status'];
        const user = await this.userModel
            .findByIdAndUpdate(id, { $set: data }, { new: true })
            .select('-password')
            .exec();
        if (!user)
            throw new common_1.NotFoundException('User not found');
        return user;
    }
    async changePassword(id, requesterId, oldPassword, newPassword) {
        if (id !== requesterId)
            throw new common_1.ForbiddenException('Cannot update other users');
        const user = await this.userModel.findById(id).exec();
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const valid = await bcrypt.compare(oldPassword, user.password);
        if (!valid)
            throw new common_1.ForbiddenException('Old password is incorrect');
        const hashed = await bcrypt.hash(newPassword, 12);
        await this.userModel.updateOne({ _id: id }, { password: hashed });
    }
    async getRecentlyViewed(userId) {
        const user = await this.userModel
            .findById(userId)
            .populate({
            path: 'recentlyViewed.task',
            select: 'title priority status project',
            populate: { path: 'project', select: 'name' },
        })
            .exec();
        return user?.recentlyViewed || [];
    }
    async addRecentlyViewed(userId, taskId) {
        const user = await this.userModel.findById(userId).exec();
        if (!user)
            return;
        const filtered = user.recentlyViewed.filter((rv) => rv.task.toString() !== taskId);
        filtered.unshift({ task: new mongoose_2.Types.ObjectId(taskId), viewedAt: new Date() });
        const trimmed = filtered.slice(0, 10);
        await this.userModel.updateOne({ _id: userId }, { recentlyViewed: trimmed });
    }
    async getMyStats(userId) {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return {
            userId,
            period: '7d',
            weekStart: weekAgo,
            weekEnd: now,
        };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], UsersService);
//# sourceMappingURL=users.service.js.map