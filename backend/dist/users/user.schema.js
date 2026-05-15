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
exports.UserSchema = exports.User = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let User = class User {
};
exports.User = User;
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], User.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, lowercase: true, trim: true }),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], User.prototype, "password", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: '' }),
    __metadata("design:type", String)
], User.prototype, "avatar", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['super_admin', 'admin', 'member'], default: 'member' }),
    __metadata("design:type", String)
], User.prototype, "role", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['pending', 'active', 'banned', 'rejected'], default: 'pending' }),
    __metadata("design:type", String)
], User.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['light', 'dark'], default: 'light' }),
    __metadata("design:type", String)
], User.prototype, "theme", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['online', 'away', 'dnd'], default: 'online' }),
    __metadata("design:type", String)
], User.prototype, "onlineStatus", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: {
            taskAssigned: { type: Boolean, default: true },
            commentAdded: { type: Boolean, default: true },
            mentioned: { type: Boolean, default: true },
            dueDateReminder: { type: Boolean, default: true },
        },
        default: {},
    }),
    __metadata("design:type", Object)
], User.prototype, "notificationPrefs", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: [{ type: { task: mongoose_2.Types.ObjectId, viewedAt: Date }, _id: false }],
        default: [],
    }),
    __metadata("design:type", Array)
], User.prototype, "recentlyViewed", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User', default: null }),
    __metadata("design:type", Object)
], User.prototype, "invitedBy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: null }),
    __metadata("design:type", Date)
], User.prototype, "lastActiveAt", void 0);
exports.User = User = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], User);
exports.UserSchema = mongoose_1.SchemaFactory.createForClass(User);
//# sourceMappingURL=user.schema.js.map