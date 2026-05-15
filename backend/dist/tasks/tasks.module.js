"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TasksModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const tasks_controller_1 = require("./tasks.controller");
const tasks_service_1 = require("./tasks.service");
const task_schema_1 = require("./task.schema");
const project_schema_1 = require("../projects/project.schema");
const gateway_module_1 = require("../gateway/gateway.module");
const notifications_module_1 = require("../notifications/notifications.module");
const users_module_1 = require("../users/users.module");
const permissions_module_1 = require("../permissions/permissions.module");
let TasksModule = class TasksModule {
};
exports.TasksModule = TasksModule;
exports.TasksModule = TasksModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: task_schema_1.Task.name, schema: task_schema_1.TaskSchema },
                { name: project_schema_1.Project.name, schema: project_schema_1.ProjectSchema },
            ]),
            gateway_module_1.GatewayModule,
            notifications_module_1.NotificationsModule,
            users_module_1.UsersModule,
            permissions_module_1.PermissionsModule,
        ],
        controllers: [tasks_controller_1.TasksController],
        providers: [tasks_service_1.TasksService],
        exports: [tasks_service_1.TasksService, mongoose_1.MongooseModule],
    })
], TasksModule);
//# sourceMappingURL=tasks.module.js.map