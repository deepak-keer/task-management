import { Controller, Get, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PermissionsService } from './permissions.service';
import { RolePermissions } from './role-permissions.schema';
import { UserDocument } from '../users/user.schema';

@Controller('permissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
export class PermissionsController {
  constructor(private permissionsService: PermissionsService) {}

  @Get()
  getAll() {
    return this.permissionsService.getAll();
  }

  @Get('audit-log')
  getAuditLog() {
    return this.permissionsService.getAuditLog();
  }

  @Patch(':role')
  update(
    @Param('role') role: string,
    @Body() body: Partial<RolePermissions['features']>,
    @Request() req: { user: UserDocument },
  ) {
    return this.permissionsService.update(role, body, req.user);
  }
}
