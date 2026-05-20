import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { EMAIL_NOTIFICATION_TYPES, EmailNotificationType } from './email-types';

export type PendingEmailDocument = PendingEmail & Document & { createdAt: Date; updatedAt: Date };

@Schema({ timestamps: true })
export class PendingEmail {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, lowercase: true, trim: true })
  recipientEmail: string;

  @Prop({ required: true })
  subject: string;

  @Prop({ required: true })
  htmlBody: string;

  @Prop({ enum: EMAIL_NOTIFICATION_TYPES, required: true, index: true })
  notificationType: EmailNotificationType;

  @Prop({ enum: ['pending', 'sent', 'failed'], default: 'pending', index: true })
  status: 'pending' | 'sent' | 'failed';

  @Prop({ type: Date, default: null })
  sentAt: Date | null;

  @Prop({ default: 0 })
  retries: number;

  @Prop({ default: '' })
  errorMessage: string;
}

export const PendingEmailSchema = SchemaFactory.createForClass(PendingEmail);
PendingEmailSchema.index({ status: 1, createdAt: 1 });
PendingEmailSchema.index({ userId: 1, notificationType: 1, status: 1, createdAt: -1 });
