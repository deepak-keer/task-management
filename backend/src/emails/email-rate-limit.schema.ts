import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { EMAIL_NOTIFICATION_TYPES, EmailNotificationType } from './email-types';

export type EmailRateLimitDocument = EmailRateLimit & Document;

@Schema({ timestamps: true })
export class EmailRateLimit {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ enum: EMAIL_NOTIFICATION_TYPES, required: true })
  notificationType: EmailNotificationType;

  @Prop({ required: true })
  lastEmailTime: Date;
}

export const EmailRateLimitSchema = SchemaFactory.createForClass(EmailRateLimit);
EmailRateLimitSchema.index({ userId: 1, notificationType: 1 }, { unique: true });
