import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ default: '' })
  avatar: string;

  @Prop({ enum: ['super_admin', 'admin', 'member'], default: 'member' })
  role: string;

  @Prop({ enum: ['pending', 'active', 'banned', 'rejected'], default: 'pending' })
  status: string;

  @Prop({ enum: ['light', 'dark'], default: 'light' })
  theme: string;

  @Prop({ enum: ['online', 'away', 'dnd'], default: 'online' })
  onlineStatus: string;

  @Prop({
    type: {
      taskAssigned: { type: Boolean, default: true },
      commentAdded: { type: Boolean, default: true },
      mentioned: { type: Boolean, default: true },
      dueDateReminder: { type: Boolean, default: true },
    },
    default: {},
  })
  notificationPrefs: {
    taskAssigned: boolean;
    commentAdded: boolean;
    mentioned: boolean;
    dueDateReminder: boolean;
  };

  @Prop({
    type: [{ type: { task: Types.ObjectId, viewedAt: Date }, _id: false }],
    default: [],
  })
  recentlyViewed: Array<{ task: Types.ObjectId; viewedAt: Date }>;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  invitedBy: Types.ObjectId | null;

  @Prop({ default: null })
  lastActiveAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
