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
exports.PermissionsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const role_permissions_schema_1 = require("./role-permissions.schema");
const app_gateway_1 = require("../gateway/app.gateway");
let PermissionsService = class PermissionsService {
    constructor(permModel, appGateway) {
        this.permModel = permModel;
        this.appGateway = appGateway;
        this.cache = new Map();
    }
    async seedDefaults() {
        const roles = ['admin', 'member'];
        for (const role of roles) {
            const existing = await this.permModel.findOne({ role }).exec();
            if (!existing) {
                await this.permModel.create({ role });
            }
        }
    }
    async getAll() {
        const perms = await this.permModel.find().exec();
        const result = {};
        for (const p of perms) {
            result[p.role] = p;
        }
        return result;
    }
    async getForRole(role) {
        if (this.cache.has(role))
            return this.cache.get(role);
        const perm = await this.permModel.findOne({ role }).exec();
        if (!perm) {
            const created = await this.permModel.create({ role });
            this.cache.set(role, created);
            return created;
        }
        this.cache.set(role, perm);
        return perm;
    }
    async update(role, features, updatedBy) {
        const perm = await this.permModel.findOne({ role }).exec();
        if (!perm)
            throw new common_1.NotFoundException('Role permissions not found');
        const auditEntries = Object.entries(features).map(([feature, newValue]) => ({
            feature,
            oldValue: perm.features[feature],
            newValue: newValue,
            changedBy: new mongoose_2.Types.ObjectId(updatedBy._id.toString()),
            changedAt: new Date(),
        }));
        const setData = { updatedBy: updatedBy._id, updatedAt: new Date() };
        for (const [feature, value] of Object.entries(features)) {
            setData[`features.${feature}`] = value;
        }
        const updated = await this.permModel
            .findOneAndUpdate({ role }, { $set: setData, $push: { auditLog: { $each: auditEntries } } }, { new: true })
            .exec();
        if (!updated)
            throw new common_1.NotFoundException('Role permissions not found');
        this.cache.delete(role);
        this.appGateway.emitToAll('permissions-updated', {
            role,
            features: updated.features,
        });
        return updated;
    }
    async getAuditLog() {
        const perms = await this.permModel.find().populate('auditLog.changedBy', 'name email').exec();
        const logs = [];
        for (const p of perms) {
            for (const entry of p.auditLog) {
                const maybeDocument = entry;
                const logEntry = typeof maybeDocument.toObject === 'function' ? maybeDocument.toObject() : entry;
                logs.push({ ...logEntry, role: p.role });
            }
        }
        return logs.sort((a, b) => new Date(b.changedAt).getTime() -
            new Date(a.changedAt).getTime());
    }
    invalidateCache(role) {
        this.cache.delete(role);
    }
};
exports.PermissionsService = PermissionsService;
exports.PermissionsService = PermissionsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(role_permissions_schema_1.RolePermissions.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        app_gateway_1.AppGateway])
], PermissionsService);
//# sourceMappingURL=permissions.service.js.map