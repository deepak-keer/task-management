import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AnnouncementDocument = Announcement & Document & { createdAt: Date; updatedAt: Date };

@Schema({ timestamps: true })
export class Announcement {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, trim: true })
  body: string;

  @Prop({ enum: ['info', 'success', 'warning', 'alert'], default: 'info' })
  tone: string;

  @Prop({ default: false })
  pinned: boolean;

  @Prop({ enum: ['all', 'role', 'users'], default: 'all' })
  targetType: string;

  @Prop({ type: String, enum: ['super_admin', 'admin', 'member', null], default: null })
  targetRole: string | null;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  recipients: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;
}

export const AnnouncementSchema = SchemaFactory.createForClass(Announcement);
AnnouncementSchema.index({ pinned: -1, createdAt: -1 });
AnnouncementSchema.index({ targetType: 1, targetRole: 1, createdAt: -1 });
AnnouncementSchema.index({ recipients: 1, createdAt: -1 });
