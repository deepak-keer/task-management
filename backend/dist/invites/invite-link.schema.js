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
exports.InviteLinkSchema = exports.InviteLink = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let InviteLink = class InviteLink {
};
exports.InviteLink = InviteLink;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true }),
    __metadata("design:type", String)
], InviteLink.prototype, "token", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['admin', 'member'], required: true }),
    __metadata("design:type", String)
], InviteLink.prototype, "role", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Project', default: null }),
    __metadata("design:type", Object)
], InviteLink.prototype, "projectId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User', required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], InviteLink.prototype, "createdBy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, default: null }),
    __metadata("design:type", Object)
], InviteLink.prototype, "expiresAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: -1 }),
    __metadata("design:type", Number)
], InviteLink.prototype, "maxUses", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], InviteLink.prototype, "usedCount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['active', 'revoked', 'expired'], default: 'active' }),
    __metadata("design:type", String)
], InviteLink.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [{ type: mongoose_2.Types.ObjectId, ref: 'User' }], default: [] }),
    __metadata("design:type", Array)
], InviteLink.prototype, "usedBy", void 0);
exports.InviteLink = InviteLink = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], InviteLink);
exports.InviteLinkSchema = mongoose_1.SchemaFactory.createForClass(InviteLink);
//# sourceMappingURL=invite-link.schema.js.map