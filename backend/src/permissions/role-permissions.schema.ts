import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RolePermissionsDocument = RolePermissions & Document;

@Schema({ timestamps: false })
export class RolePermissions {
  @Prop({ enum: ['admin', 'member'], unique: true, required: true })
  role: string;

  @Prop({
    type: {
      invite_members: { type: Boolean, default: true },
      remove_members: { type: Boolean, default: false },
      view_workspaces: { type: Boolean, default: false },
      manage_workspaces: { type: Boolean, default: false },
      view_boards: { type: Boolean, default: true },
      create_projects: { type: Boolean, default: true },
      delete_projects: { type: Boolean, default: false },
      archive_projects: { type: Boolean, default: false },
      manage_board_members: { type: Boolean, default: false },
      manage_announcements: { type: Boolean, default: false },
      assign_roles: { type: Boolean, default: false },
      view_analytics: { type: Boolean, default: true },
      manage_columns: { type: Boolean, default: true },
      create_tasks: { type: Boolean, default: true },
      delete_own_tasks: { type: Boolean, default: true },
      delete_any_task: { type: Boolean, default: false },
      move_tasks: { type: Boolean, default: true },
      assign_tasks: { type: Boolean, default: true },
      comment_on_tasks: { type: Boolean, default: true },
      view_user_task_overview: { type: Boolean, default: false },
      view_all_projects: { type: Boolean, default: false },
      export_tasks: { type: Boolean, default: false },
      watch_tasks: { type: Boolean, default: true },
      upload_attachments: { type: Boolean, default: true },
    },
    default: {},
  })
  features: {
    invite_members: boolean;
    remove_members: boolean;
    view_workspaces: boolean;
    manage_workspaces: boolean;
    view_boards: boolean;
    create_projects: boolean;
    delete_projects: boolean;
    archive_projects: boolean;
    manage_board_members: boolean;
    manage_announcements: boolean;
    assign_roles: boolean;
    view_analytics: boolean;
    manage_columns: boolean;
    create_tasks: boolean;
    delete_own_tasks: boolean;
    delete_any_task: boolean;
    move_tasks: boolean;
    assign_tasks: boolean;
    comment_on_tasks: boolean;
    view_user_task_overview: boolean;
    view_all_projects: boolean;
    export_tasks: boolean;
    watch_tasks: boolean;
    upload_attachments: boolean;
  };

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  updatedBy: Types.ObjectId | null;

  @Prop({ default: Date.now })
  updatedAt: Date;

  @Prop({
    type: [
      {
        feature: String,
        oldValue: Boolean,
        newValue: Boolean,
        changedBy: { type: Types.ObjectId, ref: 'User' },
        changedAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  auditLog: Array<{
    feature: string;
    oldValue: boolean;
    newValue: boolean;
    changedBy: Types.ObjectId;
    changedAt: Date;
  }>;
}

export const RolePermissionsSchema = SchemaFactory.createForClass(RolePermissions);
