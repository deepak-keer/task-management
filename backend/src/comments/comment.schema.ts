import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CommentDocument = Comment & Document;

@Schema({ timestamps: true })
export class Comment {
  @Prop({ required: true })
  text: string;

  @Prop({ type: Types.ObjectId, ref: 'Task', required: true })
  task: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  author: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  mentions: Types.ObjectId[];

  @Prop({
    type: [
      {
        emoji: String,
        users: [{ type: Types.ObjectId, ref: 'User' }],
      },
    ],
    default: [],
  })
  reactions: Array<{ emoji: string; users: Types.ObjectId[] }>;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);
