import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document & { createdAt: Date; updatedAt: Date };

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  recipient: Types.ObjectId;

  @Prop({
    enum: [
      'task_assigned',
      'task_completed',
      'task_status_changed',
      'task_updated',
      'comment_added',
      'mentioned',
      'mentioned_in_comment',
      'due_reminder',
      'task_due_tomorrow',
      'task_approved',
      'sprint_deadline',
      'high_priority_assigned',
      'attachment_added',
      'invite_used',
      'login',
      'user_approved',
      'user_rejected',
      'permission_changed',
      'task_watched',
      'announcement',
    ],
    required: true,
  })
  type: string;

  @Prop({ required: true })
  message: string;

  @Prop({ default: false })
  read: boolean;

  @Prop({ default: '' })
  link: string;

  @Prop({ type: Object, default: {} })
  meta: Record<string, unknown>;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
