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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = require("bcryptjs");
const user_schema_1 = require("../users/user.schema");
const invite_link_schema_1 = require("../invites/invite-link.schema");
const app_gateway_1 = require("../gateway/app.gateway");
const permissions_service_1 = require("../permissions/permissions.service");
const notifications_service_1 = require("../notifications/notifications.service");
let AuthService = class AuthService {
    constructor(userModel, inviteModel, jwtService, appGateway, permissionsService, notificationsService) {
        this.userModel = userModel;
        this.inviteModel = inviteModel;
        this.jwtService = jwtService;
        this.appGateway = appGateway;
        this.permissionsService = permissionsService;
        this.notificationsService = notificationsService;
    }
    async validateInviteToken(token) {
        const invite = await this.inviteModel
            .findOne({ token })
            .populate('createdBy', 'name email')
            .exec();
        if (!invite)
            throw new common_1.BadRequestException('not-found');
        if (invite.status === 'revoked')
            throw new common_1.BadRequestException('revoked');
        if (invite.status === 'expired')
            throw new common_1.BadRequestException('expired');
        if (invite.expiresAt && invite.expiresAt < new Date()) {
            await this.inviteModel.updateOne({ _id: invite._id }, { status: 'expired' });
            throw new common_1.BadRequestException('expired');
        }
        if (invite.maxUses !== -1 && invite.usedCount >= invite.maxUses) {
            throw new common_1.BadRequestException('maxed');
        }
        return invite;
    }
    async register(dto) {
        const invite = await this.validateInviteToken(dto.token);
        const existing = await this.userModel.findOne({ email: dto.email }).exec();
        if (existing)
            throw new common_1.BadRequestException('Email already registered');
        const hashed = await bcrypt.hash(dto.password, 12);
        const user = await this.userModel.create({
            name: dto.name,
            email: dto.email,
            password: hashed,
            role: invite.role,
            status: 'pending',
            invitedBy: invite.createdBy,
        });
        await this.inviteModel.updateOne({ _id: invite._id }, { $inc: { usedCount: 1 }, $push: { usedBy: user._id } });
        const superAdmins = await this.userModel.find({ role: 'super_admin', status: 'active' });
        for (const admin of superAdmins) {
            this.appGateway.emitToUser(admin._id.toString(), 'user-registered', {
                userId: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                invitedBy: invite.createdBy,
            });
        }
        const invitedByStr = invite.createdBy._id?.toString() ?? invite.createdBy.toString();
        const isAlreadyNotified = superAdmins.some((a) => a._id.toString() === invitedByStr);
        if (!isAlreadyNotified) {
            this.appGateway.emitToUser(invitedByStr, 'user-registered', {
                userId: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            });
        }
        return { message: 'Registration successful. Awaiting admin approval.' };
    }
    async login(dto) {
        const user = await this.userModel.findOne({ email: dto.email }).exec();
        if (!user)
            throw new common_1.UnauthorizedException('Invalid email or password');
        const valid = await bcrypt.compare(dto.password, user.password);
        if (!valid)
            throw new common_1.UnauthorizedException('Invalid email or password');
        if (user.status === 'pending') {
            throw new common_1.ForbiddenException('Your account is pending approval');
        }
        if (user.status === 'rejected') {
            throw new common_1.ForbiddenException('Your account has been rejected');
        }
        if (user.status === 'banned') {
            throw new common_1.ForbiddenException('Your account has been banned');
        }
        await this.userModel.updateOne({ _id: user._id }, { lastActiveAt: new Date() });
        await this.notificationsService.create({
            recipient: user._id.toString(),
            type: 'login',
            message: `New login to your account`,
            link: '/dashboard',
            meta: { userId: user._id },
        });
        const payload = { userId: user._id.toString(), role: user.role, email: user.email };
        const accessToken = this.jwtService.sign(payload);
        const rolePermissions = user.role === 'super_admin' ? null : await this.permissionsService.getForRole(user.role);
        return {
            accessToken,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar,
                theme: user.theme,
                onlineStatus: user.onlineStatus,
                notificationPrefs: user.notificationPrefs,
                status: user.status,
            },
            permissions: rolePermissions ? { [user.role]: rolePermissions.features } : {},
        };
    }
    async getMe(userId) {
        const user = await this.userModel
            .findById(userId)
            .select('-password')
            .exec();
        if (!user)
            throw new common_1.UnauthorizedException('User not found');
        const rolePermissions = user.role === 'super_admin' ? null : await this.permissionsService.getForRole(user.role);
        return {
            user,
            permissions: rolePermissions ? { [user.role]: rolePermissions.features } : {},
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __param(1, (0, mongoose_1.InjectModel)(invite_link_schema_1.InviteLink.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        jwt_1.JwtService,
        app_gateway_1.AppGateway,
        permissions_service_1.PermissionsService,
        notifications_service_1.NotificationsService])
], AuthService);
//# sourceMappingURL=auth.service.js.map