import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
import { RolePermissions, RolePermissionsSchema } from './role-permissions.schema';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: RolePermissions.name, schema: RolePermissionsSchema }]),
    GatewayModule,
  ],
  controllers: [PermissionsController],
  providers: [PermissionsService],
  exports: [PermissionsService, MongooseModule],
})
export class PermissionsModule {}
