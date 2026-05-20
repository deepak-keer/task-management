import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { EMAIL_NOTIFICATION_TYPES, EmailNotificationType } from './email-types';

export type NotificationPreferenceDocument = NotificationPreference & Document;

@Schema({ timestamps: true })
export class NotificationPreference {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ enum: EMAIL_NOTIFICATION_TYPES, required: true })
  notificationType: EmailNotificationType;

  @Prop({ default: true })
  emailEnabled: boolean;

  @Prop({ default: true })
  inAppEnabled: boolean;
}

export const NotificationPreferenceSchema = SchemaFactory.createForClass(NotificationPreference);
NotificationPreferenceSchema.index({ userId: 1, notificationType: 1 }, { unique: true });
