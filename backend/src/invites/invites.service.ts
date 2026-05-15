import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { InviteLink, InviteLinkDocument } from './invite-link.schema';
import { UserDocument } from '../users/user.schema';

export interface CreateInviteDto {
  role: 'admin' | 'member';
  projectId?: string;
  expiresIn?: number | null;
  maxUses?: number;
}

@Injectable()
export class InvitesService {
  constructor(@InjectModel(InviteLink.name) private inviteModel: Model<InviteLinkDocument>) {}

  async create(dto: CreateInviteDto, creator: UserDocument): Promise<InviteLinkDocument> {
    const token = uuidv4();
    let expiresAt: Date | null = null;

    if (dto.expiresIn) {
      expiresAt = new Date(Date.now() + dto.expiresIn * 1000);
    }

    const invite = await this.inviteModel.create({
      token,
      role: dto.role,
      projectId: dto.projectId ? new Types.ObjectId(dto.projectId) : null,
      createdBy: creator._id,
      expiresAt,
      maxUses: dto.maxUses ?? -1,
    });

    return invite;
  }

  async findAll(user: UserDocument): Promise<InviteLinkDocument[]> {
    const filter = user.role === 'super_admin' ? {} : { createdBy: user._id };
    return this.inviteModel
      .find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async validate(token: string): Promise<{ valid: boolean; role?: string; invite?: unknown }> {
    const invite = await this.inviteModel
      .findOne({ token })
      .populate('createdBy', 'name email')
      .exec();

    if (!invite) return { valid: false };
    if (invite.status === 'revoked') return { valid: false };

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

  async revoke(id: string, user: UserDocument): Promise<void> {
    const invite = await this.inviteModel.findById(id).exec();
    if (!invite) throw new NotFoundException('Invite not found');

    const canRevoke =
      user.role === 'super_admin' || invite.createdBy.toString() === user._id.toString();
    if (!canRevoke) throw new ForbiddenException('Cannot revoke this invite');

    await this.inviteModel.updateOne({ _id: id }, { status: 'revoked' });
  }

  async delete(id: string, user: UserDocument): Promise<void> {
    const invite = await this.inviteModel.findById(id).exec();
    if (!invite) throw new NotFoundException('Invite not found');

    const canDelete =
      user.role === 'super_admin' || invite.createdBy.toString() === user._id.toString();
    if (!canDelete) throw new ForbiddenException('Cannot delete this invite');

    await this.inviteModel.deleteOne({ _id: id });
  }

  async getByToken(token: string): Promise<InviteLinkDocument> {
    const invite = await this.inviteModel.findOne({ token }).exec();
    if (!invite) throw new BadRequestException('not-found');
    return invite;
  }
}
