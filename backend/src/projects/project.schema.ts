import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProjectDocument = Project & Document;

@Schema({ timestamps: true })
export class Project {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  owner: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  members: Types.ObjectId[];

  @Prop({
    type: [
      {
        id: String,
        name: String,
        order: Number,
        color: { type: String, default: '#6366f1' },
      },
    ],
    default: [
      { id: 'todo', name: 'To Do', order: 0, color: '#64748b' },
      { id: 'in_progress', name: 'In Progress', order: 1, color: '#3b82f6' },
      { id: 'in_review', name: 'In Review', order: 2, color: '#f59e0b' },
      { id: 'done', name: 'Done', order: 3, color: '#22c55e' },
    ],
  })
  columns: Array<{ id: string; name: string; order: number; color: string }>;

  @Prop({ default: false })
  isArchived: boolean;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);
