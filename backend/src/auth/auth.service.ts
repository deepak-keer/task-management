import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from '../users/user.schema';
import { InviteLink, InviteLinkDocument } from '../invites/invite-link.schema';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { AppGateway } from '../gateway/app.gateway';
import { PermissionsService } from '../permissions/permissions.service';
import { RolePermissions } from '../permissions/role-permissions.schema';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(InviteLink.name) private inviteModel: Model<InviteLinkDocument>,
    private jwtService: JwtService,
    private appGateway: AppGateway,
    private permissionsService: PermissionsService,
    private notificationsService: NotificationsService,
  ) {}

  async validateInviteToken(token: string): Promise<InviteLinkDocument> {
    const invite = await this.inviteModel
      .findOne({ token })
      .populate('createdBy', 'name email')
      .exec();

    if (!invite) throw new BadRequestException('not-found');
    if (invite.status === 'revoked') throw new BadRequestException('revoked');
    if (invite.status === 'expired') throw new BadRequestException('expired');

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      await this.inviteModel.updateOne({ _id: invite._id }, { status: 'expired' });
      throw new BadRequestException('expired');
    }

    if (invite.maxUses !== -1 && invite.usedCount >= invite.maxUses) {
      throw new BadRequestException('maxed');
    }

    return invite;
  }

  async register(dto: RegisterDto): Promise<{ message: string }> {
    const invite = await this.validateInviteToken(dto.token);

    const existing = await this.userModel.findOne({ email: dto.email }).exec();
    if (existing) throw new BadRequestException('Email already registered');

    const hashed = await bcrypt.hash(dto.password, 12);

    const user = await this.userModel.create({
      name: dto.name,
      email: dto.email,
      password: hashed,
      role: invite.role,
      status: 'pending',
      invitedBy: invite.createdBy,
    });

    // Update invite usage
    await this.inviteModel.updateOne(
      { _id: invite._id },
      { $inc: { usedCount: 1 }, $push: { usedBy: user._id } },
    );

    // Notify super admins via WebSocket
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

    // Also notify the invite creator if not super admin
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

  async login(
    dto: LoginDto,
  ): Promise<{
    accessToken: string;
    user: Record<string, unknown>;
    permissions: Record<string, RolePermissions['features']>;
  }> {
    const user = await this.userModel.findOne({ email: dto.email }).exec();

    if (!user) throw new UnauthorizedException('Invalid email or password');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid email or password');

    if (user.status === 'pending') {
      throw new ForbiddenException('Your account is pending approval');
    }
    if (user.status === 'rejected') {
      throw new ForbiddenException('Your account has been rejected');
    }
    if (user.status === 'banned') {
      throw new ForbiddenException('Your account has been banned');
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
    const rolePermissions =
      user.role === 'super_admin' ? null : await this.permissionsService.getForRole(user.role);

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

  async getMe(
    userId: string,
  ): Promise<{ user: UserDocument; permissions: Record<string, RolePermissions['features']> }> {
    const user = await this.userModel
      .findById(userId)
      .select('-password')
      .exec();
    if (!user) throw new UnauthorizedException('User not found');

    const rolePermissions =
      user.role === 'super_admin' ? null : await this.permissionsService.getForRole(user.role);

    return {
      user,
      permissions: rolePermissions ? { [user.role]: rolePermissions.features } : {},
    };
  }
}
