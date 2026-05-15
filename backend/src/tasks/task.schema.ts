import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TaskDocument = Task & Document;

@Schema({ timestamps: true })
export class Task {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ required: true })
  status: string;

  @Prop({ enum: ['urgent', 'high', 'medium', 'low'], default: 'medium' })
  priority: string;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true })
  project: Types.ObjectId;

  @Prop({ required: true })
  column: string;

  @Prop({ default: 0 })
  order: number;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  assignee: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Date, default: null })
  dueDate: Date | null;

  @Prop({ type: [String], default: [] })
  labels: string[];

  @Prop({
    type: [{ id: String, title: String, done: { type: Boolean, default: false } }],
    default: [],
  })
  subtasks: Array<{ id: string; title: string; done: boolean }>;

  @Prop({
    type: [
      {
        url: String,
        name: String,
        size: Number,
        uploadedBy: { type: Types.ObjectId, ref: 'User' },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  attachments: Array<{
    url: string;
    name: string;
    size: number;
    uploadedBy: Types.ObjectId;
    uploadedAt: Date;
  }>;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  watchers: Types.ObjectId[];

  @Prop({
    type: [
      {
        action: String,
        performedBy: { type: Types.ObjectId, ref: 'User' },
        performedAt: { type: Date, default: Date.now },
        meta: { type: Object, default: {} },
      },
    ],
    default: [],
  })
  activityLog: Array<{
    action: string;
    performedBy: Types.ObjectId;
    performedAt: Date;
    meta: Record<string, unknown>;
  }>;
}

export const TaskSchema = SchemaFactory.createForClass(Task);
