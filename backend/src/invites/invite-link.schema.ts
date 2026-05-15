import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InviteLinkDocument = InviteLink & Document;

@Schema({ timestamps: true })
export class InviteLink {
  @Prop({ required: true, unique: true })
  token: string;

  @Prop({ enum: ['admin', 'member'], required: true })
  role: string;

  @Prop({ type: Types.ObjectId, ref: 'Project', default: null })
  projectId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Date, default: null })
  expiresAt: Date | null;

  @Prop({ default: -1 })
  maxUses: number;

  @Prop({ default: 0 })
  usedCount: number;

  @Prop({ enum: ['active', 'revoked', 'expired'], default: 'active' })
  status: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  usedBy: Types.ObjectId[];
}

export const InviteLinkSchema = SchemaFactory.createForClass(InviteLink);
