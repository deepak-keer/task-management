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
exports.InvitesService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const uuid_1 = require("uuid");
const invite_link_schema_1 = require("./invite-link.schema");
let InvitesService = class InvitesService {
    constructor(inviteModel) {
        this.inviteModel = inviteModel;
    }
    async create(dto, creator) {
        const token = (0, uuid_1.v4)();
        let expiresAt = null;
        if (dto.expiresIn) {
            expiresAt = new Date(Date.now() + dto.expiresIn * 1000);
        }
        const invite = await this.inviteModel.create({
            token,
            role: dto.role,
            projectId: dto.projectId ? new mongoose_2.Types.ObjectId(dto.projectId) : null,
            createdBy: creator._id,
            expiresAt,
            maxUses: dto.maxUses ?? -1,
        });
        return invite;
    }
    async findAll(user) {
        const filter = user.role === 'super_admin' ? {} : { createdBy: user._id };
        return this.inviteModel
            .find(filter)
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 })
            .exec();
    }
    async validate(token) {
        const invite = await this.inviteModel
            .findOne({ token })
            .populate('createdBy', 'name email')
            .exec();
        if (!invite)
            return { valid: false };
        if (invite.status === 'revoked')
            return { valid: false };
        if (invite.expiresAt && invite.expiresAt < new Date()) {
            await this.inviteModel.updateOne({ _id: invite._id }, { status: 'expired' });
            return { valid: false };
        }
        if (invite.maxUses !== -1 && invite.usedCount >= invite.maxUses) {
            return { valid: false };
        }
        return {
            valid: true,
            role: invite.role,
            invite: {
                _id: invite._id,
                role: invite.role,
                createdBy: invite.createdBy,
                expiresAt: invite.expiresAt,
                maxUses: invite.maxUses,
                usedCount: invite.usedCount,
            },
        };
    }
    async revoke(id, user) {
        const invite = await this.inviteModel.findById(id).exec();
        if (!invite)
            throw new common_1.NotFoundException('Invite not found');
        const canRevoke = user.role === 'super_admin' || invite.createdBy.toString() === user._id.toString();
        if (!canRevoke)
            throw new common_1.ForbiddenException('Cannot revoke this invite');
        await this.inviteModel.updateOne({ _id: id }, { status: 'revoked' });
    }
    async delete(id, user) {
        const invite = await this.inviteModel.findById(id).exec();
        if (!invite)
            throw new common_1.NotFoundException('Invite not found');
        const canDelete = user.role === 'super_admin' || invite.createdBy.toString() === user._id.toString();
        if (!canDelete)
            throw new common_1.ForbiddenException('Cannot delete this invite');
        await this.inviteModel.deleteOne({ _id: id });
    }
    async getByToken(token) {
        const invite = await this.inviteModel.findOne({ token }).exec();
        if (!invite)
            throw new common_1.BadRequestException('not-found');
        return invite;
    }
};
exports.InvitesService = InvitesService;
exports.InvitesService = InvitesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(invite_link_schema_1.InviteLink.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], InvitesService);
//# sourceMappingURL=invites.service.js.map