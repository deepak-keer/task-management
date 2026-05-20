"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RolePermissionsSchema = exports.RolePermissions = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let RolePermissions = class RolePermissions {
};
exports.RolePermissions = RolePermissions;
__decorate([
    (0, mongoose_1.Prop)({ enum: ['admin', 'member'], unique: true, required: true }),
    __metadata("design:type", String)
], RolePermissions.prototype, "role", void 0);
__decorate([
    (0, mongoose_1.Prop)({
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
            view_all_projects: { type: Boolean, default: false },
            export_tasks: { type: Boolean, default: false },
            watch_tasks: { type: Boolean, default: true },
            upload_attachments: { type: Boolean, default: true },
        },
        default: {},
    }),
    __metadata("design:type", Object)
], RolePermissions.prototype, "features", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User', default: null }),
    __metadata("design:type", Object)
], RolePermissions.prototype, "updatedBy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", Date)
], RolePermissions.prototype, "updatedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: [
            {
                feature: String,
                oldValue: Boolean,
                newValue: Boolean,
                changedBy: { type: mongoose_2.Types.ObjectId, ref: 'User' },
                changedAt: { type: Date, default: Date.now },
            },
        ],
        default: [],
    }),
    __metadata("design:type", Array)
], RolePermissions.prototype, "auditLog", void 0);
exports.RolePermissions = RolePermissions = __decorate([
    (0, mongoose_1.Schema)({ timestamps: false })
], RolePermissions);
exports.RolePermissionsSchema = mongoose_1.SchemaFactory.createForClass(RolePermissions);
//# sourceMappingURL=role-permissions.schema.js.map